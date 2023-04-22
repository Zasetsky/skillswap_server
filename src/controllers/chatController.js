const Chat = require('../models/chat');
const mongoose = require('mongoose');
const authMiddleware = require('../middlewares/authMiddleware');


const socketAuthMiddleware = (socket, next) => {
  // Создаем объект запроса и ответа для authMiddleware
  const req = {
    headers: {
      authorization: socket.handshake.headers.authorization
    }
  };
  const res = {
    status: (code) => ({ json: (message) => ({ code, message }) }),
  };

  authMiddleware(req, res, (err) => {
    if (err) {
      return next(new Error('Unauthorized'));
    }

    // Сохраняем userId в объекте сокета
    socket.userId = req.userId;
    next();
  });
};

const socketChatController  = (io) => {
  io.use(socketAuthMiddleware).on("connection", (socket) => {
      console.log("User connected to chat");

      // Создание чата
      socket.on("createChat", async (data) => {
        const { currentUserId, senderId, swapRequestId } = data;
  
        try {
          const existingChat = await Chat.findOne({
            participants: { $all: [currentUserId, senderId] },
          });
  
          if (existingChat) {
            return socket.emit("chat", existingChat);
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

          socket.emit("chat", newChat);
        } catch (error) {
          socket.emit("error", { message: 'Error creating chat', error });
        }
      });


      // Отправка сообщений
      socket.on("sendMessage", async (data) => {
        const { chatId, type, content, sender } = data;
  
        if (!content) {
          return socket.emit("error", { message: 'Content is required' });
        }
  
        try {
          const newMessage = {
            _id: new mongoose.Types.ObjectId(),
            sender,
            type: type,
            content
          };

          await Chat.findByIdAndUpdate(
            chatId,
            { $push: { messages: newMessage } },
            { new: true }
          );

          socket.emit("message", chatId);
        } catch (error) {
          socket.emit("error", { message: 'Error sending message', error });
        }
      });


      // Запрос сообщений
      socket.on("fetchCurrentChat", async (data) => {
        const { chatId } = data;
  
        try {
          const chat = await Chat.findById(chatId)
  
          if (!chat) {
            return socket.emit("error", { message: 'Chat not found' });
          }
  
          socket.emit("chat", chat);
        } catch (error) {
          socket.emit("error", { message: 'Error getting chat', error });
        }
      })

      // Запрос всех чатов
      socket.on("fetchAllChats", async () => {
        try {
          const currentUserId = socket.userId;
          const chats = await Chat.find({ participants: { $in: [currentUserId] } });
          socket.emit("allChats", chats);
        } catch (error) {
          console.error('Error getting all chats:', error);
          socket.emit("error", { message: 'Error getting all chats' });
        }
      });
  
      socket.on("disconnect", () => {
        console.log("User disconnected from chat");
      });
    });
  };

  module.exports = socketChatController;