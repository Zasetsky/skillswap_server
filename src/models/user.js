const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  karma: {
    type: Number,
    default: 100,
  },
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
      isActive: Boolean,
    },
  ],
  skillsToTeach: [
    {
      theme: String,
      category: String,
      subCategory: String,
      skill: String,
      rating: {
        type: Number,
        default: 0,
      },
    },
  ],
  reliabilityRating: {
    type: Number,
    default: 5,
    min: 0,
    max: 5,
  },
  engagementRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalSkillsRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
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
