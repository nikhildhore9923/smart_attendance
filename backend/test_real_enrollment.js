const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';
let token = '';

async function testRealEnrollment() {
  console.log("=== Testing Real Face Enrollment Flow ===");
  try {
    // 1. Admin Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@college.edu',
      password: 'admin123'
    });
    token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    // 2. Create a test student
    const ts = Date.now();
    const studentRes = await axios.post(`${API_URL}/students`, {
      email: `realstudent${ts}@college.edu`,
      password: 'password123',
      firstName: 'Real',
      lastName: 'Face',
      rollNumber: `REAL-${ts}`
    }, { headers });
    const studentId = studentRes.data.id;
    console.log("SUCCESS: Created Student for Enrollment:", studentId);

    // 3. Start Enrollment
    await axios.post(`${API_URL}/enrollment/${studentId}/start`, { action: 'ENROLL' }, { headers });
    console.log("SUCCESS: Enrollment started.");

    // 4. Load real image
    const imagePath = 'C:\\smart_attendance\\dataset\\Nikhil_Dhore_31\\Nikhil_Dhore_31_1.jpg';
    if (!fs.existsSync(imagePath)) {
      throw new Error("Test image not found");
    }
    const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });

    // 5. Submit frame
    console.log("Sending real image to /samples endpoint...");
    const sampleRes = await axios.post(`${API_URL}/enrollment/${studentId}/samples`, {
      image: base64Image
    }, { headers });
    
    console.log("SUCCESS: Sample response:", sampleRes.data.message);
    console.log("Progress:", sampleRes.data.progress);

    // 6. Verify in DB
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const embeddings = await prisma.faceEmbedding.findMany({
      where: { studentId: studentId }
    });
    
    if (embeddings.length === 1) {
      const e = embeddings[0];
      console.log(`\nVERIFIED IN MYSQL:`);
      console.log(`- Model: ${e.modelName}`);
      console.log(`- Dimension: ${e.dimension}`);
      console.log(`- Quality Score: ${e.qualityScore}`);
      console.log(`- Embedding array length (JSON): ${e.embedding.length}`);
      
      if (e.embedding.length === 512) {
        console.log("\nALL VERIFICATIONS PASSED: 512-D ArcFace embedding successfully stored in MySQL.");
      } else {
        console.error("FAIL: Embedding array length is not 512! It is:", e.embedding.length);
      }
    } else {
      console.error("FAIL: Embedding not saved to DB.");
    }
    await prisma.$disconnect();
    
  } catch (error) {
    console.error("ERROR in Enrollment test:");
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

testRealEnrollment();
