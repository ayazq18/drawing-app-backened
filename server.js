require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-id.firebaseio.com", 
});

const app = express();
const server = http.createServer(app);
app.use(cors());

const io = new Server(server, 
  {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.PROD_ORIGIN 
      : process.env.LOCAL_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true, // Allow credentials (like cookies)
  },
}
);

let drawingData = [];

io.use(async (socket, next) => {
  const token = socket.handshake.query.token;
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    socket.user = decodedToken;
    next();
  } catch (error) {
    console.error('Invalid token:', error);
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.uid}`);

  // Send the current drawing data to the newly connected client
  socket.emit('init-drawing-data', drawingData);

  socket.on('drawing-data', (data) => {
    drawingData.push(data);
    socket.broadcast.emit('drawing-data', data);
  });

  socket.on('clear-canvas', () => {
    drawingData = [];
    io.emit('clear-canvas');
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.uid}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
