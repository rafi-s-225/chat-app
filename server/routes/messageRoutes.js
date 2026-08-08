const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const protect = require('../middleware/authMiddleware');

// Get all messages for a room — protected route
router.get('/:room', protect, async (req, res) => {
  try {
    const roomName = req.params.room || 'general';
    const messages = await Message.find({ room: roomName })
      .populate('sender', 'username avatarColor email')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;