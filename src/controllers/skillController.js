const mongoose = require('mongoose');
const User = require('../models/user');
const AvailableSkill = require('../models/availableSkill');


// Добавление скиллов

exports.addSkillsToLearn = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const skillsToAdd = req.body.skills;

    // Отладочный лог для входных данных
    // console.log('Received skillsToLearn:', skillsToAdd);

    for (const skillToAdd of skillsToAdd) {
      const availableSkill = await AvailableSkill.findById(skillToAdd._id);

      if (!availableSkill) {
        return res.status(404).json({ message: 'Skill not found' });
      }

      // Проверьте, есть ли навык в skillsToLearn
      const skillInLearnList = user.skillsToLearn.find((skill) => skill._id.toString() === availableSkill._id.toString());

      if (!skillInLearnList) {
        user.skillsToLearn.push({
          _id: availableSkill._id,
          theme: availableSkill.theme,
          category: availableSkill.category,
          subCategory: availableSkill.subCategory,
          skill: availableSkill.skill,
        });
      }
    }

    await user.save();
    res.status(200).json({ message: 'Skills added to learn', user });
  } catch (error) {
    console.error('Error in addSkillToLearn:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};



exports.addSkillsToTeach = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const skillsToAdd = req.body.skills;

    // Отладочный лог для входных данных
    // console.log('Received skillsToTeach:', skillsToAdd);

    for (const skillToAdd of skillsToAdd) {
      const availableSkill = await AvailableSkill.findById(skillToAdd._id);

      if (!availableSkill) {
        return res.status(404).json({ message: 'Skill not found' });
      }

      // Проверьте, есть ли навык в skillsToTeach
      const skillInTeachList = user.skillsToTeach.find((skill) => skill._id.toString() === availableSkill._id.toString());

      if (!skillInTeachList) {
        user.skillsToTeach.push({
          _id: availableSkill._id,
          theme: availableSkill.theme,
          category: availableSkill.category,
          subCategory: availableSkill.subCategory,
          skill: availableSkill.skill,
        });
      }
    }

    await user.save();
    res.status(200).json({ message: 'Skills added to teach', user });
  } catch (error) {
    console.error('Error in addSkillsToTeach:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};


// Удаление скиллов

exports.removeSkillToTeach = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    user.skillsToTeach = user.skillsToTeach.filter(
      (skill) => skill.toString() !== req.body.skillId
    );

    await user.save();
    res.status(200).json({ message: 'Skill removed from teach', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
  
exports.removeSkillToLearn = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    user.skillsToLearn = user.skillsToLearn.filter(
      (skill) => skill.toString() !== req.body.skillId
    );

    await user.save();
    res.status(200).json({ message: 'Skill removed from learn', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Запрос на все доступные скиллы

exports.getAllAvailableSkills = async (req, res) => {
  try {
    const availableSkills = await AvailableSkill.find();
    res.status(200).json(availableSkills);
  } catch (error) {
    console.error('Error during fetching available skills:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Переключение "в процессе" слабых навыков

exports.toggleSkillToLearnIsInProcess = async (req, res) => {
  try {
    const skillId = req.body.skillId;
    const currentUserId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(skillId)) {
      return res.status(400).json({ message: 'Invalid skill ID' });
    }

    const currentUser = await User.findById(currentUserId);

    let skillFound = false;

    currentUser.skillsToLearn.forEach((skill) => {
      if (skill._id.toString() === skillId) {
        skill.isInProcess = !skill.isInProcess;
        skillFound = true;
      }
    });

    if (!skillFound) {
      return res.status(400).json({ message: 'Skill not found' });
    }

    await currentUser.save();
    res.status(200).json({ message: 'Skill to learn updated successfully' });
  } catch (error) {
    console.error('Error in toggleSkillToLearnIsInProcess:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Переключение "в процессе" сильных навыков

exports.toggleSkillToTeachIsInProcess = async (req, res) => {
  try {
    const skillId = req.body.skillId;
    const currentUserId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(skillId)) {
      return res.status(400).json({ message: 'Invalid skill ID' });
    }

    const currentUser = await User.findById(currentUserId);

    let skillFound = false;

    currentUser.skillsToTeach.forEach((skill) => {
      if (skill._id.toString() === skillId) {
        skill.isInProcess = !skill.isInProcess;
        skillFound = true;
      }
    });

    if (!skillFound) {
      return res.status(400).json({ message: 'Skill not found' });
    }

    await currentUser.save();
    res.status(200).json({ message: 'Skill to teach updated successfully' });
  } catch (error) {
    console.error('Error in toggleSkillToTeachIsInProcess:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};