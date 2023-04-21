const Chat = require('../models/chat');
const mongoose = require('mongoose');

const socketChatController  = (io) => {
    io.on("connection", (socket) => {
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
          const chats = await Chat.find();
          socket.emit("allChats", chats);
        } catch (error) {
          console.error('Error getting all chats:', error);
          socket.emit("error", { message: 'Error getting all chats' });
        }
      });
  
  
      // Обновление Сделки
      socket.on("updateDeal", async (data) => {
        const { chatId, status, senderId, formData1, formData2 } = data;
  
        try {
          const chat = await Chat.findById(chatId);
          if (!chat) {
            return socket.emit("error", { message: "Chat not found" });
          }
  
          chat.deal.status = status;
          chat.deal.sender = senderId;
          chat.deal.form.meetingDate = formData1.meetingDate;
          chat.deal.form.meetingTime = formData1.meetingTime;
          chat.deal.form.meetingDuration = formData1.meetingDuration;
          chat.deal.form2.meetingDate = formData2.meetingDate;
          chat.deal.form2.meetingTime = formData2.meetingTime;
          chat.deal.form2.meetingDuration = formData2.meetingDuration;
  
          await chat.save();
          socket.emit("deal", chat.deal);
        } catch (error) {
          socket.emit("error", { message: "Error updating deal" });
        }
      });
  
      socket.on("disconnect", () => {
        console.log("User disconnected from chat");
      });
    });
  };

  module.exports = socketChatController;