const fs = require('fs');

let pyContent = fs.readFileSync('ai-service/app/routes/detection.py', 'utf8');
pyContent = pyContent.replace('return DetectResponse(status="NO_FACE", num_faces=0, faces=[])', 'return DetectResponse(status="INVALID_IMAGE", num_faces=0, faces=[])');
fs.writeFileSync('ai-service/app/routes/detection.py', pyContent);

let nodeContent = fs.readFileSync('backend/src/services/recognitionService.js', 'utf8');
nodeContent = nodeContent.replace('if (detectResult.status === \'NO_FACE\')', 'if (detectResult.status === \'INVALID_IMAGE\') {\n    return { recognized: false, student: null, similarity: 0, error: \'Invalid or corrupted image data.\' };\n  }\n  if (detectResult.status === \'NO_FACE\')');
fs.writeFileSync('backend/src/services/recognitionService.js', nodeContent);

console.log('Updated invalid image handling');
