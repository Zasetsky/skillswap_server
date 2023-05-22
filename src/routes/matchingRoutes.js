const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matchingController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/findMatchingUsers', authMiddleware, matchingController.findMatchingUsers);

module.exports = router;
