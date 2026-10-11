import { io } from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem('token');
  
  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
    auth: {
      token
    },
    autoConnect: false // Connect manually when needed
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
