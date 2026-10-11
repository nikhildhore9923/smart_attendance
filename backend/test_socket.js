const { io } = require('socket.io-client');
const fs = require('fs');

async function testSocket() {
  console.log('--- Initializing Socket Test ---');
  
  let token = null;
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const user = await prisma.user.findFirst({ where: { role: 'FACULTY' } });
    
    const fetch = (await import('node-fetch')).default;
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'password123' })
    });
    const data = await res.json();
    token = data.token;
  } catch (e) {
    console.error('Failed to get token for test', e);
    return;
  }

  console.log('Token acquired. Connecting socket...');

  // 2. Connect valid socket
  const socket = io('http://localhost:5000', {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected successfully!', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err.message);
  });

  socket.on('attendance:marked', (data) => {
    console.log('\n--- 🔔 REAL-TIME EVENT RECEIVED ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('----------------------------------\n');
  });

  // 3. Connect invalid socket
  const invalidSocket = io('http://localhost:5000', {
    auth: { token: 'invalid_token_123' }
  });

  invalidSocket.on('connect_error', (err) => {
    console.log('✅ Invalid socket correctly rejected:', err.message);
  });

  setTimeout(() => {
    console.log('Waiting for attendance events... (Run e2e_test.js to trigger)');
  }, 2000);
}

testSocket();
