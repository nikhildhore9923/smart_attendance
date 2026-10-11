const fs = require('fs');
const axios = require('axios');
const AIService = require('./src/services/aiService');
const { recognizeStudentFromImage } = require('./src/services/recognitionService');

const MOCK_LIVE_IMAGE = 'C:\\smart_attendance\\dataset\\Nikhil_Dhore_31\\Nikhil_Dhore_31_1.jpg';
const MOCK_SPOOF_IMAGE = 'C:\\smart_attendance\\dataset\\Nikhil_Dhore_31\\Nikhil_Dhore_31_1.jpg'; // We don't have a spoof image, reusing for syntax test
const NO_FACE_IMAGE = 'C:\\smart_attendance\\dataset\\Nikhil_Dhore_31\\Nikhil_Dhore_31_1.jpg'; // Just placeholder paths

async function runTests() {
  console.log("=== Liveness Integration Test Suite ===");

  const b64 = fs.readFileSync(MOCK_LIVE_IMAGE, 'base64');
  
  // Test Liveness Endpoint Availability
  console.log("\n[0] Checking Liveness Model Status");
  const livenessCheck = await AIService.checkLiveness(b64);
  console.log(`Available: ${livenessCheck.available}, Status: ${livenessCheck.status}`);
  
  if (!livenessCheck.available) {
    console.log("⚠️ Anti-Spoofing model is NOT available.");
    console.log("⚠️ Tests requiring liveness classification will be simulated using mocks to prove pipeline logic.\n");
  }

  // Inject a mock to test pipeline if unavailable
  const originalCheck = AIService.checkLiveness;

  // 1 & 2 & 5 & 6. MOCK TESTS FOR PIPELINE
  console.log("[1 & 5] Genuine/Live Image + Known Person");
  AIService.checkLiveness = async () => ({ available: true, is_live: true, score: 0.95 });
  let result = await recognizeStudentFromImage(b64);
  if (result.recognized) {
    console.log(`✅ Pipeline allowed genuine face. Recognized: ${result.student.firstName}`);
  } else {
    console.log(`❌ Failed: ${result.error}`);
  }

  console.log("\n[2 & 6] Spoof Image + Known Person");
  AIService.checkLiveness = async () => ({ available: true, is_live: false, score: 0.12 });
  result = await recognizeStudentFromImage(b64);
  if (!result.recognized && result.error.includes("Spoofing detected")) {
    console.log(`✅ Pipeline properly REJECTED spoof attack. Error: ${result.error}`);
  } else {
    console.log(`❌ Failed: Pipeline did not reject spoof. Status: ${result.recognized}`);
  }

  // Restore original
  AIService.checkLiveness = originalCheck;

  // 3. No-Face Image
  // For this we can just mock detectFaces
  const originalDetect = AIService.detectFaces;
  console.log("\n[3] No-Face Image");
  AIService.detectFaces = async () => ({ status: 'NO_FACE' });
  result = await recognizeStudentFromImage(b64);
  if (!result.recognized && result.error.includes("No face detected")) {
    console.log(`✅ Pipeline rejected empty frame.`);
  } else {
    console.log(`❌ Failed.`);
  }
  AIService.detectFaces = originalDetect;

  // 4. Unknown Person
  // We can mock getEmbedding to return an embedding that won't match anyone (e.g. all 0s)
  const originalEmbed = AIService.getEmbedding;
  console.log("\n[4] Unknown Person (Live)");
  AIService.getEmbedding = async () => ({ status: 'SUCCESS', embedding: new Array(512).fill(0) });
  result = await recognizeStudentFromImage(b64);
  if (!result.recognized) {
    console.log(`✅ Pipeline rejected unknown person.`);
  } else {
    console.log(`❌ Failed. Person was recognized.`);
  }
  AIService.getEmbedding = originalEmbed;

  console.log("\n🎉 TEST SUITE COMPLETED.");
}

runTests();
