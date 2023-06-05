const mongoose = require('mongoose');
const User = require('../models/user');

const sortUsersBySkillLevel = (users, currentUserSkillLevel) => {
  const skillLevels = ["beginner", "intermediate", "advanced"];
  const currentUserSkillLevelIndex = skillLevels.indexOf(currentUserSkillLevel);

  return users.sort((a, b) => {
    const aSkillLevelIndex = skillLevels.indexOf(a.skillsToTeach[0].level);
    const bSkillLevelIndex = skillLevels.indexOf(b.skillsToTeach[0].level);
  
    if (aSkillLevelIndex === bSkillLevelIndex) {
      return 0;
    }
  
    if (aSkillLevelIndex < currentUserSkillLevelIndex && bSkillLevelIndex >= currentUserSkillLevelIndex) {
      return 1;
    }
  
    if (bSkillLevelIndex < currentUserSkillLevelIndex && aSkillLevelIndex >= currentUserSkillLevelIndex) {
      return -1;
    }

    return aSkillLevelIndex - bSkillLevelIndex;
  });
};

const sortMatchingUsers = (matchingUsers, skillId) => {
  matchingUsers.sort((a, b) => {
    // Сначала сортировка по карме
    if (b.karma !== a.karma) {
      return b.karma - a.karma;
    }

    // Затем сортировка по рейтингу текущего навыка
    const aSkillRating = a.skillsToTeach.find(skill => skill._id.toString() === skillId)?.rating || 0;
    const bSkillRating = b.skillsToTeach.find(skill => skill._id.toString() === skillId)?.rating || 0;
    if (bSkillRating !== aSkillRating) {
      return bSkillRating - aSkillRating;
    }

    // Затем сортировка по лояльности
    if (b.loyaltyRating !== a.loyaltyRating) {
      return b.loyaltyRating - a.loyaltyRating;
    }

    // Затем сортировка по надежности
    if (b.reliabilityRating !== a.reliabilityRating) {
      return b.reliabilityRating - a.reliabilityRating;
    }

    // Наконец, сортировка по общему рейтингу навыков
    return b.totalSkillsRating - a.totalSkillsRating;
  });
};

exports.findMatchingUsers = async (req, res) => {
  try {
    const skillId = req.body.skillId;
    const currentUserId = req.userId;
    console.log(skillId);

    if (!mongoose.Types.ObjectId.isValid(skillId)) {
      return res.status(400).json({ message: 'Invalid skill ID' });
    }

    // Получить текущего пользователя и его skillsToTeach
    const currentUser = await User.findById(currentUserId).select('skillsToTeach');
    const currentUserSkillsToTeachIds = currentUser.skillsToTeach.map(skill => skill._id.toString());
    const currentUserSkillLevel = currentUser.skillsToLearn.find(skill => skill._id.toString() === skillId).level;

    // Искать пользователей, у которых есть skillsToTeach для полученного навыка
    // и skillsToLearn, которые у текущего пользователя есть в skillsToTeach
    const matchingUsers = await User.find({
      _id: { $ne: currentUserId },
      'skillsToTeach._id': skillId,
      'skillsToLearn': {
        $elemMatch: {
          '_id': { $in: currentUserSkillsToTeachIds },
          'isActive': false
        }
      }
    }).select('-password -email');

    if (matchingUsers.length === 0) {
      return res.status(200).json({ matchingUsers: [] });
    }

    sortMatchingUsers(matchingUsers, skillId);

    const sortedUsers = sortUsersBySkillLevel(matchingUsers, currentUserSkillLevel);

    res.status(200).json({ matchingUsers: sortedUsers });
  } catch (error) {
    console.error('Error in findMatchingUsers:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};


