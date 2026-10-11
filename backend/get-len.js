const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
prisma.faceEmbedding.findFirst().then(f => console.log(f.embedding.length)).finally(()=>prisma.$disconnect());
