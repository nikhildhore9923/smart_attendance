const fs = require('fs');
let content = fs.readFileSync('src/services/aiService.js', 'utf8');

// Remove the wrongly injected function
content = content.replace(/static async analyzeFrame[\s\S]*?\}\s*module.exports = AIService;/, 'module.exports = AIService;');

// Re-inject it INSIDE the class
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
}
`;
content = content.replace(/}\s*module.exports = AIService;/, fn + '\nmodule.exports = AIService;');
fs.writeFileSync('src/services/aiService.js', content);
console.log('Fixed AIService.js');
