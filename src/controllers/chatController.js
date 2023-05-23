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
    
        const existingChat = await Chat.findOne({ swapRequestIds: swapRequestId });
    
        if (existingChat) {
          return socket.emit("chat", existingChat);
        }
    
        const newChat = await Chat.create({
          participants: [receiverId, senderId],
          swapRequestIds: [swapRequestId],
          messages: [
            {
              sender: senderId,
              content: `Привет, я хочу обменяться с тобой навыками!`,
            },
          ],
        });
        console.log(receiverId);
        io.to(receiverId).emit("newChat", [newChat]);
        io.to(senderId).emit("newChat", [newChat]);
        socket.emit("chat", newChat);
      } catch (error) {
        socket.emit("error", { message: 'Error creating chat', error });
      }
    });


    // Отправка сообщений
    socket.on("sendMessage", async (data) => {
      const { chatId, type, content } = data;
    
      if (!content) {
        return socket.emit("error", { message: 'Content is required' });
      }
    
      try {
        const newMessage = {
          _id: new mongoose.Types.ObjectId(),
          sender: new mongoose.Types.ObjectId(socket.userId),
          type: type,
          content
        };

    
        const chat = await Chat.findById(chatId);
    
        if (!chat) {
          return socket.emit("error", { message: 'Chat not found' });
        }
    
        chat.messages.push(newMessage);

        await chat.save();
    
        for (let participant of chat.participants) {
          io.to(participant.toString()).emit("message", chatId);
        }
    
      } catch (error) {
        // console.log(error);
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