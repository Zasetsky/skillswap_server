const Deal = require('../models/deal');
const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');


const DealController = (io) => {
  io.use(socketAuthMiddleware).on("connection", (socket) => {
    console.log("User connected to deal");

    // Создание сделки
    socket.on("createOrGetCurrentDeal", async (data) => {
      const { participants, chatId, swapRequestId } = data;

      try {
          // Проверяем, существует ли сделка с данным chatId
          const existingDeal = await Deal.findOne({ chatId });
          // Если существует, возвращаем её
          if (existingDeal) {
              socket.emit("deal", existingDeal);
          } else {
              // В противном случае создаем новую сделку
              const newDeal = new Deal({
                  participants,
                  chatId,
                  swapRequestId,
              });
  
              await newDeal.save();
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
    
        if (deal.status === "not_started" || deal.status === "in_progress") {
          deal.status = "pending";
          deal.form = formData1;
          deal.form2 = formData2;
        } else if (deal.status === "pending" || deal.status === "pending_update") {
          deal.status = "pending_update";
          const form1Matches = Object.keys(formData1).every(field => formData1[field] === deal.form[field]);
          const form2Matches = Object.keys(formData2).every(field => formData2[field] === deal.form2[field]);
    
          if (!form1Matches || !form2Matches) {
            if (!deal.update.form.meetingDate && !deal.update.form.meetingTime && !deal.update.form.meetingDuration &&
                !deal.update.form2.meetingDate && !deal.update.form2.meetingTime && !deal.update.form2.meetingDuration) {
              deal.update.form = formData1;
              deal.update.form2 = formData2;
            } else {
              deal.form = deal.update.form;
              deal.form2 = deal.update.form2;

              deal.update.form = formData1;
              deal.update.form2 = formData2;
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

        const rescheduleForm1Matches = deal.reschedule.form && Object.keys(rescheduleFormData1).every(field => rescheduleFormData1[field] === deal.reschedule.form[field]);
        const rescheduleForm2Matches = deal.reschedule.form2 && Object.keys(rescheduleFormData2).every(field => rescheduleFormData2[field] === deal.reschedule.form2[field]);

        if (deal.status === 'confirmed') {
          deal.status = 'reschedule_first_offer';

          deal.reschedule.form = rescheduleFormData1;
          deal.reschedule.form2 = rescheduleFormData2;
        } else if (deal.status === 'reschedule_first_offer' || deal.status === "reschedule_offer") {
          deal.status = 'reschedule_offer';
          if (!rescheduleForm1Matches || !rescheduleForm2Matches) {
            if (deal.update.form.meetingDate && deal.update.form.meetingTime && deal.update.form.meetingDuration &&
                deal.update.form2.meetingDate && deal.update.form2.meetingTime && deal.update.form2.meetingDuration) {
              deal.form = deal.reschedule.form;
              deal.form2 = deal.reschedule.form2;

              deal.reschedule.form = rescheduleFormData1;
              deal.reschedule.form2 = rescheduleFormData2;
            } else {
              deal.status = 'reschedule_offer_update';

              deal.update.form = deal.reschedule.form;
              deal.update.form2 = deal.reschedule.form2;

              deal.reschedule.form = rescheduleFormData1;
              deal.reschedule.form2 = rescheduleFormData2;
            }
          } 
        } else {
          if (!rescheduleForm1Matches || !rescheduleForm2Matches) {
            deal.update.form = deal.reschedule.form;
            deal.update.form2 = deal.reschedule.form2;

            deal.reschedule.form = rescheduleFormData1;
            deal.reschedule.form2 = rescheduleFormData2;
          }  
        }

        await deal.save();
        socket.emit("deal", deal);
      } catch (error) {
        socket.emit("error", { message: "Error proposing reschedule" });
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

    socket.on("confirmDeal", async (data) => {
      const { dealId } = data;
    
      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }
    
        deal.status = "confirmed";
    
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

    socket.on("disconnect", () => {
      console.log("User disconnected from deal");
    });
  });
};

module.exports = DealController;
