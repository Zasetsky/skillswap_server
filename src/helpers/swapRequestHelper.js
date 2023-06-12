const SwapRequest = require('../models/swapRequest');

const userHelper = require('../helpers/userHelper');

// Проверяет, существует ли уже запрос на обмен
exports.checkExistingSwapRequest = async (senderId, receiverId, skillId) => {
  const existingSwapRequest = await SwapRequest.findOne({
    senderId,
    receiverId,
    'senderData.skillsToLearn': { $elemMatch: { _id: skillId } },
    status: 'pending',
  });

  if (existingSwapRequest) {
    throw new Error('Swap request already exists');
  }
};

// Проверяет, нет ли активных сделок.
exports.CheckActiveSwapRequest = async (senderId, receiverId) => {
  const activeSwapRequest = await SwapRequest.findOne({
    $or: [
      { senderId: senderId, receiverId: receiverId, status: 'accepted' },
      { senderId: receiverId, receiverId: senderId, status: 'accepted' }
    ]
  });

  if (activeSwapRequest) {
    throw new Error('An active swap request already exists between these users');
  }
};

// Создаёт новый запрос на обмен
exports.createNewSwapRequest = async (senderId, receiverId, senderData, receiverData) => {
  const newSwapRequest = new SwapRequest({
    senderId,
    receiverId,
    senderData,
    receiverData,
    status: "pending",
  });

  await newSwapRequest.save();
  return newSwapRequest;
};

// Генерирует успешные сообщения для отправителя и получателя
exports.emitSuccessMessage = (receiverId, senderId) => {
  return [
    {
      id: receiverId,
      message: { status: 200, message: "Swap request received successfully" }
    },
    {
      id: senderId,
      message: { status: 200, message: "Swap request sent successfully" }
    },
  ];
};

// Обновляет статус запроса на обмен
exports.updateSwapRequestStatus = async (swapRequestId, newStatus) => {
  const swapRequest = await SwapRequest.findById(swapRequestId);
  if (!swapRequest) {
    throw new Error('Swap request not found');
  }
  swapRequest.status = newStatus;
  if (newStatus === 'accepted') {
    swapRequest.acceptAt = Date.now();
  }
  return swapRequest;
};

// Обновляет умения, которые получатель готов преподавать
exports.updateReceiverSkillsToTeach = (swapRequest, chosenSkill) => {
  swapRequest.receiverData.skillsToTeach = [chosenSkill];
  return swapRequest;
};

// Обновляет умения, которые отправитель готов преподавать
exports.updateSenderSkillsToTeach = (swapRequest, chosenSkill) => {
  swapRequest.senderData.skillsToTeach = swapRequest.senderData.skillsToTeach.filter(skill => {
    return skill._id.toString() === chosenSkill._id.toString();
  });
  return swapRequest;
};

// sendSwapRequest процесс
exports.sendSwapRequest = async (data) => {
  const { receiverId, senderId, senderData, receiverData } = data;
  const skillId = receiverData.skillsToLearn._id;

  await userHelper.checkUserIsActiveSkill(senderId, skillId);
  await this.CheckActiveSwapRequest(senderId, receiverId);
  await this.checkExistingSwapRequest(senderId, receiverId, skillId);

  const newSwapRequest = await this.createNewSwapRequest(senderId, receiverId, senderData, receiverData);

  return newSwapRequest;
};

// Процесс принятия запроса на обмен
exports.acceptSwapRequest = async (data) => {
  const { swapRequestId, chosenSkill } = data;

  let swapRequest = await this.updateSwapRequestStatus(swapRequestId, 'accepted');
  swapRequest = this.updateReceiverSkillsToTeach(swapRequest, chosenSkill);
  swapRequest = this.updateSenderSkillsToTeach(swapRequest, chosenSkill);

  // Сохраняем изменения в swapRequest сразу
  await swapRequest.save();

  await userHelper.updateUserIsActiveSkillOnTrue(swapRequest.receiverId, chosenSkill._id);
  await userHelper.updateUserIsActiveSkillOnTrue(swapRequest.senderId, swapRequest.senderData.skillsToLearn[0]._id);
  
  await this.deletePendingSwapRequests(swapRequest.senderId, swapRequest.receiverId, swapRequest.senderData.skillsToLearn[0]._id, chosenSkill._id);

  // Возвращаем уже сохраненный swapRequest
  return swapRequest;
};

// Удаляет ожидающие запросы на обмен
exports.deletePendingSwapRequests = async (senderId, receiverId, skillId, chosenSkillId) => {
  await SwapRequest.deleteMany({
    $or: [
      {
        senderId: senderId,
        'senderData.skillsToLearn': { $elemMatch: { _id: skillId } },
        status: 'pending',
      },
      {
        senderId: receiverId,
        'senderData.skillsToLearn': { $elemMatch: { _id: chosenSkillId } },
        status: 'pending',
      },
    ],
  });
};

// Отклоняет запрос на обмен
exports.rejectSwapRequest = async (data) => {
  const { swapRequestId } = data;

  if (!swapRequestId) {
    throw new Error("Not Found swapRequests _id");
  }

  const swapRequest = await this.updateSwapRequestStatus(swapRequestId, 'rejected');

  return swapRequest;
};

// Удаляет запрос на обмен
exports.deleteSwapRequest = async (data) => {
  const { requestId } = data;

  // Находим запрос на обмен до его удаления, чтобы получить данные об умении
  const swapRequest = await SwapRequest.findById(requestId);

  if (!swapRequest) {
    throw new Error("Error deleting swap request: request not found");
  }

  const deletedSwapRequest = await SwapRequest.findByIdAndDelete(requestId);

  if (!deletedSwapRequest) {
    throw new Error("Error deleting swap request");
  }

  return swapRequest;
};

// Получает все запросы на обмен текущего пользователя
exports.getAllSwapRequests = async (currentUserId) => {
  const swapRequests = await SwapRequest.find({ $or: [{ senderId: currentUserId }, { receiverId: currentUserId }] })
      .sort({ _id: -1 });

  return swapRequests;
};

// Получает текущий запрос на обмен
exports.getCurrentSwapRequest = async (data) => {
  const { swapRequestId } = data;
  const swapRequest = await SwapRequest.findOne({ _id: swapRequestId });

  return swapRequest;
};