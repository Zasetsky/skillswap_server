const SwapRequest = require('../models/swapRequest');
const User = require('../models/user');
const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');

const swapRequestController = (io) => {
  io.use(socketAuthMiddleware).on("connection", (socket) => {
    console.log("User connected to swap requests");

    // Отправка запроса на обмен
    socket.on("sendSwapRequest", async (data) => {
      const { receiverId, senderId, senderData, receiverData } = data;
      
      try {
        // Создаем новый объект запроса на обмен для получателя с новым ObjectId
        const newSwapRequest = new SwapRequest({
          senderId,
          receiverId,
          senderData,
          receiverData,
          status: "pending",
        });

        await newSwapRequest.save();

        // Найти пользователя и обновить isActive для соответствующего навыка
        const skillId = receiverData.skillsToLearn._id;

        await User.updateOne({ _id: senderId, "skillsToLearn._id": skillId }, { $set: { "skillsToLearn.$.isActive": true } });
        
        // Отправляем уведомление об успешной отправке запроса на обмен
        io.to(receiverId).emit("swapRequestSent", { status: 200, message: "Swap request received successfully" });
        io.to(senderId).emit("swapRequestSent", { status: 200, message: "Swap request sent successfully" });

      } catch (error) {
        console.error("Error sending swap request:", error);
        socket.emit("swapRequestError", { status: 500, error: "Error sending swap request" });
      }
    });


    // Принять запрос на обмен
    socket.on("acceptSwapRequest", async (data) => {
      try {
        const { swapRequestId, chosenSkill } = data;

        // Найти запрос на обмен с заданным swapRequestId и обновить статус на "accepted"
        const swapRequest = await SwapRequest.findById(swapRequestId);
        if (!swapRequest) {
          return socket.emit("swapRequestError", { status: 404, message: 'Swap request not found' });
        }
        swapRequest.status = 'accepted';

        // Обновить skillsToTeach у получателя
        swapRequest.receiverData.skillsToTeach = [chosenSkill];

        // Обновить skillsToTeach у отправителя, оставив только chosenSkill
        swapRequest.senderData.skillsToTeach = swapRequest.senderData.skillsToTeach.filter(skill => {
          return skill._id.toString() === chosenSkill._id.toString();
        });

        // Найти пользователя и обновить isActive для соответствующего навыка
        await User.updateOne({ _id: swapRequest.receiverId, "skillsToLearn._id": chosenSkill._id }, { $set: { "skillsToLearn.$.isActive": true } });

        await swapRequest.save();

        io.to(swapRequest.receiverId.toString()).emit("swapRequestAccepted", { status: 200, message: 'Swap request accepted' });
        io.to(swapRequest.senderId.toString()).emit("swapRequestAccepted", { status: 200, message: 'Swap request accepted' });
      } catch (error) {
        console.error('Error in acceptSwapRequest:', error);
        socket.emit("acceptSwapRequestError", { status: 500, message: 'Server error', error });
      }
    });


    // Отклонить запрос на обмен
    socket.on("rejectSwapRequest", async (data) => {
      try {
        const { swapRequestId } = data;
    
        if (!swapRequestId) {
          return socket.emit("rejectSwapRequestError", { status: 400, error: "Not Found swapRequests _id" });
        }
    
        const swapRequest = await SwapRequest.findById(swapRequestId);
        if (!swapRequest) {
          return socket.emit("rejectSwapRequestError", { status: 404, error: "Swap request not found" });
        }
    
        // Получаем _id умения
        const skillId = swapRequest.receiverData.skillsToLearn[0]._id;
    
        // Обновляем пользователя отправителя, меняя isActive на false для соответствующего умения
        await User.updateOne({ _id: swapRequest.senderId, "skillsToLearn._id": skillId }, { $set: { "skillsToLearn.$.isActive": false } });
    
        // Обновляем пользователя получателя, меняя isActive на false для соответствующего умения
        await User.updateOne({ _id: swapRequest.receiverId, "skillsToLearn._id": skillId }, { $set: { "skillsToLearn.$.isActive": false } });
    
        swapRequest.status = "rejected";
        await swapRequest.save();
    
        io.to(swapRequest.receiverId.toString()).emit("swapRequestRejected", { status: 200, message: "SwapRequest statuses changed on'rejected'" });
        io.to(swapRequest.senderId.toString()).emit("swapRequestRejected", { status: 200, message: "SwapRequest statuses changed on'rejected'" });
      } catch (error) {
        console.error(error);
        socket.emit("rejectSwapRequestError", { status: 500, error: "Error rejecting swap request" });
      }
    });


    // Удалить запрос на обмен
    socket.on("deleteSwapRequest", async (data) => {
      try {
        const { requestId } = data;
        console.log("Удаляем запрос на обмен с ID:", requestId);
    
        // Находим запрос на обмен до его удаления, чтобы получить данные об умении
        const swapRequest = await SwapRequest.findById(requestId);
    
        if (!swapRequest) {
          console.log("Ошибка при удалении запроса на обмен: запрос не найден");
          socket.emit("deleteSwapRequestError", { status: 500, error: "Error deleting swap request: request not found" });
          return;
        }
    
        // Получаем _id умения
        const skillId = swapRequest.receiverData.skillsToLearn[0]._id;
    
        // Обновляем пользователя, меняя isActive на false для соответствующего умения
        await User.updateOne({ _id: swapRequest.senderId, "skillsToLearn._id": skillId }, { $set: { "skillsToLearn.$.isActive": false } });
    
        // Удаляем запрос на обмен
        const deletedSwapRequest = await SwapRequest.findByIdAndDelete(requestId);

        if (deletedSwapRequest) {
          console.log("Запрос на обмен успешно удалён");

          io.to(swapRequest.receiverId.toString()).emit("swapRequestDeleted", { status: 200, message: 'Swap request deleted' });
          io.to(swapRequest.senderId.toString()).emit("swapRequestDeleted", { status: 200, message: 'Swap request deleted' });
        } else {
          console.log("Ошибка при удалении запроса на обмен");
          socket.emit("deleteSwapRequestError", { status: 500, error: "Error deleting swap request" });
        }
      } catch (error) {
        console.error("Ошибка при удалении запроса на обмен:", error);
        socket.emit("deleteSwapRequestError", { status: 500, error: "Error deleting swap request" });
      }
    });

    // Получить все swapRequests
    socket.on("getAllSwapRequests", async () => {
      try {
        const currentUserId = socket.userId;
        const swapRequests = await SwapRequest.find({ $or: [{ senderId: currentUserId }, { receiverId: currentUserId }] });
        
        console.log("Получены все запросы на обмен для текущего пользователя");
        socket.emit("allSwapRequests", swapRequests);
      } catch (error) {
        console.error("Ошибка при получении всех запросов на обмен:", error);
        socket.emit("getAllSwapRequestsError", { status: 500, error: "Error fetching all swap requests" });
      }
    });

    socket.on("getCurrentSwapRequest", async (data) => {
      try {
        const { swapRequestId } = data;

        const swapRequest = await SwapRequest.findOne({ _id: swapRequestId });
    
        console.log("Получен текущий запрос на обмен");
        socket.emit("currentSwapRequest", swapRequest);
      } catch (error) {
        console.error("Ошибка при получении текущего запроса на обмен:", error);
        socket.emit("getCurrentSwapRequestError", { status: 500, error: "Error fetching current swap request" });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected from swap requests");
    });
  });
};

module.exports = swapRequestController;
