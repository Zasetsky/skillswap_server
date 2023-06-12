const User = require('../models/user');

// Обновляет статус активности выбранного умения пользователя
exports.updateUserIsActiveSkillOnTrue = async (userId, skillId) => {
  await User.updateOne({ _id: userId, "skillsToLearn._id": skillId }, { $set: { "skillsToLearn.$.isActive": true } });
};

// Проверяет, активен ли навык у пользователя
exports.checkUserIsActiveSkill = async (userId, skillId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const skill = user.skillsToLearn.find(skill => skill._id.toString() === skillId);

  if (!skill || skill.isActive) {
    throw new Error("User skill is already active");
  }
};