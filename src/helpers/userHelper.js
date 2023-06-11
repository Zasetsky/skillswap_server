const User = require('../models/user');

// Обновляет статус активности выбранного умения пользователя
exports.updateUserIsActiveSkill = async (userId, skillId) => {
  await User.updateOne({ _id: userId, "skillsToLearn._id": skillId }, { $set: { "skillsToLearn.$.isActive": true } });
};
