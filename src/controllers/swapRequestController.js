const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');

const averageValuesUpdater = require('../helpers/averageValuesUpdater');
const swapRequestHelper = require('../helpers/swapRequestHelper');

const swapRequestController = (io) => {
  io.use(socketAuthMiddleware).on("connection", (socket) => {
    console.log("User connected to swap requests");


    // Отправка запроса на обмен
    socket.on("sendSwapRequest", async (data) => {
      try {
        const newSwapRequest = await swapRequestHelper.sendSwapRequest(data);

        io.to(data.receiverId).emit("swapRequestSent", newSwapRequest);
        io.to(data.senderId).emit("swapRequestSent", newSwapRequest);
      } catch (error) {
        console.error("Error sending swap request:", error);
        socket.emit("swapRequestError", { status: 500, error: "Error sending swap request" });
      }
    });


    // Принять запрос на обмен
    socket.on("acceptSwapRequest", async (data) => {
      try {
        const swapRequest = await swapRequestHelper.acceptSwapRequest(data);

        setImmediate(averageValuesUpdater.updateAverageResponseTime, swapRequest.receiverId);

        io.to(swapRequest.receiverId.toString()).emit("swapRequestAccepted", { status: 200, message: "SwapRequest statuses changed on'accepted'" });
        io.to(swapRequest.senderId.toString()).emit("swapRequestAccepted", { status: 200, message: "SwapRequest statuses changed on'accepted'" });
      } catch (error) {
        console.error('Error in acceptSwapRequest:', error);
        socket.emit("acceptSwapRequestError", { status: 500, message: 'Server error', error });
      }
    });


    // Отклонить запрос на обмен
    socket.on("rejectSwapRequest", async (data) => {
      try {
        const swapRequest = await swapRequestHelper.rejectSwapRequest(data);
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
        const swapRequest = await swapRequestHelper.deleteSwapRequest(data);

        io.to(swapRequest.receiverId.toString()).emit("swapRequestDeleted", { status: 200, message: 'Swap request deleted' });
        io.to(swapRequest.senderId.toString()).emit("swapRequestDeleted", { status: 200, message: 'Swap request deleted' });
      } catch (error) {
        console.error("Ошибка при удалении запроса на обмен:", error);
        socket.emit("deleteSwapRequestError", { status: 500, error: "Error deleting swap request" });
      }
    });


    // Получить все swapRequests
    socket.on("getAllSwapRequests", async () => {
      try {
        const currentUserId = socket.userId;
        const swapRequests = await swapRequestHelper.getAllSwapRequests(currentUserId);
        socket.emit("allSwapRequests", swapRequests);
      } catch (error) {
        console.error("Ошибка при получении всех запросов на обмен:", error);
        socket.emit("getAllSwapRequestsError", { status: 500, error: "Error fetching all swap requests" });
      }
    });


    // Получить текущий swapRequest
    socket.on("getCurrentSwapRequest", async (data) => {
      try {
        const swapRequest = await swapRequestHelper.getCurrentSwapRequest(data);
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
