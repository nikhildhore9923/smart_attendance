const { recognizeStudentFromImage } = require('../services/recognitionService');

/**
 * Recognizes a student from a given base64 image.
 * Flow: Detect -> Quality -> Embed -> DB Compare -> Threshold Check
 */
const recognizeFace = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const result = await recognizeStudentFromImage(image);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    if (result.recognized) {
      return res.json({
        recognized: true,
        student: result.student,
        similarity: result.similarity,
        message: 'Face recognized successfully'
      });
    } else {
      return res.json({
        recognized: false,
        student: null,
        similarity: result.similarity,
        message: 'Unknown face'
      });
    }

  } catch (error) {
    console.error('Recognition error:', error);
    res.status(500).json({ error: 'Internal Server Error during recognition' });
  }
};

module.exports = {
  recognizeFace
};
