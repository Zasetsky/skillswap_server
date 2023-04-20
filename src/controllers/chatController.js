const Chat = require('../models/chat');

// Создание чата

exports.createChat = async (req, res) => {
  const { senderId, swapRequestId } = req.body;
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
      swapRequestId: swapRequestId,
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


 