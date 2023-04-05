const express = require('express');
const router = express.Router();

const skillController = require('../controllers/skillController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/add-skills-to-learn', authMiddleware, skillController.addSkillsToLearn);
router.post('/add-skills-to-teach', authMiddleware, skillController.addSkillsToTeach);
router.delete('/remove-skill-to-learn', authMiddleware, skillController.removeSkillToLearn);
router.delete('/remove-skill-to-teach', authMiddleware, skillController.removeSkillToTeach);

router.get('/available-skills', skillController.getAllAvailableSkills);

module.exports = router;
