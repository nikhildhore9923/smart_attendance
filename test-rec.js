const { recognizeStudentFromImage } = require('./backend/src/services/recognitionService');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const imagePath = 'dataset/Nikhil_Dhore_31/Nikhil_Dhore_31_1.jpg';
    const base64Image = 'data:image/jpeg;base64,' + fs.readFileSync(imagePath, { encoding: 'base64' });
    
    console.log('Testing recognizeStudentFromImage...');
    const result = await recognizeStudentFromImage(base64Image);
    console.log('Result:', result);
  } catch (err) {
    console.error('CRASH:', err);
  }
}

run();
