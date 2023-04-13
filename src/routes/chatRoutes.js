const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/create', authMiddleware, chatController.createChat);
router.post('/send', authMiddleware, chatController.sendMessage);
router.get('/messages/:chatId', authMiddleware, chatController.getMessages);

module.exports = router;
