const User = require('../models/user');

exports.sendSwapRequest = async (req, res) => {
    try {
      const senderId = req.userId;
      const { receiverId, senderData, receiverData } = req.body;
  
      // Получение данных отправителя и получателя
      const sender = await User.findById(senderId);
      const receiver = await User.findById(receiverId);
  
      // Функция проверки на существующий запрос на обмен от отправителя к получателю
      const existingRequest = (request) => {
        return request.receiverData.id.toString() === receiverId;
      };
  
      // Проверка на существующий запрос на обмен
      if (sender.swapRequests.some(existingRequest)) {
        return res
          .status(400)
          .send({ error: "Swap request already exists" });
      }
  
      // Если запрос не является дубликатом, сохраните его в базе данных
      await User.findByIdAndUpdate(receiverId, {
        $push: { swapRequests: { senderData, status: "pending" } },
      });
  
      await User.findByIdAndUpdate(senderId, {
        $push: { swapRequests: { receiverData, status: "pending" } },
      });
  
      res.status(200).send({ message: "Swap request sent successfully" });
    } catch (error) {
      console.error("Error sending swap request:", error);
      res.status(500).send({ error: "Error sending swap request" });
    }
};
  
  
  
  exports.updateSwapRequest = async (req, res) => {
    try {
      const { swapRequestId, status } = req.body;
      const userId = req.userId;
  
      await User.updateOne(
        { _id: userId, 'swapRequests._id': swapRequestId },
        { $set: { 'swapRequests.$.status': status } }
      );
  
      res.status(200).send({ message: 'Swap request updated successfully' });
    } catch (error) {
      res.status(500).send({ error: 'Error updating swap request' });
    }
  };
  
exports.deleteSwapRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.userId;

        console.log("Удаляем запрос на обмен с ID:", requestId);

        const currentUser = await User.findOne({
            _id: userId,
            $or: [
                { "swapRequests.senderData.id": requestId },
                { "swapRequests.receiverData.id": requestId },
            ],
        });

        const otherUser = await User.findOne({
            _id: requestId,
            $or: [
                { "swapRequests.senderData.id": userId },
                { "swapRequests.receiverData.id": userId },
            ],
        });

        if (currentUser) {
            await User.updateOne(
                { _id: userId },
                {
                    $pull: {
                        swapRequests: {
                            $or: [
                                { "senderData.id": requestId },
                                { "receiverData.id": requestId },
                            ],
                        },
                    },
                }
            );
            console.log("Запрос на обмен успешно удалён у текущего пользователя");
        }

        if (otherUser) {
            await User.updateOne(
                { _id: requestId },
                {
                    $pull: {
                        swapRequests: {
                            $or: [
                                { "senderData.id": userId },
                                { "receiverData.id": userId },
                            ],
                        },
                    },
                }
            );
            console.log("Запрос на обмен успешно удалён у пользователя с requestId");
        }

        if (currentUser || otherUser) {
            res.status(200).send({ message: "Swap request deleted successfully" });
        } else {
            console.log("Запрос на обмен не найден");
            res.status(404).send({ error: "Swap request not found" });
        }
    } catch (error) {
        console.error("Ошибка при удалении запроса на обмен:", error);
        res.status(500).send({ error: "Error deleting swap request" });
    }
};


