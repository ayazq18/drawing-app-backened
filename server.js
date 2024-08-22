const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure CORS to allow requests from frontend
app.use(cors());

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Handle new connections
// backend code
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
  
    // Handle drawing data
    socket.on('drawing-data', (data) => {
      socket.broadcast.emit('drawing-data', data);
    });
  
    // Handle clear canvas request
    socket.on('clear-canvas', () => {
      socket.broadcast.emit('clear-canvas'); // Broadcast to all other clients
    });
  
    // Handle user disconnects
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
  

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
