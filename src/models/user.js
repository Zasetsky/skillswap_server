const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  karma: {
    type: Number,
    default: 100,
  },
  firstname: {
    type: String,
    default: '',
  },
  lastname: {
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
      level: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"]
      },
    },
  ],
  skillsToTeach: [
    {
      theme: String,
      category: String,
      subCategory: String,
      skill: String,
      level: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"]
      },
      rating: {
        type: Number,
        default: 0,
      },
      isRated: {
        type: Boolean,
        default: false,
      }
    },
  ],
  reliabilityRating: {
    type: Number,
    default: 5,
    min: 0,
    max: 5,
  },
  loyaltyRating : {
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
  lastSeen: {
    type: Date,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  timeZoneOffset: {
    type: Number,
    default: 0,
  },
  isPreSetup: {
    type: Boolean,
    default: false,
  }
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
