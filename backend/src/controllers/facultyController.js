const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

/**
 * Get all faculty members with user info, allocated subjects, and session counts.
 */
const getFaculty = async (req, res) => {
  try {
    const faculty = await prisma.faculty.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
        },
        subjects: {
          include: {
            classes: true,
            academicSem: {
              include: {
                program: true,
                academicYear: true,
              },
            },
          },
        },
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });
    res.json(faculty);
  } catch (error) {
    console.error('getFaculty error:', error);
    res.status(500).json({ error: 'Failed to fetch faculty list' });
  }
};

/**
 * Create a new faculty member with credentials and optional subject allocation.
 */
const createFaculty = async (req, res) => {
  const { email, password, firstName, lastName, department, subjectIds } = req.body;
  
  if (!email || !password || !firstName || !lastName || !department) {
    return res.status(400).json({ error: 'All credential fields (email, password, first name, last name, department) are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email address already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const faculty = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          role: 'FACULTY',
          firstName,
          lastName,
        },
      });

      const subjectsConnect = Array.isArray(subjectIds) && subjectIds.length > 0
        ? { connect: subjectIds.map(id => ({ id })) }
        : undefined;

      return tx.faculty.create({
        data: {
          id: user.id,
          department,
          subjects: subjectsConnect,
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
          },
          subjects: {
            include: { classes: true },
          },
        },
      });
    });

    res.status(201).json({
      message: 'Faculty created successfully',
      faculty,
      credentials: {
        email,
        temporaryPassword: password,
      },
    });
  } catch (error) {
    console.error('createFaculty error:', error);
    res.status(500).json({ error: 'Failed to create faculty member' });
  }
};

/**
 * Update faculty details, credentials (optional password update), and allocated subjects.
 */
const updateFaculty = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, department, password, subjectIds } = req.body;

  try {
    const existingFaculty = await prisma.faculty.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingFaculty) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }

    const userUpdateData = {};
    if (firstName) userUpdateData.firstName = firstName;
    if (lastName) userUpdateData.lastName = lastName;
    if (email && email !== existingFaculty.user.email) {
      const emailInUse = await prisma.user.findUnique({ where: { email } });
      if (emailInUse) {
        return res.status(400).json({ error: 'Email is already in use by another account' });
      }
      userUpdateData.email = email;
    }
    if (password && password.trim().length >= 6) {
      userUpdateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const facultyUpdateData = {};
    if (department) facultyUpdateData.department = department;
    if (Array.isArray(subjectIds)) {
      facultyUpdateData.subjects = {
        set: subjectIds.map(subId => ({ id: subId })),
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: existingFaculty.user.id },
          data: userUpdateData,
        });
      }

      return tx.faculty.update({
        where: { id },
        data: facultyUpdateData,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
          },
          subjects: {
            include: { classes: true },
          },
        },
      });
    });

    res.json({
      message: 'Faculty updated successfully',
      faculty: updated,
    });
  } catch (error) {
    console.error('updateFaculty error:', error);
    res.status(500).json({ error: 'Failed to update faculty member' });
  }
};

/**
 * Allocate courses/subjects to a faculty member.
 */
const allocateSubjects = async (req, res) => {
  const { id } = req.params;
  const { subjectIds } = req.body;

  if (!Array.isArray(subjectIds)) {
    return res.status(400).json({ error: 'subjectIds must be an array of subject IDs' });
  }

  try {
    const faculty = await prisma.faculty.findUnique({ where: { id } });
    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    const updated = await prisma.faculty.update({
      where: { id },
      data: {
        subjects: {
          set: subjectIds.map(subId => ({ id: subId })),
        },
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        subjects: {
          include: {
            classes: true,
            academicSem: { include: { program: true, academicYear: true } },
          },
        },
      },
    });

    res.json({
      message: 'Courses allocated successfully',
      faculty: updated,
    });
  } catch (error) {
    console.error('allocateSubjects error:', error);
    res.status(500).json({ error: 'Failed to allocate courses' });
  }
};

/**
 * Delete a faculty member.
 */
const deleteFaculty = async (req, res) => {
  const { id } = req.params;

  try {
    const faculty = await prisma.faculty.findUnique({
      where: { id },
      include: { sessions: true },
    });

    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    // Check if faculty has conducted attendance sessions
    if (faculty.sessions.length > 0) {
      return res.status(400).json({
        error: `Cannot delete faculty member with ${faculty.sessions.length} recorded attendance sessions. You can remove all course allocations instead to revoke access.`,
      });
    }

    await prisma.$transaction(async (tx) => {
      // Disconnect subjects
      await tx.faculty.update({
        where: { id },
        data: { subjects: { set: [] } },
      });
      await tx.faculty.delete({ where: { id } });
      await tx.user.delete({ where: { id } });
    });

    res.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    console.error('deleteFaculty error:', error);
    res.status(500).json({ error: 'Failed to delete faculty member' });
  }
};

/**
 * Get courses/subjects assigned to the logged-in faculty member.
 */
const getMySubjects = async (req, res) => {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { id: req.user.id },
      include: {
        subjects: {
          where: { isActive: true },
          include: {
            classes: true,
            academicSem: {
              include: {
                program: true,
                academicYear: true,
              },
            },
          },
        },
      },
    });

    if (!faculty) {
      // If admin, return all active subjects
      if (req.user.role === 'ADMIN') {
        const allSubjects = await prisma.subject.findMany({
          where: { isActive: true },
          include: {
            classes: true,
            academicSem: {
              include: {
                program: true,
                academicYear: true,
              },
            },
          },
        });
        return res.json(allSubjects);
      }
      return res.status(404).json({ error: 'Faculty profile not found' });
    }

    res.json(faculty.subjects);
  } catch (error) {
    console.error('getMySubjects error:', error);
    res.status(500).json({ error: 'Failed to fetch assigned courses' });
  }
};

module.exports = {
  getFaculty,
  createFaculty,
  updateFaculty,
  allocateSubjects,
  deleteFaculty,
  getMySubjects,
};
