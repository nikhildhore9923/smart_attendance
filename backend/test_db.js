const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDatabase() {
  console.log("=== Testing MySQL Database Connection ===");
  try {
    // Attempt to connect
    await prisma.$connect();
    console.log("SUCCESS: Prisma connected to MySQL successfully.");
    
    // Attempt a simple query
    const userCount = await prisma.user.count();
    console.log(`SUCCESS: Queried the User table. Current row count: ${userCount}`);
    
  } catch (error) {
    console.error("ERROR: Failed to connect or query the database.");
    console.error("Details:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
