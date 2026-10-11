const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000/api';
let TOKEN = '';

async function login() {
  const res = await axios.post(`${BASE_URL}/auth/login`, { email: 'admin@college.edu', password: 'admin123' });
  TOKEN = res.data.token;
  axios.defaults.headers.common['Authorization'] = `Bearer ${TOKEN}`;
}

async function runTests() {
  try {
    await login();
    console.log('[PASS] Login successful');

    // 1. Academic Data Relationships
    const hierarchyReq = await axios.get(`${BASE_URL}/academic/hierarchy`);
    if (hierarchyReq.data && Array.isArray(hierarchyReq.data)) {
       console.log('[PASS] Academic hierarchy retrieved successfully');
    } else {
       throw new Error('Invalid hierarchy payload');
    }

    // 2. We need a live session to test attendance logic.
    // Fetch a subject to start session
    const subjReq = await axios.get(`${BASE_URL}/academic/subjects`);
    if (!subjReq.data.length) {
       console.log('[WARN] No subjects found, cannot test live attendance routes');
       return;
    }
    const subjectId = subjReq.data[0].id;

    let sessionReq;
    try {
        sessionReq = await axios.post(`${BASE_URL}/attendance/sessions`, { subjectId });
    } catch(e) {
        if(e.response && e.response.data.error.includes("active session exists")) {
            const activeSessionReq = await axios.get(`${BASE_URL}/attendance/sessions/active?subjectId=${subjectId}`);
            sessionReq = activeSessionReq;
        } else {
            throw e;
        }
    }
    const sessionId = sessionReq.data.id;
    console.log(`[INFO] Started/Resumed Session: ${sessionId}`);

    // Mock API requests for Attendance since we don't have real base64 face crops
    // We will just verify that the backend rejects empty/invalid images gracefully instead of crashing
    
    // Test 1: Invalid Image (Liveness failure / Spoofing)
    try {
        await axios.post(`${BASE_URL}/attendance/sessions/${sessionId}/recognize`, {
            image: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
            multiFace: true
        });
        console.log('[FAIL] Invalid image should have failed');
    } catch (e) {
        if (e.response && e.response.status === 400) {
            console.log('[PASS] Invalid image appropriately rejected with 400:', e.response.data.error);
        } else {
            console.log('[FAIL] Unexpected error for invalid image:', e.message);
        }
    }

    // End session
    await axios.post(`${BASE_URL}/attendance/sessions/${sessionId}/end`);
    console.log('[PASS] Session ended cleanly');

  } catch (err) {
    console.error('[FATAL]', err.response ? err.response.data : err.message);
  }
}

runTests();
