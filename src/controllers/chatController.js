const Chat = require('../models/chat');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const zoomApiKey = process.env.ZOOM_API_KEY;
const zoomApiSecret = process.env.ZOOM_API_SECRET;
const zoomUserId = process.env.ZOOM_USER_ID;

function generateZoomToken(apiKey, apiSecret) {
  const payload = {
    iss: apiKey,
    exp: Date.now() + 60 * 60 * 1000, // Token expires in 1 hour
  };

  const token = jwt.sign(payload, apiSecret);
  return token;
}

async function createZoomMeeting(meetingDate, meetingTime, meetingDuration, userId, token) {
  const url = `https://api.zoom.us/v2/users/${userId}/meetings`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const meetingDateTime = new Date(meetingDate + 'T' + meetingTime);

  const data = {
    topic: 'SkillSwap Meeting',
    type: 2,
    start_time: meetingDateTime.toISOString(),
    duration: meetingDuration,
    timezone: 'GMT',
    password: 'your_meeting_password',
  };

  try {
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('Error creating Zoom meeting:', error);
    return null;
  }
}

async function getZoomMeetingParticipants(meetingId, token) {
  const url = `https://api.zoom.us/v2/report/meetings/${meetingId}/participants`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  try {
    const response = await axios.get(url, { headers });
    return response.data.participants;
  } catch (error) {
    console.error('Error getting Zoom meeting participants:', error);
    return null;
  }
}

async function updateZoomMeeting(meetingId, zoomToken, updateData) {
  const url = `https://api.zoom.us/v2/meetings/${meetingId}`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${zoomToken}`,
  };

  try {
    const response = await axios.patch(url, updateData, { headers });
    return response.data;
  } catch (error) {
    console.error('Error updating Zoom meeting:', error);
    return null;
  }
}

exports.confirmDeal = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    chat.deal.status = "confirmed";
    
    const zoomToken = generateZoomToken(zoomApiKey, zoomApiSecret);
    const zoomMeeting = await createZoomMeeting(
      chat.deal.form.meetingDate,
      chat.deal.form.meetingTime,
      chat.deal.form.meetingDuration,
      zoomUserId,
      zoomToken
    );
    
    // Save the zoomMeetingId to the chat deal
    chat.deal.zoomMeetingId = zoomMeeting.id;
    await chat.save();
    
    res.status(200).json({ message: "Deal confirmed", zoomMeeting: {
      join_url: zoomMeeting.join_url,
      password: 'your_meeting_password',
      },
    });
  } catch (error) {
    console.error("Error confirming deal:", error);
    res.status(500).json({ error: "Error confirming deal" });
  }
};

exports.checkMeetingAttendance = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const zoomToken = generateZoomToken(zoomApiKey, zoomApiSecret);
    const participants = await getZoomMeetingParticipants(chat.deal.zoomMeetingId, zoomToken);

    if (!participants) {
      return res.status(500).json({ error: "Error getting Zoom meeting participants" });
    }

    const meetingDuration = parseInt(chat.deal.form.meetingDuration, 10);
    const checkInTime = Math.min(meetingDuration / 5, 15);

    const attendedParticipants = participants.filter((participant) => {
      const joinTime = new Date(participant.join_time);
      const leaveTime = new Date(participant.leave_time);
      const duration = (leaveTime - joinTime) / 60000; // Convert to minutes
      const meetingStartTime = new Date(chat.deal.form.meetingDate + 'T' + chat.deal.form.meetingTime);

      return (
        chat.deal.zoomParticipants.includes(participant.user_id) &&
        joinTime <= new Date(meetingStartTime.getTime() + checkInTime * 60000) &&
        duration >= meetingDuration - checkInTime
      );
    });

    const allParticipantsAttended =
      attendedParticipants.length === chat.deal.zoomParticipants.length;

    if (allParticipantsAttended && chat.deal.status === "confirmed") {
      const updateData = {
        start_time: chat.deal.form2.meetingDate + 'T' + chat.deal.form2.meetingTime,
        duration: chat.deal.form.meetingDuration,
      };

      const updatedMeeting = await updateZoomMeeting(chat.deal.zoomMeetingId, zoomToken, updateData);

      if (updatedMeeting) {
        chat.deal.status = "updated";
      } else {
        return res.status(500).json({ error: "Error updating Zoom meeting" });
      }
    }

    await chat.save();
    res.status(200).json({ allParticipantsAttended, status: chat.deal.status });
  } catch (error) {
    console.error("Error checking meeting attendance:", error);
    res.status(500).json({ error: "Error checking meeting attendance" });
  }
};


exports.createChat = async (req, res) => {
  const { senderId, skillId } = req.body;
  const currentUserId = req.userId

  try {
    const existingChat = await Chat.findOne({
      participants: { $all: [currentUserId, senderId] },
    });

    if (existingChat) {
      return res.status(200).json({ chat: existingChat });
    }

    const newChat = await Chat.create({
      participants: [currentUserId, senderId],
      skillId: skillId,
      messages: [
        {
          sender: senderId,
          content: `Привет, я хочу обменяться с тобой навыками!`,
        },
      ],
    });

    res.status(201).json({ chat: newChat });
  } catch (error) {
    res.status(500).json({ message: 'Error creating chat', error });
  }
};

exports.sendMessage = async (req, res) => {
  const { chatId, content } = req.body;

  try {
    // Создаем новое сообщение
    const newMessage = {
      _id: new mongoose.Types.ObjectId(),
      sender: req.userId,
      type: content.type || 'text',
      content: content.type === 'deal_proposal' ? content : content.text,
    };

    // Обновляем чат, добавляя новое сообщение
    await Chat.findByIdAndUpdate(
      chatId,
      { $push: { messages: newMessage } },
      { new: true }
    );

    // Отправляем только новое сообщение обратно клиенту
    res.status(200).json({ message: newMessage });
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error });
  }
};

exports.getMessages = async (req, res) => {
  const { chatId } = req.params;

  try {
    const chat = await Chat.findById(chatId).populate('messages.sender', 'firstName lastName avatar');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.status(200).json({ chat });
  } catch (error) {
    res.status(500).json({ message: 'Error getting messages', error });
  }
};

exports.updateDeal = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const { status, senderId, formData } = req.body;
    console.log(formData);
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    chat.deal.status = status;
    chat.deal.sender = senderId;
    chat.deal.form.meetingDate = formData.meetingDate;
    chat.deal.form.meetingTime = formData.meetingTime;
    chat.deal.form.meetingDuration = formData.meetingDuration;
    
    await chat.save();
    res.status(200).json(chat.deal);
  } catch (error) {
    console.error("Error updating deal:", error);
    res.status(500).json({ error: "Error updating deal" });
  }
};
