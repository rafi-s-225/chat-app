const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const messageRoutes = require('./routes/messageRoutes');
const authRoutes = require('./routes/authRoutes');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

// Connect Database
connectDB();

const CORS_ORIGIN = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.json({ message: '💬 ChatApp Server API is up and running cleanly!' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// Track online users: socket.id -> { userId, username, avatarColor, room }
const onlineUsers = {};

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on('join_room', ({ room, username, userId, avatarColor }) => {
    // Leave previous room if any
    const prevUser = onlineUsers[socket.id];
    if (prevUser && prevUser.room) {
      socket.leave(prevUser.room);
    }

    socket.join(room);
    onlineUsers[socket.id] = {
      socketId: socket.id,
      userId,
      username: username || 'Anonymous',
      avatarColor: avatarColor || '#6366f1',
      room: room || 'general',
    };

    console.log(`👤 ${username} joined room: #${room}`);

    // Notify room members
    socket.to(room).emit('user_joined', {
      message: `${username} joined #${room}`,
      username,
    });

    // Send updated list of users in this room
    const usersInRoom = Object.values(onlineUsers).filter((u) => u.room === room);
    io.to(room).emit('online_users', usersInRoom);
  });

  socket.on('send_message', async ({ room, content, senderId }) => {
    try {
      if (!content || !content.trim()) return;

      const message = await Message.create({
        sender: senderId,
        content: content.trim(),
        room: room || 'general',
      });

      const populatedMessage = await message.populate('sender', 'username avatarColor email');

      io.to(room).emit('receive_message', populatedMessage);
    } catch (error) {
      console.error('Message save error:', error.message);
      socket.emit('error_message', { message: 'Failed to send message' });
    }
  });

  socket.on('typing', ({ room, username }) => {
    socket.to(room).emit('user_typing', { username });
  });

  socket.on('stop_typing', ({ room }) => {
    socket.to(room).emit('user_stop_typing');
  });

  socket.on('disconnect', () => {
    const user = onlineUsers[socket.id];
    if (user) {
      const { username, room } = user;
      delete onlineUsers[socket.id];

      socket.to(room).emit('user_left', {
        message: `${username} left #${room}`,
        username,
      });

      const usersInRoom = Object.values(onlineUsers).filter((u) => u.room === room);
      io.to(room).emit('online_users', usersInRoom);
    }
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});