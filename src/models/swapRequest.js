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
  senderData: {
    avatar: String,
    firstName: String,
    lastName: String,
    bio: String,
    skillsToLearn: Array,
    skillsToTeach: Array,
  },
  receiverData: {
    avatar: String,
    firstName: String,
    lastName: String,
    bio: String,
    skillsToLearn: Array,
    skillsToTeach: Array,
  },
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('SwapRequest', swapRequestSchema);
