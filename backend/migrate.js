const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function migrate() {
  console.log("Starting legacy data migration...");
  // 1. Map Subject.classId to the new implicit many-to-many relation
  const subjects = await prisma.subject.findMany({ where: { classId: { not: null } } });
  let count = 0;
  for (const sub of subjects) {
    if (sub.classId) {
      await prisma.subject.update({
        where: { id: sub.id },
        data: { classes: { connect: { id: sub.classId } } }
      });
      count++;
    }
  }
  console.log(`Migrated ${count} subjects to many-to-many classes link.`);
  
  // 2. Create a default Academic Year and Program for existing classes to avoid breaking UI
  if (count > 0) {
     const ay = await prisma.academicYear.upsert({
        where: { name: "2026-2027" },
        update: {},
        create: { name: "2026-2027", startDate: new Date("2026-07-01"), endDate: new Date("2027-06-30") }
     });
     const prog = await prisma.program.upsert({
        where: { name: "Default Program" },
        update: {},
        create: { name: "Default Program" }
     });
     
     // Link existing classes to a default semester if they don't have one
     const classes = await prisma.class.findMany({ where: { semesterId: null } });
     for (const cls of classes) {
        const sem = await prisma.semester.upsert({
           where: { academicYearId_programId_number: { academicYearId: ay.id, programId: prog.id, number: cls.semester } },
           update: {},
           create: { academicYearId: ay.id, programId: prog.id, number: cls.semester }
        });
        await prisma.class.update({
           where: { id: cls.id },
           data: { semesterId: sem.id }
        });
        
        // Update subjects linked to this class to also belong to this semester
        const clsSubjects = await prisma.subject.findMany({ where: { classId: cls.id } });
        for (const csub of clsSubjects) {
           await prisma.subject.update({
              where: { id: csub.id },
              data: { semesterId: sem.id }
           });
        }
     }
     console.log("Migrated existing classes/subjects to default Academic Year and Program.");
  }
}
migrate().catch(console.error).finally(() => prisma.$disconnect());
