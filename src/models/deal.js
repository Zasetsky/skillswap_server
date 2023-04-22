const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
    participants: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
    ],
    chatId: {
        type: String,
        required: true,
    },
    swapRequestId: {
        type: String,
        required: true,
    },
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
});

module.exports = mongoose.model('Deal', dealSchema);