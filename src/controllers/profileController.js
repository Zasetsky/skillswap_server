const User = require('../models/user');
const fs = require('fs');
const path = require('path');

// Обновление имени, фамилии и био

exports.updateProfile = async (req, res) => {
  try {
    const { firstname, lastname, bio } = req.body;
    const userId = req.userId;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstname, lastname, bio },
      { new: true, omitUndefined: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Error during updateProfile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Запрос профиля

exports.getProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        bio: user.bio,
        avatar: user.avatar,
        skillsToTeach: user.skillsToTeach,
        skillsToLearn: user.skillsToLearn,
      },
    });

  } catch (error) {
    console.error('Error during getProfile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Добавление аватарки

exports.updateAvatar = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send({ message: 'No image file was provided.' });
      }
  
      const userId = req.userId;
  
      if (!userId) {
        return res.status(401).send({ message: 'Unauthorized.' });
      }
  
      const avatarUrl = `http://${req.get('host')}/assets/images/avatars/${req.file.filename}`;
  
      await User.findByIdAndUpdate(userId, { avatar: avatarUrl });
  
      res.send({ message: 'Avatar updated successfully.', avatar: avatarUrl });
    } catch (error) {
      res.status(500).send({ message: 'Error updating avatar.', error });
    }
  };
  
  // Удаление аватарки

  exports.deleteAvatar = async (req, res) => {
    try {
      const userId = req.userId;
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      if (user.avatar) {
        const avatarPath = path.join(
          __dirname,
          '..',
          '..',
          'public',
          'assets',
          'images',
          'avatars',
          path.basename(user.avatar)
        );
        fs.unlink(avatarPath, (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error deleting avatar file' });
          }
        });
  
        user.avatar = null;
        await user.save();
  
        return res.status(200).json({ message: 'Avatar deleted successfully' });
      }
  
      res.status(404).json({ message: 'Avatar not found' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  };

  // Обновление настройки доступности

  exports.isPreSetupToggle = async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { isPreSetup: true },
    ).select('-password');
  
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
  
    // Отправка обновленных данных пользователя
    res.status(200).json({ 
      message: 'Availability updated successfully',
      user
    });
  };
