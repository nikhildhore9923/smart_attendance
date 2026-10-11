const fs = require('fs');
let content = fs.readFileSync('backend/src/services/aiService.js', 'utf8');

if (!content.includes('analyzeFrame')) {
    const fn = `
  static async analyzeFrame(base64Image) {
    try {
      const response = await axios.post(\`\${AI_URL}/analyze-frame\`, { image: base64Image });
      return response.data;
    } catch (error) {
      console.error('Frame analysis failed:', error.message);
      throw new Error('AI Service error');
    }
  }
`;
    content = content.replace('module.exports = AIService;', fn + '\nmodule.exports = AIService;');
    fs.writeFileSync('backend/src/services/aiService.js', content);
    console.log('Added analyzeFrame');
}
