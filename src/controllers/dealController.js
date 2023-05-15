const Deal = require('../models/deal');
const User = require('../models/user');
const SwapRequest = require('../models/swapRequest');
const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');


const DealController = (io) => {
  io.use(socketAuthMiddleware).on("connection", (socket) => {
    console.log("User connected to deal");


    // Создание сделки
    socket.on("createOrGetCurrentDeal", async (data) => {
      const { participants, chatId, swapRequestId } = data;

      try {
          const existingDeal = await Deal.findOne({ chatId });
          const swapRequest = await SwapRequest.findById(swapRequestId);

          if (existingDeal) {
              socket.emit("deal", existingDeal);
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
        socket.emit("deal", deal);
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

        if (deal.status === 'confirmed') {
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
        socket.emit("deal", deal);
      } catch (error) {
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
              deal.form = deal.update.form;
              deal.form2 = deal.update.form2;

              await Deal.updateOne({ _id: dealId }, { $unset: { update: "" } });
          } else {
              deal.form = deal.reschedule.form;
              deal.form2 = deal.reschedule.form2;

              await Deal.updateOne({ _id: dealId }, { $unset: { reschedule: "" } });
          }

        deal.status = "confirmed_reschedule";

        await deal.save();
        socket.emit("rescheduleConfirmed", deal);
      } catch (error) {
        socket.emit("error", { message: "Error confirming reschedule" });
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
        const deal = await Deal.findOne({ chatId });

        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }

        socket.emit("currentDeal", deal);
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
        socket.emit("dealConfirmed", deal);
      } catch (error) {
        socket.emit("error", { message: "Error confirming deal" });
      }
    });


    // Запрос отмены
    socket.on("requestCancellation", async (data) => {
      const { dealId, reason, timestamp } = data;

      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Сделка не найдена" });
        }

        deal.sender = socket.userId;
        deal.cancellation = { reason, status: "pending", timestamp};

        await deal.save();
        socket.emit("cancellationRequested", deal);
      } catch (error) {
        socket.emit("error", { message: "Ошибка при запросе отмены" });
      }
    });


    // Подтверждение отмены
    socket.on("approveCancellation", async (data) => {
      const { dealId } = data;

      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Сделка не найдена" });
        }

        deal.status = "cancelled";
        deal.cancellation.status = "approved";
        await deal.save();
        socket.emit("cancellationApproved", deal);
      } catch (error) {
        socket.emit("error", { message: "Ошибка при подтверждении отмены" });
      }
    });


    // Отклонение отмены
    socket.on("rejectCancellation", async (data) => {
      const { dealId } = data;

      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Сделка не найдена" });
        }

        deal.cancellation.status = "rejected";
        await deal.save();
        socket.emit("cancellationRejected", deal);
      } catch (error) {
        socket.emit("error", { message: "Ошибка при отклонении отмены" });
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
        socket.emit("continuationRequested", deal);
      } catch (error) {
        socket.emit("error", { message: "Error requesting continuation" });
      }
    });


    // Подтверждение продолжения
    socket.on("approveContinuation", async (data) => {
      const { dealId } = data;
    
      try {
        const deal = await Deal.findById(dealId);
        const swapRequest = await SwapRequest.findOne({ dealId: dealId});
    
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }
    
        if (!swapRequest) {
          return socket.emit("error", { message: "SwapRequest not found" });
        }
    
        delete deal.completedForm;
        deal.continuation.status = "approved";
        deal.form.meetingDate = '';
        deal.form2.meetingDate = '';
        deal.form.isCompleted = false;
        deal.form2.isCompleted = false;
        deal.status = "not_started";
        swapRequest.status = "accepted"
    
        await deal.save();
        await swapRequest.save();
    
        const skillsToTeachId = swapRequest.senderData.skillsToTeach[0]._id;
        const skillsToLearnId = swapRequest.senderData.skillsToLearn[0]._id;
    
        for (let participant of deal.participants) {
          await User.updateMany(
            { 
              _id: participant, 
              'skillsToLearn._id': { $in: [skillsToTeachId, skillsToLearnId] } 
            },
            { 'skillsToLearn.$.isActive': true }
          );
    
          const updatedUser = await User.findById(participant);
          socket.emit('userUpdated', updatedUser);
        }
    
        socket.emit("continuationApproved", deal);
      } catch (error) {
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
        socket.emit("continuationRejected", deal);
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
