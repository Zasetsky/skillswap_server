const mongoose = require('mongoose');
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
      return request.receiverData.id === receiverId;
    };

    // Проверка на существующий запрос на обмен
    if (sender.swapRequests.some(existingRequest)) {
      return res
        .status(400)
        .send({ error: "Swap request already exists" });
    }

    // Создаем новый объект запроса на обмен для получателя с новым ObjectId
    const newSwapRequestForReceiver = {
      senderData,
      status: "pending",
      _id: new mongoose.Types.ObjectId(),
    };

    // Сохраняем запрос на обмен в массиве swapRequests получателя
    await User.findByIdAndUpdate(receiverId, {
      $push: { swapRequests: newSwapRequestForReceiver },
    });

    // Добавляем новый _id в объект запроса на обмен отправителя
    const newSwapRequestForSender = {
      receiverData,
      status: "pending",
      _id: newSwapRequestForReceiver._id,
    };

    // Сохраняем запрос на обмен в массиве swapRequests отправителя
    await User.findByIdAndUpdate(senderId, {
      $push: { swapRequests: newSwapRequestForSender },
    });

    res.status(200).send({ message: "Swap request sent successfully" });
  } catch (error) {
    console.error("Error sending swap request:", error);
    res.status(500).send({ error: "Error sending swap request" });
  }
};
  
  
  
exports.acceptSwapRequest = async (req, res) => {
  try {
    const requestId = req.body.requestId;
    const userId = req.body.userId;
    const currentUserId = req.body.currentUserId;
    const skillToTeach = req.body.skillToTeach;

    // Найти текущего пользователя и обновить его swapRequests
    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    const currentSwapRequestIndex = currentUser.swapRequests.findIndex(
      (request) => request._id.toString() === requestId
    );

    if (currentSwapRequestIndex === -1) {
      return res.status(404).json({ message: 'Swap request not found for the current user' });
    }

    currentUser.swapRequests[currentSwapRequestIndex].senderData.skillsToTeach =
      currentUser.swapRequests[currentSwapRequestIndex].senderData.skillsToTeach.filter(
        (skill) => skill._id.toString() === skillToTeach._id.toString()
      );
    await currentUser.save();

    // Обновить статус всех swapRequests с заданным requestId
    const updatedSwapRequestsResult = await User.updateMany(
      { 'swapRequests._id': requestId },
      { $set: { 'swapRequests.$.status': 'accepted' } }
    );

    if (updatedSwapRequestsResult.nModified === 0) {
      return res.status(404).json({ message: 'No swap requests found to update' });
    }

    // Найти пользователя с заданным ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Найти нужный swapRequests и добавить skillToTeach к swapRequests.receiverData.skillsToTeach
    const swapRequestIndex = user.swapRequests.findIndex(
      (request) => request._id.toString() === requestId
    );

    if (swapRequestIndex === -1) {
      return res.status(404).json({ message: 'Swap request not found for the user' });
    }

    user.swapRequests[swapRequestIndex].receiverData.skillsToTeach.push(skillToTeach);
    await user.save();

    res.status(200).json({ message: 'Swap request accepted' });
  } catch (error) {
    console.error('Error in acceptSwapRequest:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

  
  
exports.deleteSwapRequest = async (req, res) => {
  try {
      const { requestId  } = req.params;

      // console.log("req.params:", req.params);
      console.log("Удаляем запрос на обмен с ID:", requestId );

      // Находим всех пользователей с указанным requestId  в их массиве swapRequests
      const usersWithSwapRequest = await User.find({
          "swapRequests._id": new mongoose.Types.ObjectId(requestId ),
      });

      
      // console.log('usersWithSwapRequest:', usersWithSwapRequest);
      // console.log('usersWithSwapRequest.length:', usersWithSwapRequest.length);

      if (usersWithSwapRequest.length === 0) {
          console.log("Запрос на обмен не найден");
          res.status(404).send({ error: "Swap request not found" });
          return;
      }

      // Удаляем запрос на обмен с указанным requestId у всех пользователей
      const updatedUsers = await User.updateMany(
          { "swapRequests._id": new mongoose.Types.ObjectId(requestId) },
          { $pull: { swapRequests: { _id: new mongoose.Types.ObjectId(requestId) } } }
      ).exec();

      // console.log('updatedUsers:', updatedUsers);

      if (updatedUsers.matchedCount === usersWithSwapRequest.length) {
          console.log("Запрос на обмен успешно удалён у пользователей");
          res.status(204).send(); // Отправляем статус 204 No Content без тела сообщения
      } else {
          console.log("Ошибка при удалении запроса на обмен");
          res.status(500).send({ error: "Error deleting swap request" });
      }
  } catch (error) {
      console.error("Ошибка при удалении запроса на обмен:", error);
      res.status(500).send({ error: "Error deleting swap request" });
  }
};
  


