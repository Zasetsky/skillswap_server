const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const reviewController = require('../controllers/reviewController');

router.post('/create', authMiddleware, reviewController.createReview);

module.exports = router;
