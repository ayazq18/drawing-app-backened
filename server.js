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

// Set up CORS middleware with dynamic origin
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://drawing-app-cyan.vercel.app',
      'http://localhost:5173'
    ];
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true,
};
console.log('CORS Options:', corsOptions);

app.use(cors(corsOptions));

// Add a basic route to handle root requests
app.get('/', (req, res) => {
  res.send('Drawing App Backend is running.');
});

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://drawing-app-cyan.vercel.app',
        'http://localhost:5173'
      ];
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/socket.io/',
});


let drawingData = [];
let undoStack = [];
let redoStack = [];

io.use(async (socket, next) => {
  const token = socket.handshake.query.token;
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    socket.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.uid}`);

  // Send the current drawing data to the newly connected client
  socket.emit('init-drawing-data', drawingData);

  socket.on('drawing-data', (data) => {
    drawingData.push(data);
    undoStack.push({ action: 'draw', data });
    redoStack = []; // Clear redo stack on new drawing
    socket.broadcast.emit('drawing-data', data);
  });

  socket.on('undo', () => {
    if (undoStack.length > 0) {
      const lastAction = undoStack.pop();
      if (lastAction.action === 'draw') {
        redoStack.push(lastAction);
        drawingData = drawingData.slice(0, -1); // Remove the last drawing action
        io.emit('clear-canvas');
        drawingData.forEach(action => io.emit('drawing-data', action)); // Redraw the remaining data
      }
    }
  });

  socket.on('redo', () => {
    if (redoStack.length > 0) {
      const lastAction = redoStack.pop();
      if (lastAction.action === 'draw') {
        drawingData.push(lastAction.data);
        undoStack.push(lastAction);
        io.emit('drawing-data', lastAction.data);
      }
    }
  });

  socket.on('clear-canvas', () => {
    drawingData = [];
    undoStack = [];
    redoStack = [];
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
