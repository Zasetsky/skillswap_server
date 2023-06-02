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
    socket.on("createDeal", async (data) => {
      const { participants, requestId, chatId } = data;
    
      try {
        const swapRequest = await SwapRequest.findById(requestId);
    
        if (!swapRequest || swapRequest.status !== 'accepted') {
          throw new Error("SwapRequest not found or not in active state.");
        }
    
        if (swapRequest.dealId) {
          throw new Error("Cannot create deal, deal already exists for this swap request.");
        }
    
        const newDeal = new Deal({
          participants,
          chatId,
          swapRequestId: requestId,
        });
    
        await newDeal.save();
    
        const updateResult = await SwapRequest.findOneAndUpdate(
          { _id: requestId, version: swapRequest.version },
          { $set: { dealId: newDeal._id }, $inc: { version: 1 } },
          { new: true }
        );
    
        if (!updateResult) {
          throw new Error('Failed to update deal ID.');
        }
    
        for (let participant of participants) {
          io.to(participant.toString()).emit("swapRequestUpdated", updateResult);
        }
    
        socket.emit('newDeal', newDeal);
      } catch (error) {
        console.log(error);
        socket.emit("error", { message: "Error creating deal on server" });
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
          if (!deal.form.isCompleted) {
            deal.update.form = formData1;
          }
          if (!deal.form2.isCompleted) {
            deal.update.form2 = formData2;
          }
        };
    
        const form1Matches = Object.keys(formData1).every(field => formData1[field] === deal.form[field]);
        const form2Matches = Object.keys(formData2).every(field => formData2[field] === deal.form2[field]);
    
        if (deal.status === "not_started") {
          deal.status = "pending";
          if (!deal.form.isCompleted) {
            deal.form = formData1;
          }
          if (!deal.form2.isCompleted) {
            deal.form2 = formData2;
          }
        } else if (deal.status === "pending" || deal.status === "pending_update") {
          deal.status = "pending_update";
    
          if (!form1Matches || !form2Matches) {
            if (!deal.update.form.meetingDate && !deal.update.form.meetingTime && !deal.update.form.meetingDuration &&
                !deal.update.form2.meetingDate && !deal.update.form2.meetingTime && !deal.update.form2.meetingDuration) {
              updateForms();
            } else {
              if (!deal.form.isCompleted) {
                deal.form = deal.update.form;
              }
              if (!deal.form2.isCompleted) {
                deal.form2 = deal.update.form2;
              }
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
      const { dealId, formData1, formData2 } = data;
      console.log(data);
    
      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }
    
        deal.sender = socket.userId;
    
        const updateForms = () => {
          // Если обе формы не завершены, то используем данные из formData1 и formData2
          if (!deal.form.isCompleted && !deal.form2.isCompleted) {
            deal.update.form = formData1;
            deal.update.form2 = formData2;
          }
          // Если form завершена, то используем данные из formData1 для form2
          else if (deal.form.isCompleted && !deal.form2.isCompleted) {
            deal.update.form2 = formData1;
          }
          // Если form2 завершена, то используем данные из formData1 для form
          else if (!deal.form.isCompleted && deal.form2.isCompleted) {
            deal.update.form = formData1;
          }
        };
    
        const rescheduleForm1Matches = formData1 && Object.keys(formData1).every(field => formData1[field] === deal.form[field]);
        const rescheduleForm2Matches = formData2 && Object.keys(formData2).every(field => formData2[field] === deal.form2[field]);

        const starterStatuses = ['confirmed', 'half_completed', 'confirmed_reschedule', 'half_completed_confirmed_reschedule'].includes(deal.status);
    
        if (starterStatuses) {
          deal.previousStatus = deal.status;
          deal.status = 'reschedule_offer';
    
          updateForms();
    
        } else if (deal.status === 'reschedule_offer' || deal.status === 'reschedule_offer_update') {
          deal.status = 'reschedule_offer_update';
    
          if (!rescheduleForm1Matches || !rescheduleForm2Matches) {
            updateForms();
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
    
        if (deal.update.form.meetingDate && deal.update.form.meetingTime && deal.update.form.meetingDuration ||
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
        }

        const half_Completed_Statuses = ['half_completed', 'half_completed_confirmed_reschedule'] 

        await Deal.updateOne({ _id: dealId }, {
          $set: {
            status: half_Completed_Statuses.includes(deal.previousStatus)  ? 'half_completed_confirmed_reschedule' : 'confirmed_reschedule'
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


    // Отказ от переноса сделки
    socket.on("rejectReschedule", async (data) => {
      const { dealId } = data;

      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }
        
        let updateFields = {};

        if (deal.update.form.meetingDate && deal.update.form.meetingTime && deal.update.form.meetingDuration &&
          deal.update.form2.meetingDate && deal.update.form2.meetingTime && deal.update.form2.meetingDuration) {
          // Удаляем поле `update`
          updateFields = { $unset: { update: "" } };
        } else {
          // Удаляем поле `reschedule`
          updateFields = { $unset: { reschedule: "" } };
        }

        // Обновляем документ
        await Deal.updateOne({ _id: dealId }, updateFields);

        // Восстанавливаем статус сделки
        deal.status = deal.previousStatus;
        await deal.save();

        for (let participant of deal.participants) {
          io.to(participant.toString()).emit("deal", deal);
        }
      } catch (error) {
        socket.emit("error", { message: "Error rejecting rescheduled deal" });
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

        deal.cancellation.sender = socket.userId;
        deal.cancellation = { reason, status: "true", timestamp};

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
        deal.cancellation.status = "cancelled";
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

        deal.cancellation.status = "false";
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

        if (oldDeal.status !== "completed" && oldSwapRequest.status !== "completed") {
          return socket.emit("error", { message: "Deal and SwapRequest must be in 'completed' status to be continued" });
        }

        oldDeal.continuation.status = "continued";
        await oldDeal.save();
    
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
