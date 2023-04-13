const Chat = require('../models/chat');
const mongoose = require('mongoose');

exports.createChat = async (req, res) => {
  const { senderId, skillId } = req.body;
  const currentUserId = req.userId

  try {
    const existingChat = await Chat.findOne({
      participants: { $all: [currentUserId, senderId] },
    });

    if (existingChat) {
      return res.status(200).json({ chat: existingChat });
    }

    const newChat = await Chat.create({
      participants: [currentUserId, senderId],
      skillId: skillId,
      messages: [
        {
          sender: senderId,
          content: `Привет, я хочу обменяться с тобой навыками!`,
        },
      ],
    });

    res.status(201).json({ chat: newChat });
  } catch (error) {
    res.status(500).json({ message: 'Error creating chat', error });
  }
};

exports.sendMessage = async (req, res) => {
  const { chatId, content } = req.body;

  try {
    // Создаем новое сообщение
    const newMessage = { _id: new mongoose.Types.ObjectId(), sender: req.userId, content };

    // Обновляем чат, добавляя новое сообщение
    await Chat.findByIdAndUpdate(
      chatId,
      { $push: { messages: newMessage } },
      { new: true }
    );

    // Отправляем только новое сообщение обратно клиенту
    res.status(200).json({ message: newMessage });
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error });
  }
};

exports.getMessages = async (req, res) => {
  const { chatId } = req.params;

  try {
    const chat = await Chat.findById(chatId).populate('messages.sender', 'firstName lastName avatar');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.status(200).json({ chat });
  } catch (error) {
    res.status(500).json({ message: 'Error getting messages', error });
  }
};

