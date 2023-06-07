const User = require('../models/user');
const AvailableSkill = require('../models/availableSkill');

const MAX_SKILLS_VIP = 9;
const MAX_SKILLS_NON_VIP = 3;

// Добавление скиллов

exports.addSkillsToLearn = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const skillsToAdd = req.body.skills;

    for (const skillToAdd of skillsToAdd) {
      const availableSkill = await AvailableSkill.findById(skillToAdd._id);

      if (!availableSkill) {
        return res.status(404).json({ message: 'Skill not found' });
      }

      if (!skillToAdd.level) {
        return res.status(404).json({ message: 'Level must to be' });
      }

      if (user.vip && user.skillsToLearn.length >= MAX_SKILLS_VIP) {
        return res.status(400).json({ message: 'VIP users can add up to ' + MAX_SKILLS_VIP + ' skills to learn' });
      }
      
      if (!user.vip && user.skillsToLearn.length >= MAX_SKILLS_NON_VIP) {
        return res.status(400).json({ message: 'Non-VIP users can add up to ' + MAX_SKILLS_NON_VIP + ' skills to learn' });
      }

      const skillInLearnList = user.skillsToLearn.find(
        (skill) => skill._id.toString() === availableSkill._id.toString()
      );

      const skillInTeachList = user.skillsToTeach.find(
        (skill) => skill._id.toString() === availableSkill._id.toString()
      );

      if (skillInLearnList || skillInTeachList) {
        return res.status(400).json({ message: 'This skill is already in the list of skills' });
      } else {
        user.skillsToLearn.push({
          _id: availableSkill._id,
          theme: availableSkill.theme,
          category: availableSkill.category,
          subcategory: availableSkill.subcategory,
          skill: availableSkill.skill,
          level: skillToAdd.level,
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

    for (const skillToAdd of skillsToAdd) {
      const availableSkill = await AvailableSkill.findById(skillToAdd._id);

      if (!availableSkill) {
        return res.status(404).json({ message: 'Skill not found' });
      }

      if (!skillToAdd.level) {
        return res.status(404).json({ message: 'Level must to be' });
      }

      if (user.vip && user.skillsToTeach.length >= MAX_SKILLS_VIP) {
        return res.status(400).json({ message: 'VIP users can add up to ' + MAX_SKILLS_VIP + ' skills to teach' });
      }
      
      if (!user.vip && user.skillsToTeach.length >= MAX_SKILLS_NON_VIP) {
        return res.status(400).json({ message: 'Non-VIP users can add up to ' + MAX_SKILLS_NON_VIP + ' skills to teach' });
      }

      const skillInTeachList = user.skillsToTeach.find(
        (skill) => skill._id.toString() === availableSkill._id.toString()
      );

      const skillInLearnList = user.skillsToLearn.find(
        (skill) => skill._id.toString() === availableSkill._id.toString()
      );

      if (skillInTeachList || skillInLearnList) {
        return res.status(400).json({ message: 'This skill is already in the list of skills to teach' });
      } else {
        user.skillsToTeach.push({
          _id: availableSkill._id,
          theme: availableSkill.theme,
          category: availableSkill.category,
          subcategory: availableSkill.subcategory,
          skill: availableSkill.skill,
          level: skillToAdd.level,
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


