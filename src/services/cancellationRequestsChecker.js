const Deal = require('../models/deal');
const User = require('../models/user');

async function checkPendingCancellations() {
  const dealsWithPendingCancellation = await Deal.find({
    'cancellation.status': 'pending',
  });

  const now = new Date();
  for (const deal of dealsWithPendingCancellation) {
    const cancellationRequestTime = deal.cancellation.timestamp;
    const timeDifferenceInHours = (now - cancellationRequestTime) / (1000 * 60 * 60);
    if (timeDifferenceInHours >= 24) {
      // Отменить сделку и снизить карму получателя
      await cancelDealAndDecreaseReceiverKarma(deal);
    }
  }
}

async function cancelDealAndDecreaseReceiverKarma(deal) {
  // Обновите статус сделки
  deal.status = 'cancelled';
  deal.cancellation.status = 'cancelled';
  await deal.save();

  // Найдите получателя путем исключения отправителя из массива participants
  const receiverId = deal.participants.find(
    (participantId) => !participantId.equals(deal.sender)
  );

  // Найдите получателя в базе данных и уменьшите его карму на 10
  const receiver = await User.findById(receiverId);
  receiver.karma -= 10;
  await receiver.save();
}

module.exports = checkPendingCancellations;