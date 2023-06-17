const express = require('express');
const router = express.Router();

const profileController = require('../controllers/profileController');
const authMiddleware = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');


// Обновление информации пользователя
router.put('/update', authMiddleware, profileController.updateProfile);

// Запрос информации о пользователе
router.get('/current/:userId', authMiddleware, profileController.getProfile);

// Обновление аватара
router.post('/avatars', authMiddleware, (req, res, next) => uploadMiddleware(['original', 'cropped'])(req, res, next), profileController.updateAvatars);

// Удаление аватара
router.delete('/avatar', authMiddleware, profileController.deleteAvatar);

router.put('/banner', authMiddleware, (req, res, next) => uploadMiddleware('banner')(req, res, next), profileController.updateBanner);

router.post('/isPreSetup', authMiddleware, profileController.isPreSetupToggle);


module.exports = router;
