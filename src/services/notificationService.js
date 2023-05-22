const WebSocket = require("ws");

// Предположим, что у вас есть функция для поиска сокета по ID пользователя
const { findSocketByUserId } = require("./socketManager");

function sendNotification(userId, notification) {
  try {
    const socket = findSocketByUserId(userId);

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(notification));
    } else {
      console.warn("Socket not found or not open for user:", userId);
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

module.exports = {
  sendNotification,
};