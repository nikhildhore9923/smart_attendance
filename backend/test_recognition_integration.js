const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:5000/api';
// We need to use images that have a face and can generate embeddings to test the full pipeline.
// Note: NUAA faces might not match enrolled students. If they don't match, they'll fail at identity matching (which means liveness passed!).
// If they fail at liveness, they'll fail with "Spoofing detected".
const LIVE_IMG_PATH = 'D:\\NUAA-Liveness\\Detectedface\\ClientFace\\0001\\0001_00_00_01_0.jpg';
const SPOOF_IMG_PATH = 'D:\\NUAA-Liveness\\Detectedface\\ImposterFace\\0001\\0001_00_00_01_0.jpg';

async function main() {
    console.log("=== TASKS 8.9 & 8.10: RECOGNITION PIPELINE BLOCKS SPOOFS ===");
    
    // Login to get token
    let token = '';
    try {
        const adminRes = await axios.post(`${API_URL}/auth/login`, { email: 'admin@college.edu', password: 'admin123' });
        token = adminRes.data.token;
    } catch (e) {
        console.error("Failed to login", e.message);
        process.exit(1);
    }
    const headers = { Authorization: `Bearer ${token}` };

    // Get an active session or create one to use for recognition test
    let sessionId = '';
    try {
        const subRes = await axios.get(`${API_URL}/academic/subjects`, { headers });
        const subjectId = subRes.data[0].id;
        
        // Start a session
        const sessRes = await axios.post(`${API_URL}/attendance/sessions`, { subjectId }, { headers });
        sessionId = sessRes.data.id;
    } catch (e) {
        console.error("Failed to start session", e.message);
        process.exit(1);
    }

    const liveB64 = fs.readFileSync(LIVE_IMG_PATH, 'base64');
    const spoofB64 = fs.readFileSync(SPOOF_IMG_PATH, 'base64');

    console.log("\n[1] Testing SPOOF Image");
    try {
        const recRes = await axios.post(`${API_URL}/attendance/sessions/${sessionId}/recognize`, { image: spoofB64 }, { headers });
        console.log("Spoof Result:", recRes.data);
    } catch (e) {
        if (e.response && e.response.data.error) {
            console.log("Spoof Result:", e.response.data.error);
            if (e.response.data.error.includes("Spoofing detected")) {
                console.log("✅ Pipeline successfully BLOCKED spoof prediction.");
            } else {
                console.log("❌ Pipeline failed for other reason.");
            }
        } else {
            console.log("Error:", e.message);
        }
    }

    console.log("\n[2] Testing LIVE Image");
    try {
        const recRes = await axios.post(`${API_URL}/attendance/sessions/${sessionId}/recognize`, { image: liveB64 }, { headers });
        console.log("Live Result:", recRes.data);
        if (recRes.data.recognized === false && recRes.data.message === "Unknown Face") {
            console.log("✅ Pipeline ALLOWED live prediction to continue toward recognition (failed at Identity Match as expected since this NUAA face isn't enrolled).");
        } else if (recRes.data.recognized) {
            console.log("✅ Pipeline ALLOWED live prediction and recognized someone.");
        } else {
            console.log("❌ Unexpected live result.");
        }
    } catch (e) {
        if (e.response && e.response.data.error) {
            console.log("Live Result:", e.response.data.error);
            if (e.response.data.error.includes("Spoofing detected")) {
                console.log("❌ Model incorrectly classified the live image as spoof (FRR), but pipeline logic works.");
            } else {
                console.log("✅ Pipeline ALLOWED live prediction to continue (failed somewhere else like Quality).");
            }
        } else {
            console.log("Error:", e.message);
        }
    }
}

main();
