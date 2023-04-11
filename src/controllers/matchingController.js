const mongoose = require('mongoose');
const User = require('../models/user');

exports.findMatchingUsers = async (req, res) => {
  try {
    const skillId = req.body.skillId;
    const currentUserId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(skillId)) {
      return res.status(400).json({ message: 'Invalid skill ID' });
    }

    // Получить текущего пользователя и его skillsToTeach
    const currentUser = await User.findById(currentUserId).select('skillsToTeach');
    const currentUserSkillsToTeachIds = currentUser.skillsToTeach.map(skill => skill._id.toString());

    // Искать пользователей, у которых есть skillsToTeach для полученного навыка
    // и skillsToLearn, которые у текущего пользователя есть в skillsToTeach
    const matchingUsers = await User.find({
      _id: { $ne: currentUserId },
      'skillsToTeach._id': skillId,
      'skillsToLearn._id': { $in: currentUserSkillsToTeachIds }
    }).select('-password -email');

    if (matchingUsers.length === 0) {
      return res.status(400).json({ message: 'No matching users found' });
    }

    res.status(200).json({ matchingUsers });
    console.log(matchingUsers);
  } catch (error) {
    console.error('Error in findMatchingUsers:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

