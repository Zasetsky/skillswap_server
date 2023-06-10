const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  formType: {
    type: String,
    enum: ['form', 'form2'],
    required: true,
  },
  swapRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SwapRequest',
    required: true,
  },
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: true,
  },
  skill: {
    type: Object,
    required: true,
  },
  skillRating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
  },
  isLate: {
    type: Boolean,
    default: false,
  },
  comment: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Review', reviewSchema);
