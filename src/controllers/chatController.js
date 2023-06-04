const Chat = require('../models/chat');
const SwapRequest = require('../models/swapRequest');
const mongoose = require('mongoose');
const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');

const socketChatController  = (io) => {
  io.use(socketAuthMiddleware).on("connection", (socket) => {
    console.log("User connected to chat");


    socket.on("toggleIsBusy", async (requestId) => {
      try {
        const swapRequest = await SwapRequest.findById(requestId);

        if (!swapRequest) {
          console.log(`No swapRequest found for id: ${requestId}`);
          return;
        }

        const { senderId, receiverId } = swapRequest;
    
        if (String(senderId) !== String(socket.userId)) {
          io.to(String(senderId)).emit("isBusy");
        } 
        if (String(receiverId) !== String(socket.userId)) {
          io.to(String(receiverId)).emit("isBusy");
        }
      } catch (error) {
          console.log(error);
      }
    });


    // Создание чата
    socket.on("createChat", async (data) => {
      const { receiverId, senderId, requestId } = data;
    
      try {
        const swapRequest = await SwapRequest.findOne({ _id: requestId });
    
        if (!swapRequest || swapRequest.status !== 'accepted') {
          throw new Error('Cannot create chat, swap request not found or not accepted.');
        }
    
        if (swapRequest.chatId) {
          throw new Error('Chat is already being created.');
        }
    
        const newChat = await Chat.create({
          participants: [receiverId, senderId],
          swapRequestIds: [requestId],
          messages: [{
            sender: senderId,
            content: `Привет, я хочу обменяться с тобой навыками!`,
          }],
        });
    
        const updateResult = await SwapRequest.findOneAndUpdate(
          { _id: requestId, version: swapRequest.version },
          { $set: { chatId: newChat._id }, $inc: { version: 1 } },
          { new: true }
        );
    
        if (!updateResult) {
          throw new Error('Failed to update chat ID.');
        }

        socket.emit("notCreatingChat");
    
        const participants = newChat.participants.map(participant => participant.toString());
    
        participants.forEach(participant => {
          if (participant !== socket.userId) {
            io.to(participant).emit("newChat", newChat);
          }
        });
    
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
          content,
          chatId,
          createdAt: new Date(),
        };
    
        const chat = await Chat.findById(chatId);
    
        if (!chat) {
          return socket.emit("error", { message: 'Chat not found' });
        }
    
        chat.messages.push(newMessage);
    
        await chat.save();
    
        for (let participant of chat.participants) {
          io.to(participant.toString()).emit("message", newMessage);
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