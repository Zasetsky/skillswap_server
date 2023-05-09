const Chat = require('../models/chat');
const SwapRequest = require('../models/swapRequest');
const mongoose = require('mongoose');
const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');

const socketChatController  = (io) => {
  io.use(socketAuthMiddleware).on("connection", (socket) => {
    console.log("User connected to chat");

    // Создание чата или возврат существующего
    socket.on("createOrGetCurrentChat", async (data) => {
      const { receiverId, senderId, swapRequestId } = data;
    
      try {
        const swapRequest = await SwapRequest.findOne({ _id: swapRequestId });
    
        if (swapRequest.status === 'rejected') {
          return socket.emit('error', { message: 'Swap request is rejected, cannot create or return chat.' });
        }
    
        const existingChat = await Chat.findOne({ swapRequestId });
    
        if (existingChat) {
          return socket.emit("chat", existingChat);
        }
    
        const newChat = await Chat.create({
          participants: [receiverId, senderId],
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