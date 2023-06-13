const Chat = require('../models/chat');


// функция создания нового чата
exports.createNewChat = async (receiverId, senderId, requestId) => {
  return await Chat.create({
    participants: [receiverId, senderId],
    swapRequestIds: [requestId],
    messages: [{
      sender: senderId,
      content: `Привет, я хочу обменяться с тобой навыками!`,
    }],
  });
}

// функция отправки нового чата участникам
exports.emitNewChat = (newChat, socket, io) => {
  const participants = newChat.participants.map(participant => participant.toString());
  
  participants.forEach(participant => {
    if (participant !== socket.userId) {
      io.to(participant).emit("newChat", newChat);
    }
  });

  socket.emit("chat", newChat);
}