const Chat = require('../models/chat');

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
          chatId: chatId,
          type: 'meeting_details',
          content: meetingDetails,
          sender: meetingDetails === deal.form
            ? swapRequest.receiverId
            : swapRequest.senderId
        };

        // console.log(newMessage);
  
        await Chat.findByIdAndUpdate(
          chatId,
          { $push: { messages: newMessage } },
          { new: true }
        );
  
        for (let participant of deal.participants) {
          io.to(participant.toString()).emit("message", chatId);
        }
  
      } else {
        console.warn("No meeting details found");
      }
    } catch (error) {
      console.error("Error sending meeting details:", error);
    }
  };
  