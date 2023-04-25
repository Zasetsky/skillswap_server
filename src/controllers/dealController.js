const Deal = require('../models/deal');
const authMiddleware = require('../middlewares/authMiddleware');


const socketAuthMiddleware = (socket, next) => {
  const req = {
    headers: {
      authorization: socket.handshake.headers.authorization
    }
  };
  const res = {
    status: (code) => ({ json: (message) => ({ code, message }) }),
  };

  authMiddleware(req, res, (err) => {
    if (err) {
      return next(new Error('Unauthorized'));
    }

    socket.userId = req.userId;
    next();
  });
};


const socketChatController = (io) => {
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
      const { dealId, status, senderId, formData1, formData2 } = data;
    
      try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
          return socket.emit("error", { message: "Deal not found" });
        }
    
        deal.status = status;
        deal.sender = senderId;
    
        if (status === 'pending') {
          deal.form = formData1;
          deal.form2 = formData2;
        } else if (status === 'pending_update') {
          const form1Matches = Object.keys(formData1).every(field => formData1[field] === deal.form[field]);
          const form2Matches = Object.keys(formData2).every(field => formData2[field] === deal.form2[field]);
    
          if (!form1Matches || !form2Matches) {
            console.log('before', deal.form);
            if (!deal.update.form.meetingDate && !deal.update.form.meetingTime && !deal.update.form.meetingDuration &&
                !deal.update.form2.meetingDate && !deal.update.form2.meetingTime && !deal.update.form2.meetingDuration) {
              deal.update = { form: {}, form2: {} };
            } else {
              deal.form = deal.update.form;
              deal.form2 = deal.update.form2;
              console.log('call');
            }
            console.log('after', deal.form);
            deal.update.form = formData1;
            deal.update.form2 = formData2;
          }
        }
    
        await deal.save();
        socket.emit("deal", deal);
      } catch (error) {
        socket.emit("error", { message: "Error updating deal" });
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

    socket.on("disconnect", () => {
      console.log("User disconnected from deal");
    });
  });
};

module.exports = socketChatController;
