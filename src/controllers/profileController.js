const User = require('../models/user');
const path = require('path');

// Обновление имени, фамилии и био

exports.updateProfile = async (req, res) => {
  try {
    let { firstname, lastname, age, gender, bio } = req.body;
    const userId = req.userId;

    console.log(gender);

    firstname = capitalizeFirstLetter(firstname);
    lastname = capitalizeFirstLetter(lastname);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstname, lastname, age, gender, bio },
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

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

// Запрос профиля

exports.getProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select('-password -email');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);

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

    const avatarUrl = req.file.location;

    const user = await User.findById(userId);
    user.avatar = avatarUrl;
    user.allAvatars.push(avatarUrl);
    await user.save();

    res.send({ message: 'Avatar updated successfully.', avatar: avatarUrl });
  } catch (error) {
    res.status(500).send({ message: 'Error updating avatar.', error });
  }
};

  // Добавление баннера

exports.updateBanner = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.banner = req.file.location;
    user.bannerPosition = req.body.bannerPosition;
    user.allBanners.push(req.file.location);
    
    await user.save();

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
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
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: path.basename(user.avatar),
      };

      s3.deleteObject(params, async function(err, data) {
        if (err) {
          console.log(err, err.stack);
          return res.status(500).json({ message: 'Error deleting avatar file' });
        } else {
          user.avatar = null;
          await user.save();

          return res.status(200).json({ message: 'Avatar deleted successfully' });
        }
      });
    } else {
      res.status(404).json({ message: 'Avatar not found' });
    }
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
