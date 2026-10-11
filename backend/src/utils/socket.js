const { Server } = require('socket.io');
const { verifyToken } = require('./jwt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // To be restricted in production
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true },
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user; // Attach user to socket
      next();
    } catch (err) {
      next(new Error('Authentication error: Server error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.user.id}, Role: ${socket.user.role})`);

    // Only allow ADMIN and FACULTY to subscribe to attendance updates
    if (socket.user.role === 'ADMIN' || socket.user.role === 'FACULTY') {
      socket.join('dashboard'); // Join dashboard room
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};

module.exports = { initSocket, getIO };
