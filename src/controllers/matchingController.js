const User = require('../models/user');

exports.findMatchingUsers = async (req, res) => {
  const currentUserId = req.body.currentUserId;
  console.log('User: ', currentUserId);
  try {
    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    console.log('Current user:', currentUser);

    const allUsers = await User.find({});
    console.log('All users:', allUsers);

    const matchingUsers = allUsers.filter((user) => {
      if (user._id.toString() === currentUser._id.toString()) {
        return false;
      }

      return user.skillsToTeach.some((teachSkill) =>
        currentUser.skillsToLearn.some((learnSkill) => {
          return (
            learnSkill.theme === teachSkill.theme &&
            learnSkill.category === teachSkill.category &&
            learnSkill.subCategory === teachSkill.subCategory &&
            learnSkill.skill === teachSkill.skill &&
            user.skillsToLearn.some((userLearnSkill) => {
              return (
                currentUser.skillsToTeach.some((currentUserTeachSkill) => {
                  return (
                    userLearnSkill.theme === currentUserTeachSkill.theme &&
                    userLearnSkill.category === currentUserTeachSkill.category &&
                    userLearnSkill.subCategory === currentUserTeachSkill.subCategory &&
                    userLearnSkill.skill === currentUserTeachSkill.skill
                  );
                })
              );
            })
          );
        })
      );
    });

    console.log('Matching users:', matchingUsers);

    res.status(200).json(matchingUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера при поиске подходящих пользователей' });
  }
};
