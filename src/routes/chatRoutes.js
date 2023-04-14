const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/create', authMiddleware, chatController.createChat);
router.post('/send', authMiddleware, chatController.sendMessage);
router.get('/messages/:chatId', authMiddleware, chatController.getMessages);
router.patch("/deal/:chatId", authMiddleware, chatController.updateDeal);
router.patch("/deal/confirm-deal/:chatId", authMiddleware, chatController.confirmDeal);

module.exports = router;
