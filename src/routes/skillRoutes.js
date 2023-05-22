const express = require('express');
const router = express.Router();

const skillController = require('../controllers/skillController');
const authMiddleware = require('../middlewares/authMiddleware');

// добавление слабых скилов
router.post('/add-skills-to-learn', authMiddleware, skillController.addSkillsToLearn);
// добавление сильных скилов
router.post('/add-skills-to-teach', authMiddleware, skillController.addSkillsToTeach);
// удаление слабых скилов
router.delete('/remove-skill-to-learn', authMiddleware, skillController.removeSkillToLearn);
// удаление сильных скилов
router.delete('/remove-skill-to-teach', authMiddleware, skillController.removeSkillToTeach);
// запрос доступных скиллов
router.get('/available-skills', skillController.getAllAvailableSkills);


module.exports = router;
