require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
app.use(cors());

const io = new Server(server, {
  cors: {
    // origin: 'http://localhost:5173',
    origin: process.env.NODE_ENV === 'production' 
            ? process.env.PROD_ORIGIN 
            : process.env.LOCAL_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

let drawingData = [];  // Array to store the drawing data

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send the stored drawing data to the newly connected user
  socket.emit('init-drawing-data', drawingData);

  // Handle incoming drawing data
  socket.on('drawing-data', (data) => {
    drawingData.push(data);  // Store the drawing data
    socket.broadcast.emit('drawing-data', data);
  });

  // Handle clear canvas request
  socket.on('clear-canvas', () => {
    drawingData = [];  // Clear the stored data
    io.emit('clear-canvas');  // Broadcast to all clients
  });

  // Handle user disconnects
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
