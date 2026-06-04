const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const protect = require('../middleware/authMiddleware');

// Get all messages for a room
router.get('/:room', protect, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .populate('sender', 'username')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;