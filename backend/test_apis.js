const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token = '';
let studentId = '';
let classId = '';

async function testAPIs() {
  console.log("=== Testing Backend APIs ===");
  try {
    // 1. Authentication (Mock signup/login since DB is empty)
    // We need to seed an Admin user first. Let's run seed.js or directly insert.
    // console.log("Seeding database to create Admin...");
    // const { execSync } = require('child_process');
    // execSync('node prisma/seed.js');
    // console.log("SUCCESS: Seeded Admin user");

    // Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@college.edu',
      password: 'admin123'
    });
    token = loginRes.data.token;
    console.log("SUCCESS: Admin Login, JWT generated:", token.substring(0, 15) + "...");

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Academic: Create Class and Subject
    const ts = Date.now();
    const classRes = await axios.post(`${API_URL}/academic/classes`, {
      name: `B.Tech CSE - AI & ML ${ts}`,
      semester: 8
    }, { headers });
    classId = classRes.data.id;
    console.log("SUCCESS: Created Class:", classRes.data.name);

    const subjectRes = await axios.post(`${API_URL}/academic/subjects`, {
      name: `Computer Vision ${ts}`,
      code: `CS801-${ts}`,
      classId: classId
    }, { headers });
    console.log("SUCCESS: Created Subject:", subjectRes.data.name);

    // 3. Student: Create and Retrieve
    const studentRes = await axios.post(`${API_URL}/students`, {
      email: `student${ts}@college.edu`,
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      rollNumber: `AI2026-${ts}`
    }, { headers });
    studentId = studentRes.data.id;
    console.log("SUCCESS: Created Student:", studentRes.data.user.firstName);

    const getStudent = await axios.get(`${API_URL}/students`, { headers });
    if (getStudent.data.length > 0) {
      console.log("SUCCESS: Retrieved Students list. Count:", getStudent.data.length);
    }

    // 4. Faculty: Create and Retrieve
    const facultyRes = await axios.post(`${API_URL}/faculty`, {
      email: `faculty${ts}@college.edu`,
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Smith',
      department: 'CSE'
    }, { headers });
    console.log("SUCCESS: Created Faculty:", facultyRes.data.user.firstName);

    const getFaculty = await axios.get(`${API_URL}/faculty`, { headers });
    if (getFaculty.data.length > 0) {
      console.log("SUCCESS: Retrieved Faculty list. Count:", getFaculty.data.length);
    }

    // 5. Enrollment (Start and Retrieve)
    const startEnrollRes = await axios.post(`${API_URL}/enrollment/${studentId}/start`, {
      action: 'ENROLL'
    }, { headers });
    console.log("SUCCESS: Started Enrollment for student. Response:", startEnrollRes.data.message);

    const getEnrollRes = await axios.get(`${API_URL}/enrollment/${studentId}`, { headers });
    console.log("SUCCESS: Retrieved Enrollment status. isEnrolled:", getEnrollRes.data.isEnrolled);

    console.log("\nALL BACKEND API TESTS PASSED SUCCESSFULLY.");
  } catch (error) {
    console.error("ERROR in API test:");
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

testAPIs();
