const Deal = require('../models/deal');
const User = require('../models/user');
const SwapRequest = require('../models/swapRequest');

async function checkPendingCancellations(io) {
  const dealsWithPendingCancellation = await Deal.find({
    'cancellation.status': 'pending',
  });

  const now = new Date();
  for (const deal of dealsWithPendingCancellation) {
    const cancellationRequestTime = deal.cancellation.timestamp;
    const timeDifferenceInHours = (now - cancellationRequestTime) / (1000 * 60 * 60);
    if (timeDifferenceInHours >= 24) {
      // Отменить сделку и снизить карму получателя
      await cancelDealAndDecreaseReceiverKarma(deal, io);
    }
  }
}

async function cancelDealAndDecreaseReceiverKarma(deal, io) {
  try {
    const swapRequest = await SwapRequest.findById(deal.swapRequestId);

    deal.status = 'cancelled';
    swapRequest.status = "cancelled";
    deal.cancellation.status = 'cancelled';
    await deal.save();
    await swapRequest.save();

    for (let participant of deal.participants) {
      io.to(participant.toString()).emit('dealUpdated', deal);
      io.to(participant.toString()).emit('swapRequestUpdated', swapRequest);
    }

    const receiverId = deal.participants.find(
      (participantId) => !participantId.equals(deal.sender)
    );

    const receiver = await User.findById(receiverId);
    receiver.karma -= 10;
    await receiver.save();

  } catch (error) {
    console.log(error);
  }
}

module.exports = checkPendingCancellations;