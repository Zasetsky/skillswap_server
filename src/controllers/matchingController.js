const mongoose = require('mongoose');
const User = require('../models/user');

const sortUsersBySkillLevel = (users, currentUserSkillLevel, skillId) => {
  const skillLevels = ["beginner", "intermediate", "advanced"];
  const currentUserSkillLevelIndex = skillLevels.indexOf(currentUserSkillLevel);

  // Разделите пользователей на три группы в зависимости от уровня их навыка
  const sameLevelUsers = [];
  const higherLevelUsers = [];
  const lowerLevelUsers = [];

  for (const user of users) {
    const userSkillLevelIndex = skillLevels.indexOf(user.skillsToTeach.find(skill => skill._id.toString() === skillId).level);
    if (userSkillLevelIndex === currentUserSkillLevelIndex) {
      sameLevelUsers.push(user);
    } else if (userSkillLevelIndex > currentUserSkillLevelIndex) {
      higherLevelUsers.push(user);
    } else {
      lowerLevelUsers.push(user);
    }
  }

  // Сортируйте пользователей внутри каждой группы
  sortMatchingUsers(sameLevelUsers, skillId);
  sortMatchingUsers(higherLevelUsers, skillId);
  sortMatchingUsers(lowerLevelUsers, skillId);

  // Возвращайте пользователей в нужном порядке
  return [...sameLevelUsers, ...higherLevelUsers, ...lowerLevelUsers];
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

    if (!mongoose.Types.ObjectId.isValid(skillId)) {
      return res.status(400).json({ message: 'Invalid skill ID' });
    }

    // Получить текущего пользователя и его skillsToTeach
    const currentUser = await User.findById(currentUserId);
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

    const sortedUsers = sortUsersBySkillLevel(matchingUsers, currentUserSkillLevel, skillId);

    res.status(200).json({ matchingUsers: sortedUsers });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error', error });
  }
};
