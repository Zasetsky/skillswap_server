const Chat = require('../models/chat');
const mongoose = require('mongoose');

getMeetingDetails = (deal) => {
    if (deal.form && deal.form2) {
      let form1DateTime = new Date(`${deal.form.meetingDate}T${deal.form.meetingTime}`);
      let form2DateTime = new Date(`${deal.form2.meetingDate}T${deal.form2.meetingTime}`);
  
      // Добавляем минуту к времени встреч
      form1DateTime.setMinutes(form1DateTime.getMinutes() + 1);
      form2DateTime.setMinutes(form2DateTime.getMinutes() + 1);
  
      let now = new Date();
      // Округление текущего времени до минут
      now.setMilliseconds(0);
      now.setSeconds(0);
  
      if (form1DateTime <= now && form2DateTime <= now) {
        return null;
      }
  
      if (form1DateTime <= now) {
        return deal.form2;
      }
      if (form2DateTime <= now) {
        return deal.form;
      }
  
      const form1Difference = Math.abs(now - form1DateTime);
      const form2Difference = Math.abs(now - form2DateTime);
  
      return form1Difference < form2Difference ? deal.form : deal.form2;
    } else {
      return null;
    }
  };
  
exports.sendMeetingDetails = async (deal, chatId, swapRequest, io) => {
  try {
    const meetingDetails = getMeetingDetails(deal);

    if (meetingDetails) {
      const newMessage = {
        _id: new mongoose.Types.ObjectId(),
        sender: new mongoose.Types.ObjectId(
          meetingDetails === deal.form
            ? swapRequest.receiverId
            : swapRequest.senderId
        ),
        type: 'meeting_details',
        content: meetingDetails,
        chatId: chatId,
        createdAt: new Date(),
      };

      const chat = await Chat.findById(chatId);

      if (!chat) {
        console.error("Chat not found");
        return;
      }

      chat.messages.push(newMessage);

      await chat.save();

      for (let participant of deal.participants) {
        io.to(participant.toString()).emit("message", newMessage);
      }

    } else {
      console.warn("No meeting details found");
    }
  } catch (error) {
    console.error("Error sending meeting details:", error);
  }
};
  