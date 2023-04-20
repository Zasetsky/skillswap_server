const Chat = require('../models/chat');
const mongoose = require('mongoose');

const socketChatController  = (io) => {
    io.on("connection", (socket) => {
      console.log("User connected");

      // socket.on("joinChat", ({ chatId }) => {       // Нужно объяснение.
      //   console.log("User joined chat:", chatId);
      //   // Присоединиться к комнате с chatId
      //   socket.join(chatId);
      // });
  
      // Отправка сообщений
      socket.on("sendMessage", async (data) => {
        const { chatId, type, content, sender } = data;
  
        // Проверяем, присутствует ли content
        if (!content) {
          return socket.emit("error", { message: 'Content is required' });
        }
  
        try {
          // Создаем новое сообщение
          const newMessage = {
            _id: new mongoose.Types.ObjectId(),
            sender,
            type: type,
            content
          };
  
          // Обновляем чат, добавляя новое сообщение
          await Chat.findByIdAndUpdate(
            chatId,
            { $push: { messages: newMessage } },
            { new: true }
          );
  
          // Отправляем только новое сообщение обратно клиенту
          socket.emit("message", newMessage);
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
        console.log("User disconnected");
      });
    });
  };

  module.exports = socketChatController;