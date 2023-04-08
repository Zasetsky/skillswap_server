const mongoose = require('mongoose');
const User = require('../models/user');

exports.findMatchingUsers = async (req, res) => {
  try {
    const skillId = req.body.skillId;
    const currentUserId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(skillId)) {
      return res.status(400).json({ message: 'Invalid skill ID' });
    }

    const matchingUsers = await User.find({
      _id: { $ne: currentUserId },
      'skillsToTeach._id': skillId,
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
