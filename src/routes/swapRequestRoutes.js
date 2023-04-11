const express = require('express');
const swapRequestController = require('../controllers/swapRequestController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/send', authMiddleware, swapRequestController.sendSwapRequest);
router.post('/accept', authMiddleware, swapRequestController.acceptSwapRequest);
router.put("/reject/:swapRequestId", authMiddleware, swapRequestController.rejectSwapRequest);
router.delete('/:requestId', authMiddleware, swapRequestController.deleteSwapRequest);

module.exports = router;