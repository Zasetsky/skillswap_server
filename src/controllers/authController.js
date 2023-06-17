const User = require('../models/user');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
require('dotenv').config();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// Регистрация

exports.register = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = new User({ email, password });
    await newUser.save();

    console.log('New user registered:', newUser);

    const payload = { userId: newUser.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token, user: { id: newUser._id, email: newUser.email } });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Вход

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    if (user.banner) {
      let params = {Bucket: process.env.AWS_BUCKET_NAME, Key: user.banner, Expires: 60};
      user.banner = s3.getSignedUrl('getObject', params);
    }

    if (user.avatar) {
      let params = {Bucket: process.env.AWS_BUCKET_NAME, Key: user.avatar, Expires: 60};
      user.avatar = s3.getSignedUrl('getObject', params);
    }

    user.allAvatars = user.allAvatars.map(avatar => {
      let params = {Bucket: process.env.AWS_BUCKET_NAME, Key: avatar, Expires: 60};
      return s3.getSignedUrl('getObject', params);
    });
    
    user.allBanners = user.allBanners.map(banner => {
      let params = {Bucket: process.env.AWS_BUCKET_NAME, Key: banner, Expires: 60};
      return s3.getSignedUrl('getObject', params);
    });

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Удаляем пароль из объекта пользователя перед отправкой
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    res.status(200).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Автовход

exports.getUserInfo = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.banner) {
      let params = {Bucket: process.env.AWS_BUCKET_NAME, Key: user.banner, Expires: 60};
      user.banner = s3.getSignedUrl('getObject', params);
    }

    if (user.avatar) {
      let params = {Bucket: process.env.AWS_BUCKET_NAME, Key: user.avatar, Expires: 60};
      user.avatar = s3.getSignedUrl('getObject', params);
    }

    user.allAvatars = user.allAvatars.map(avatar => {
      let params = {Bucket: process.env.AWS_BUCKET_NAME, Key: avatar, Expires: 60};
      return s3.getSignedUrl('getObject', params);
    });
    
    user.allBanners = user.allBanners.map(banner => {
      let params = {Bucket: process.env.AWS_BUCKET_NAME, Key: banner, Expires: 60};
      return s3.getSignedUrl('getObject', params);
    });

    res.json({ user });
  } catch (error) {
    console.error('Error during getUserInfo:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

