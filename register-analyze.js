const fs = require('fs');
let content = fs.readFileSync('ai-service/app/main.py', 'utf8');

if (!content.includes('analyze.router')) {
    content = content.replace(
        'from app.routes import detection, embedding, liveness, health',
        'from app.routes import detection, embedding, liveness, health, analyze'
    );
    content = content.replace(
        'app.include_router(health.router, tags=["Health"])',
        'app.include_router(health.router, tags=["Health"])\napp.include_router(analyze.router, tags=["Analyze"])'
    );
    fs.writeFileSync('ai-service/app/main.py', content);
    console.log('Registered analyze router');
}
