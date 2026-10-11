const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:5000/api';
let token = '';

const GENUINE_IMAGE = 'C:\\smart_attendance\\dataset\\Nikhil_Dhore_31\\Nikhil_Dhore_31_1.jpg'; // Matches the dataset used for 'Comp Test' or real camera test
const DIFFERENT_IMAGE = 'C:\\smart_attendance\\dataset\\Nikhil_Dhore_31\\Nikhil_Dhore_31_2.jpg'; // Same person, different image
const IMPOSTOR_IMAGE = 'C:\\smart_attendance\\dataset\\shubham_kharbad_49\\shubham_kharbad_49_1.jpg';

async function testRecognition() {
  console.log("=== FACE RECOGNITION BACKEND TEST ===");
  try {
    // 1. Admin Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@college.edu',
      password: 'admin123'
    });
    token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    // Function to test an image
    async function checkFace(imagePath, description) {
      console.log(`\nTesting: ${description}`);
      if (!fs.existsSync(imagePath)) {
        console.error(`File not found: ${imagePath}`);
        return;
      }
      const b64 = fs.readFileSync(imagePath, 'base64');
      try {
        const res = await axios.post(`${API_URL}/recognition/recognize`, { image: b64 }, { headers });
        console.log(`Result: ${res.data.recognized ? 'RECOGNIZED ✓' : 'UNKNOWN ❌'}`);
        console.log(`Student: ${res.data.student ? res.data.student.firstName + ' ' + res.data.student.lastName : 'None'}`);
        console.log(`Similarity: ${res.data.similarity}`);
        console.log(`Message: ${res.data.message}`);
      } catch (err) {
        console.error(`Error:`, err.response ? err.response.data : err.message);
      }
    }

    // 2. Run tests
    await checkFace(GENUINE_IMAGE, "Genuine Enrolled Face (Nikhil 1)");
    await checkFace(DIFFERENT_IMAGE, "Different Image of Same Student (Nikhil 2)");
    await checkFace(IMPOSTOR_IMAGE, "Impostor Face (Shreyas 1)");

    console.log("\nTesting No Face Image (Sending random bytes)...");
    try {
      const randomB64 = Buffer.from('this is not an image').toString('base64');
      const res = await axios.post(`${API_URL}/recognition/recognize`, { image: randomB64 }, { headers });
      console.log(`Result:`, res.data);
    } catch (err) {
      console.log(`Successfully caught error for invalid image:`, err.response ? err.response.data : err.message);
    }

  } catch (error) {
    console.error("Setup Error:", error.message);
  }
}

testRecognition();
