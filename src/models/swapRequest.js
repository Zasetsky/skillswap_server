const mongoose = require('mongoose');

const swapRequestSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  chatId: {
    type: String,
    required: false,
  },
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal'
  },
  senderData: {
    avatar: String,
    firstname: String,
    lastname: String,
    bio: String,
    skillsToLearn: Array,
    skillsToTeach: Array,
  },
  receiverData: {
    avatar: String,
    firstname: String,
    lastname: String,
    bio: String,
    skillsToLearn: Array,
    skillsToTeach: Array,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
    default: 'pending',
  },
  version: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  acceptAt: Date
});

module.exports = mongoose.model('SwapRequest', swapRequestSchema);
