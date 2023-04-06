const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matchingController');

router.post('/findMatchingUsers', matchingController.findMatchingUsers);

module.exports = router;
