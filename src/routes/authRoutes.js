const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// Регистрация пользователя
router.post('/register', authController.register);

// Вход пользователя
router.post('/login', authController.login);

// Получение информации о текущем пользователе (с проверкой авторизации)
router.get('/user', authMiddleware, authController.getUserInfo);


module.exports = router;
