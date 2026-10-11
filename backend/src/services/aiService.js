const axios = require('axios');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

class AIService {
  static async checkHealth() {
    try {
      const response = await axios.get(`${AI_URL}/health`);
      return response.data;
    } catch (error) {
      console.error('AI Service health check failed:', error.message);
      return { status: 'unreachable' };
    }
  }

  static async detectFaces(base64Image) {
    try {
      const response = await axios.post(`${AI_URL}/detect`, { image: base64Image });
      return response.data;
    } catch (error) {
      console.error('Face detection failed:', error.message);
      throw new Error('AI Service error');
    }
  }

  static async checkQuality(base64Image) {
    try {
      const response = await axios.post(`${AI_URL}/check-quality`, { image: base64Image });
      return response.data;
    } catch (error) {
      console.error('Quality check failed:', error.message);
      throw new Error('AI Service error');
    }
  }

  static async checkLiveness(base64FaceCrop) {
    try {
      const response = await axios.post(`${AI_URL}/liveness`, { image: base64FaceCrop });
      return response.data;
    } catch (error) {
      console.error('Liveness check failed:', error.message);
      throw new Error('AI Service error');
    }
  }

  static async getEmbedding(base64FaceCrop) {
    try {
      const response = await axios.post(`${AI_URL}/embed`, { image: base64FaceCrop });
      return response.data;
    } catch (error) {
      console.error('Embedding generation failed:', error.message);
      throw new Error('AI Service error');
    }
  }

  static async analyzeFrame(base64Image) {
    try {
      const response = await axios.post(`${AI_URL}/analyze-frame`, { image: base64Image });
      return response.data;
    } catch (error) {
      console.error('Frame analysis failed:', error.message);
      throw new Error('AI Service error');
    }
  }
}

module.exports = AIService;
