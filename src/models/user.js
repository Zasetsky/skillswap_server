const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    default: '',
  },
  lastName: {
    type: String,
    default: '',
  },
  age: {
    type: Number,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  avatar: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
  },
  skillsToLearn: [
    {
      theme: String,
      category: String,
      subCategory: String,
      skill: String,
    },
  ],
  skillsToTeach: [
    {
      theme: String,
      category: String,
      subCategory: String,
      skill: String,
    },
  ],
  swapRequests: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        default: mongoose.Types.ObjectId,
      },
      senderData: {
        id: String,
        avatar: String,
        firstName: String,
        lastName: String,
        bio: String,
        skillsToLearn: Array,
        skillsToTeach: Array,
      },
      receiverData: {
        id: String,
        avatar: String,
        firstName: String,
        lastName: String,
        bio: String,
        skillsToLearn: Array,
        skillsToTeach: Array,
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'active', 'rejected', 'dealRejected', 'finished'],
        default: 'pending',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  availability: {
    type: String,
    default: '',
  },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
