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
        deal.form.meetingDate = formData1.meetingDate;
        deal.form.meetingTime = formData1.meetingTime;
        deal.form.meetingDuration = formData1.meetingDuration;
        deal.form2.meetingDate = formData2.meetingDate;
        deal.form2.meetingTime = formData2.meetingTime;
        deal.form2.meetingDuration = formData2.meetingDuration;
    
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

    socket.on("disconnect", () => {
      console.log("User disconnected from deal");
    });
  });
};

module.exports = socketChatController;
