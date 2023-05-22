const authMiddleware = require('./authMiddleware');

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

module.exports = socketAuthMiddleware;
