const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const messageRoutes = require('./routes/messageRoutes');
const authRoutes = require('./routes/authRoutes'); // 👈 add this
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

connectDB();

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);       // 👈 add this
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.send('Chat server is running!');
});

// Track online users
const onlineUsers = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_room', ({ room, username }) => {
    socket.join(room);
    onlineUsers[socket.id] = { username, room };
    console.log(`${username} joined room: ${room}`);

    socket.to(room).emit('user_joined', {
      message: `${username} has joined the chat!`
    });

    const usersInRoom = Object.values(onlineUsers).filter(
      (u) => u.room === room
    );
    io.to(room).emit('online_users', usersInRoom);
  });

  socket.on('send_message', async ({ room, content, senderId, username }) => {
    try {
      const message = await Message.create({
        sender: senderId,
        content,
        room,
      });

      io.to(room).emit('receive_message', {
        _id: message._id,
        content: message.content,
        sender: { _id: senderId, username },
        room: message.room,
        createdAt: message.createdAt,
      });
    } catch (error) {
      console.error('Message save error:', error.message);
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
      socket.to(user.room).emit('user_left', {
        message: `${user.username} has left the chat.`
      });
      delete onlineUsers[socket.id];
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});