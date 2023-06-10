const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const reviewController = require('../controllers/reviewController');

router.get('/:userId', authMiddleware, reviewController.getUserReceivedReviews );
router.get('/deal/:dealId', authMiddleware, reviewController.getCurrentDealReviews );


module.exports = router;
