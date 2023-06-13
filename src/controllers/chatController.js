const Chat = require('../models/chat');
const SwapRequest = require('../models/swapRequest');
const mongoose = require('mongoose');
const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');

const chatHelper = require('../helpers/chatHelper');
const swapRequestHelper = require('../helpers/swapRequestHelper');

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
        const swapRequest = await swapRequestHelper.getAndCheckSwapRequest(requestId);
        const newChat = await chatHelper.createNewChat(receiverId, senderId, requestId);
        await swapRequestHelper.updateSwapRequest(swapRequest, newChat._id);
    
        socket.emit("notCreatedChat");
        
        chatHelper.emitNewChat(newChat, socket, io);
    
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
        chat.lastActivityAt = new Date();
    
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
        const chats = await Chat.find({ participants: { $in: [currentUserId] } }).sort({ lastActivityAt: -1 });

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