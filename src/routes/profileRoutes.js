const express = require('express');
const router = express.Router();

const profileController = require('../controllers/profileController');
const authMiddleware = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');


// Обновление информации пользователя
router.put('/update', authMiddleware, profileController.updateProfile);

// Запрос информации о пользователе
router.get('/current/:userId', profileController.getProfile);

// Обновление аватара
router.post('/avatar', authMiddleware, uploadMiddleware.single('avatar'), profileController.updateAvatar);

// Удаление аватара
router.delete('/avatar', authMiddleware, profileController.deleteAvatar);

router.post('/isPreSetup', authMiddleware, profileController.isPreSetupToggle);


module.exports = router;
