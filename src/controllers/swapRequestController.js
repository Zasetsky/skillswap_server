const SwapRequest = require('../models/swapRequest');
const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');

const swapRequestController = (io) => {
  io.use(socketAuthMiddleware).on("connection", (socket) => {
    console.log("User connected to swap requests");

    // Отправка запроса на обмен
    socket.on("sendSwapRequest", async (data) => {
      try {
        const { receiverId, senderId, senderData, receiverData } = data;

        // Создаем новый объект запроса на обмен для получателя с новым ObjectId
        const newSwapRequest = new SwapRequest({
          senderId,
          receiverId,
          senderData,
          receiverData,
          status: "pending",
        });

        await newSwapRequest.save();

        // Отправляем уведомление об успешной отправке запроса на обмен
        socket.emit("swapRequestSent", { status: 200, message: "Swap request sent successfully" });
      } catch (error) {
        console.error("Error sending swap request:", error);
        socket.emit("swapRequestError", { status: 500, error: "Error sending swap request" });
      }
    });

    // Принять запрос на обмен
    socket.on("acceptSwapRequest", async (data) => {
      try {
        const { swapRequestId, chosenSkillToSwap } = data;
    
        // Найти запрос на обмен с заданным swapRequestId и обновить статус на "accepted"
        const swapRequest = await SwapRequest.findById(swapRequestId);
        if (!swapRequest) {
          return socket.emit("swapRequestError", { status: 404, message: 'Swap request not found' });
        }
        swapRequest.status = 'accepted';
    
        // Обновить skillsToTeach у получателя
        swapRequest.receiverData.skillsToTeach = [chosenSkillToSwap];
    
        // Обновить skillsToTeach у отправителя, оставив только chosenSkillToSwap
        swapRequest.senderData.skillsToTeach = swapRequest.senderData.skillsToTeach.filter(skill => {
          return skill._id.toString() === chosenSkillToSwap._id.toString();
        });
    
        await swapRequest.save();
    
        socket.emit("swapRequestAccepted", { status: 200, message: 'Swap request accepted' });
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
          return socket.emit("rejectSwapRequestError", { status: 400, error: "Необходимо указать _id swapRequests" });
        }

        const swapRequest = await SwapRequest.findById(swapRequestId);
        if (!swapRequest) {
          return socket.emit("rejectSwapRequestError", { status: 404, error: "Swap request not found" });
        }

        swapRequest.status = "rejected";
        await swapRequest.save();

        socket.emit("swapRequestRejected", { status: 200, message: "Статус swapRequests успешно изменен на 'rejected'" });
      } catch (error) {
        console.error(error);
        socket.emit("rejectSwapRequestError", { status: 500, error: "Произошла ошибка при обработке запроса" });
      }
    });

    // Удалить запрос на обмен
    socket.on("deleteSwapRequest", async (data) => {
      try {
        const { requestId } = data;
        console.log('hi!', requestId);
        console.log("Удаляем запрос на обмен с ID:", requestId);

        const deletedSwapRequest = await SwapRequest.findByIdAndDelete(requestId);

        if (deletedSwapRequest) {
          console.log("Запрос на обмен успешно удалён");
          socket.emit("swapRequestDeleted"); // Отправляем статус 204 No Content без тела сообщения
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

    socket.on("disconnect", () => {
      console.log("User disconnected from swap requests");
    });
  });
};

module.exports = swapRequestController;

