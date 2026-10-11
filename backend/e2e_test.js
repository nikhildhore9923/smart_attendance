const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api'; // Node API port

async function setupTestData() {
  console.log('--- Fetching Existing Test Data ---');
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const subject = await prisma.subject.findFirst();
  const student = await prisma.student.findFirst();
  
  if (!admin || !subject || !student) {
    throw new Error('Database is missing required test data.');
  }

  // Ensure Admin is linked to a Faculty so they can start sessions
  let faculty = await prisma.faculty.findUnique({ where: { id: admin.id } });
  if (!faculty) {
    faculty = await prisma.faculty.create({
      data: {
        id: admin.id,
        department: 'CS'
      }
    });
  }

  return { adminEmail: admin.email, password: 'password123', subjectId: subject.id, studentId: student.id };
}

async function runTest() {
  try {
    const data = await setupTestData();
    
    console.log('--- Logging In ---');
    let res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.adminEmail, password: data.password })
    });
    const { token } = await res.json();
    if (!token) throw new Error('Login failed');
    console.log('Token acquired!');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('\n--- Enrolling Student ---');
    const liveImgPath = 'D:\\NUAA-Liveness\\Detectedface\\ClientFace\\0001\\0001_00_00_01_0.jpg';
    const liveImgB64 = fs.readFileSync(liveImgPath, { encoding: 'base64' });
    
    // Start enrollment
    res = await fetch(`${API_URL}/enrollment/${data.studentId}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'RE_ENROLL' })
    });
    let startRes = await res.json();
    console.log('Enrollment Start:', startRes);

    for (let i = 1; i <= 5; i++) {
        res = await fetch(`${API_URL}/enrollment/${data.studentId}/samples`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ image: liveImgB64 })
        });
        console.log(`Sample ${i}:`, await res.json());
    }

    console.log('\n--- Starting Session ---');
    res = await fetch(`${API_URL}/attendance/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ subjectId: data.subjectId })
    });
    const session = await res.json();
    console.log('Session started:', session.id);

    console.log('\n--- CASE A: Known Live Person (Needs 3 confirms) ---');
    for (let i = 1; i <= 3; i++) {
      res = await fetch(`${API_URL}/attendance/sessions/${session.id}/recognize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: liveImgB64 })
      });
      console.log(`Hit ${i}:`, await res.json());
    }

    console.log('\n--- CASE D: Duplicate Attendance Check ---');
    res = await fetch(`${API_URL}/attendance/sessions/${session.id}/recognize`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ image: liveImgB64 })
    });
    console.log('Duplicate Hit:', await res.json());

    console.log('\n--- CASE B: NUAA Spoof Image ---');
    const spoofImgPath = 'D:\\NUAA-Liveness\\Detectedface\\ImposterFace\\0001\\0001_00_00_01_0.jpg';
    const spoofImgB64 = fs.readFileSync(spoofImgPath, { encoding: 'base64' });
    res = await fetch(`${API_URL}/attendance/sessions/${session.id}/recognize`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ image: spoofImgB64 })
    });
    console.log('Spoof Hit:', await res.json());

    console.log('\n--- CASE C: Unknown Live Person ---');
    const unknownImgPath = 'D:\\NUAA-Liveness\\Detectedface\\ClientFace\\0002\\0002_01_00_01_100.jpg';
    const unknownImgB64 = fs.readFileSync(unknownImgPath, { encoding: 'base64' });
    res = await fetch(`${API_URL}/attendance/sessions/${session.id}/recognize`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ image: unknownImgB64 })
    });
    console.log('Unknown Hit:', await res.json());

    console.log('\n--- CASE E: Invalid Image ---');
    res = await fetch(`${API_URL}/attendance/sessions/${session.id}/recognize`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ image: 'invalid_data_!!!' })
    });
    console.log('Invalid Hit:', await res.json());

    console.log('\n--- Ending Session ---');
    res = await fetch(`${API_URL}/attendance/sessions/${session.id}/end`, {
      method: 'POST',
      headers
    });
    console.log('Session Ended:', (await res.json()).status);

    console.log('\n--- CASE F: Inactive/Ended Session ---');
    res = await fetch(`${API_URL}/attendance/sessions/${session.id}/recognize`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ image: liveImgB64 })
    });
    console.log('Inactive Hit:', await res.json());

    console.log('\n--- Checking Analytics / DB directly ---');
    const records = await prisma.attendanceRecord.findMany({ where: { sessionId: session.id } });
    console.log('Records in DB for session:', records.length);
    if(records.length > 0) {
      console.log('First record status:', records[0].status, 'Method:', records[0].method);
    }
    
    console.log('\n--- Checking Dashboard Stats API ---');
    res = await fetch(`${API_URL}/attendance/dashboard`, { headers });
    console.log('Dashboard Stats:', await res.json());

  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
