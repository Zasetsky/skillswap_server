const Deal = require('../models/deal');
const User = require('../models/user');
const Chat = require('../models/chat');
const meetingDetails = require('../helpers/meetingDetails');
const SwapRequest = require('../models/swapRequest');
const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');


const DealController = (io) => {
  io.use(socketAuthMiddleware).on("connection", (socket) => {
    console.log("User connected to deal");


    // Создание сделки
    socket.on("createOrGetCurrentDeal", async (data) => {
      const { participants, chatId, swapRequestId } = data;
    
      try {
        const existingDeal = await Deal.find({ chatId })
                                       .sort({ createdAt: -1 })
                                       .limit(1);
    
        const swapRequest = await SwapRequest.findById(swapRequestId);
    
        if (existingDeal && existingDeal.length > 0) {
            socket.emit("deal", existingDeal[0]);
        } else {
            const newDeal = new Deal({
                participants,
                chatId,
                swapRequestId,
            });
    
            await newDeal.save();
    
            swapRequest.dealId = newDeal._id;
            await swapRequest.save();
    
            socket.emit("deal", newDeal);
        }
      } catch (error) {
          socket.emit("error", { message: "Error creating or fetching deal" });
      }
    });
      

    // Обновление Сделки
    socket.on("updateDeal", async (data) => {
      const { dealId, formData1, formData2 } = data;

      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }

        deal.sender = socket.userId;

        const updateForms = () => {
          deal.update.form = formData1;
          deal.update.form2 = formData2;
        };

        const form1Matches = Object.keys(formData1).every(field => formData1[field] === deal.form[field]);
        const form2Matches = Object.keys(formData2).every(field => formData2[field] === deal.form2[field]);

        if (deal.status === "not_started" || deal.status === "in_progress") {
          deal.status = "pending";
          deal.form = formData1;
          deal.form2 = formData2;
        } else if (deal.status === "pending" || deal.status === "pending_update") {
          deal.status = "pending_update";

          if (!form1Matches || !form2Matches) {
            if (!deal.update.form.meetingDate && !deal.update.form.meetingTime && !deal.update.form.meetingDuration &&
                !deal.update.form2.meetingDate && !deal.update.form2.meetingTime && !deal.update.form2.meetingDuration) {
              updateForms();
            } else {
              deal.form = deal.update.form;
              deal.form2 = deal.update.form2;
              updateForms();
            }
          }
        }
    
        await deal.save();
        for (let participant of deal.participants) {
          io.to(participant.toString()).emit("deal", deal);
        }
      } catch (error) {
        socket.emit("error", { message: "Error updating deal" });
      }
    });
    
    

    // Предложение переноса Сделки
    socket.on("proposeReschedule", async (data) => {
      const { dealId, rescheduleFormData1, rescheduleFormData2 } = data;

      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }

        deal.sender = socket.userId;

        const updateForms = () => {
          deal.update.form = rescheduleFormData1;
          deal.update.form2 = rescheduleFormData2;
        };

        const rescheduleForm1Matches = deal.reschedule.form && Object.keys(rescheduleFormData1).every(field => rescheduleFormData1[field] === deal.reschedule.form[field]);
        const rescheduleForm2Matches = deal.reschedule.form2 && Object.keys(rescheduleFormData2).every(field => rescheduleFormData2[field] === deal.reschedule.form2[field]);

        const starterStatuses = ['confirmed', 'half_completed', 'confirmed_reschedule', 'half_completed_confirmed_reschedule'].includes(deal.status);

        if (starterStatuses) {
          deal.previousStatus = deal.status;
          deal.status = 'reschedule_offer';

          deal.reschedule.form = rescheduleFormData1;
          deal.reschedule.form2 = rescheduleFormData2;

        } else if (deal.status === 'reschedule_offer' || deal.status === 'reschedule_offer_update') {
          deal.status = 'reschedule_offer_update';

          if (!rescheduleForm1Matches || !rescheduleForm2Matches) {
            if (!deal.update.form.meetingDate && !deal.update.form.meetingTime && !deal.update.form.meetingDuration &&
                !deal.update.form2.meetingDate && !deal.update.form2.meetingTime && !deal.update.form2.meetingDuration) {
              updateForms();
            } else {
              deal.reschedule.form = deal.update.form;
              deal.reschedule.form2 = deal.update.form2;
              updateForms();
            }
          } 
        }

        await deal.save();

        for (let participant of deal.participants) {
          io.to(participant.toString()).emit("deal", deal);
        }
      } catch (error) {
        console.log(error);
        socket.emit("error", { message: "Error proposing reschedule" });
      }
    });


    // Подтверждение переноса сделки
    socket.on("confirmReschedule", async (data) => {
      const { dealId } = data;

      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }
    
        if (deal.update.form.meetingDate && deal.update.form.meetingTime && deal.update.form.meetingDuration &&
            deal.update.form2.meetingDate && deal.update.form2.meetingTime && deal.update.form2.meetingDuration) {
    
          await Deal.updateOne({ _id: dealId }, { 
            $set: { 
              'form.meetingDate': deal.update.form.meetingDate, 
              'form.meetingTime': deal.update.form.meetingTime, 
              'form.meetingDuration': deal.update.form.meetingDuration,
              'form2.meetingDate': deal.update.form2.meetingDate, 
              'form2.meetingTime': deal.update.form2.meetingTime, 
              'form2.meetingDuration': deal.update.form2.meetingDuration
            },
            $unset: { update: "" }
          });
        } else {
          await Deal.updateOne({ _id: dealId }, { 
            $set: { 
              'form.meetingDate': deal.reschedule.form.meetingDate, 
              'form.meetingTime': deal.reschedule.form.meetingTime, 
              'form.meetingDuration': deal.reschedule.form.meetingDuration,
              'form2.meetingDate': deal.reschedule.form2.meetingDate, 
              'form2.meetingTime': deal.reschedule.form2.meetingTime, 
              'form2.meetingDuration': deal.reschedule.form2.meetingDuration
            },
            $unset: { reschedule: "" }
          });
        }

        await Deal.updateOne({ _id: dealId }, {
          $set: {
            status: deal.previousStatus === 'half_completed' ? 'half_completed_confirmed_reschedule' : 'confirmed_reschedule'
          }
        });
    
        const updatedDeal = await Deal.findById(dealId);
        const swapRequest = await SwapRequest.findById(updatedDeal.swapRequestId);

        meetingDetails.sendMeetingDetails(updatedDeal, updatedDeal.chatId, swapRequest, io);

        for (let participant of deal.participants) {
          io.to(participant.toString()).emit("rescheduleConfirmed", updatedDeal);
        }
      } catch (error) {
        socket.emit("error", { message: "Error confirming reschedule" });
      }
    });


    socket.on("rejectReschedule", async (data) => {
      const { dealId } = data;

      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }

        deal.status = deal.previousStatus;
        await deal.save();

        for (let participant of deal.participants) {
          io.to(participant.toString()).emit("deal", deal);
        }
      } catch (error) {
        socket.emit("error", { message: "Error rejectCancellation deal" });
      }
    });


    // Запрос всех сделок пользователя
    socket.on("getAllDeals", async () => {
      try {
        const deals = await Deal.find({ participants: socket.userId });
        socket.emit("allDeals", deals);
      } catch (error) {
        socket.emit("error", { message: "Error fetching all deals" });
      }
    });


    // Запрос текущей сделки
    socket.on("getCurrentDeal", async (data) => {
      const { chatId } = data;

      try {
        const deal = await Deal.find({ chatId })
                               .sort({ createdAt: -1 })
                               .limit(1);

        if (!deal || deal.length === 0) {
          return socket.emit("error", { message: "Deal not found" });
        }

        socket.emit("currentDeal", deal[0]);
      } catch (error) {
        socket.emit("error", { message: "Error fetching current deal" });
      }
    });



    // Подтверждение сделки
    socket.on("confirmDeal", async (data) => {
      const { dealId } = data;
    
      try {
        const deal = await Deal.findById(dealId);

        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }
        
        if (deal.update.form.meetingDate && deal.update.form.meetingTime && deal.update.form.meetingDuration &&
            deal.update.form2.meetingDate && deal.update.form2.meetingTime && deal.update.form2.meetingDuration) {
              deal.form = deal.update.form;
              deal.form2 = deal.update.form2;

              await Deal.updateOne({ _id: dealId }, { $unset: { update: "" } });
          }

        deal.status = "confirmed";
        deal.createdAt = new Date();
    
        await deal.save();
        const swapRequest = await SwapRequest.findById(deal.swapRequestId);

        meetingDetails.sendMeetingDetails(deal, deal.chatId, swapRequest, io);

        for (let participant of deal.participants) {
          io.to(participant.toString()).emit("dealConfirmed", deal);
        }
      } catch (error) {
        console.log(error);
        socket.emit("error", { message: "Error confirming deal" });
      }
    });


    // Запрос отмены
    socket.on("requestCancellation", async (data) => {
      const { dealId, reason, timestamp } = data;

      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }

        deal.sender = socket.userId;
        deal.cancellation = { reason, status: "pending", timestamp};

        await deal.save();

        for (let participant of deal.participants) {
          io.to(participant.toString()).emit("cancellationRequested", deal);
        }
        
      } catch (error) {
        socket.emit("error", { message: "Error requestCancellation deal" });
      }
    });


    // Подтверждение отмены
    socket.on("approveCancellation", async (data) => {
      const { dealId } = data;
    
      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }
    
        const swapRequest = await SwapRequest.findById(deal.swapRequestId);
        if (!swapRequest) {
          return socket.emit("error", { message: "SwapRequest not found" });
        }
    
        if (deal.status === 'cancelled' || swapRequest.status === 'cancelled') {
          return socket.emit("error", { message: "Deal or SwapRequest is already cancelled" });
        }
    
        deal.status = "cancelled";
        swapRequest.status = "cancelled";
        deal.cancellation.status = "approved";
        await swapRequest.save();
        await deal.save();
    
        for (let participant of deal.participants) {
          io.to(participant.toString()).emit("cancellationApproved", deal);
          io.to(participant.toString()).emit('swapRequestUpdated', swapRequest);
        }
    
      } catch (error) {
        console.error(error);
        socket.emit("error", { message: "Error approveCancellation deal" });
      }
    });    


    // Отклонение отмены
    socket.on("rejectCancellation", async (data) => {
      const { dealId } = data;

      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }

        deal.cancellation.status = "rejected";
        await deal.save();

        for (let participant of deal.participants) {
          io.to(participant.toString()).emit("cancellationRequested", deal);
        }
      } catch (error) {
        socket.emit("error", { message: "Error rejectCancellation deal" });
      }
    });


    // Запрос на продолжение
    socket.on("requestContinuation", async (data) => {
      const { dealId } = data;
    
      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }
    
        deal.sender = socket.userId;
        deal.continuation.status = "true";
    
        await deal.save();

        for (let participant of deal.participants) {
          io.to(participant.toString()).emit("continuationRequested", deal);
        }
      } catch (error) {
        socket.emit("error", { message: "Error requesting continuation" });
      }
    });


    // Подтверждение продолжения
    socket.on("approveContinuation", async (data) => {
      const { dealId } = data;
    
      try {
        const oldDeal = await Deal.findById(dealId);
        const oldSwapRequest = await SwapRequest.findOne({ dealId: dealId });
    
        if (!oldDeal) {
          return socket.emit("error", { message: "Deal not found" });
        }
    
        if (!oldSwapRequest) {
          return socket.emit("error", { message: "SwapRequest not found" });
        }
    
        // Создаем новый SwapRequest
        let swapRequestData = {...oldSwapRequest._doc};
        delete swapRequestData._id;
    
        const newSwapRequest = new SwapRequest({
          ...swapRequestData,
          status: 'accepted',
          createdAt: Date.now(),
        });
        await newSwapRequest.save();

        // Создаем новую сделку
        const newDeal = new Deal({
          participants: oldDeal.participants,
          chatId: oldDeal.chatId,
          swapRequestId: newSwapRequest._id,
          form: {
            meetingTime: oldDeal.form.meetingTime,
            meetingDuration: oldDeal.form.meetingDuration,
          },
          form2: {
            meetingTime: oldDeal.form2.meetingTime,
            meetingDuration: oldDeal.form2.meetingDuration,
          },
          createdAt: Date.now(),
        });
        await newDeal.save();

        newSwapRequest.dealId = newDeal._id;
        await newSwapRequest.save();

        const chat = await Chat.findOne({ _id: oldDeal.chatId });

        if (chat) {
          chat.swapRequestIds.push(newSwapRequest._id);
          await chat.save();
        }
    
        const skillsToTeachId = oldSwapRequest.senderData.skillsToTeach[0]._id;
        const skillsToLearnId = oldSwapRequest.senderData.skillsToLearn[0]._id;
    
        for (let participant of oldDeal.participants) {
          await User.updateMany(
            { 
              _id: participant, 
              'skillsToLearn._id': { $in: [skillsToTeachId, skillsToLearnId] } 
            },
            { 'skillsToLearn.$.isActive': true }
          );
    
          const updatedUser = await User.findById(participant);

          io.to(participant.toString()).emit('userUpdated', updatedUser);
          io.to(participant.toString()).emit("continuationApproved", newDeal);
        }
      } catch (error) {
        console.error(error);
        socket.emit("error", { message: "Error approving continuation" });
      }
    });
    


    // Отклонение продолжения
    socket.on("rejectContinuation", async (data) => {
      const { dealId } = data;
    
      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }
    
        deal.continuation.status = "false";
        await deal.save();

        for (let participant of deal.participants) {
          io.to(participant.toString()).emit("continuationRequested", deal);
        }
      } catch (error) {
        socket.emit("error", { message: "Error approving continuation" });
      }
    });    


    socket.on("disconnect", () => {
      console.log("User disconnected from deal");
    });
  });
};

module.exports = DealController;
