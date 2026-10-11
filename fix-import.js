const fs = require('fs');
let content = fs.readFileSync('ai-service/app/main.py', 'utf8');
content = content.replace(
    'from app.routes import health, detection, embedding, liveness, quality',
    'from app.routes import health, detection, embedding, liveness, quality, analyze'
);
fs.writeFileSync('ai-service/app/main.py', content);
