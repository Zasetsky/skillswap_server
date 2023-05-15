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
  completedForm: [
    {
      type: String,
      enum: ['form', 'form2'],
      required: false,
    },
  ],
  status: {
    type: String,
    enum: [ 
      "not_started",
      "pending",
      "pending_update",
      "confirmed",
      "reschedule_offer",
      "reschedule_offer_update",
      "confirmed_reschedule",
      "cancelled",
      "in_progress",
      "half_completed",
      "half_completed_confirmed_reschedule",
      "completed",
    ],
    default: "not_started",
  },
  cancellation: {
    reason: {
      type: String,
      required: false,
    },
    timestamp: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", 'cancelled'],
    },
  },
  continuation: {
    status: {
      type: String,
      enum: ["true", "approved", "false"],
    },
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  form: {
    skill: {
      type: String,
      required: false,
    },
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
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  form2: {
    skill: {
      type: String,
      required: false,
    },
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
    isCompleted: {
        type: Boolean,
        default: false,
    },
  },
  update: {
    form: {
      skill: {
        type: String,
        required: false,
      },
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
      skill: {
        type: String,
        required: false,
      },
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
  reschedule: {
    form: {
      skill: {
        type: String,
        required: false,
      },
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
      skill: {
        type: String,
        required: false,
      },
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
  createdAt: {
    type: Date,
  },
});

module.exports = mongoose.model('Deal', dealSchema);