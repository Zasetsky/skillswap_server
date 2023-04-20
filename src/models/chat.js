const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  ],
  swapRequestId: {
    type: String,
    required: true,
  },
  messages: [
    {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      type: {
        type: String,
        default: 'text',
      },
      content: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  deal: {
    status: {
      type: String,
      enum: ["not_started", "pending", "confirmed", "finished", "cancelled", "in_progress", "completed"],
      default: "not_started",
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    form: {
      meetingDate: {
        type: String,
        required: false,
      },
      meetingTime: {
        type: String,
        required: false,
      },
      meetingDuration: {
        type: String,
        required: false,
      },
    },
    form2: {
      meetingDate: {
        type: String,
        required: false,
      },
      meetingTime: {
        type: String,
        required: false,
      },
      meetingDuration: {
        type: String,
        required: false,
      },
    },
  },
});

module.exports = mongoose.model('Chat', chatSchema);