const User = require('../models/user');
const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');

const onlineUsers = new Map();

const socketOnlineUsersController = (io) => {
  io.use(socketAuthMiddleware).on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Слушайте событие входа пользователя
    socket.on('user_online', async () => {
      const userId = socket.userId;
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} is online with socket ID ${socket.id}`);

      // Обновите статус пользователя в базе данных
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    });

    // Слушайте событие проверки статуса онлайн
    socket.on('check_online_status', (data) => {
      const userId = data.userId;

      if (onlineUsers.has(userId)) {
        socket.emit('online_status', { isOnline: true });
      } else {
        socket.emit('online_status', { isOnline: false });
      }
    });

    // Слушайте событие выхода пользователя
    socket.on('disconnect', async () => {
      console.log('A user disconnected:', socket.id);

      // Удалите пользователя из списка онлайн-пользователей
      let disconnectedUserId;
      for (const [userId, userSocketId] of onlineUsers.entries()) {
        if (userSocketId === socket.id) {
          onlineUsers.delete(userId);
          console.log(`User ${userId} went offline`);

          // Обновите статус пользователя в базе данных и установите время последнего входа
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });

          disconnectedUserId = userId;
          break;
        }
      }
    });
  });
};

module.exports = socketOnlineUsersController;
