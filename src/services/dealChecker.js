const { getAllDeals } = require("./dealService");
const { sendNotification } = require("./notificationService");

async function checkDeals() {
  try {
    const deals = await getAllDeals();

    // Отбираем завершенные сделки
    const finishedDeals = deals.filter((deal) => {
      const now = new Date();
      const meetingEndTime = new Date(deal.meetingDate);
      meetingEndTime.setHours(
        meetingEndTime.getHours() + parseInt(deal.meetingDuration)
      );
      return meetingEndTime <= now;
    });

    // Отправляем уведомления на клиент
    for (const deal of finishedDeals) {
      // Отправляем уведомления каждому участнику сделки
      for (const userId of deal.participants) {
        sendNotification(userId, {
          type: "deal_update",
          content: "Ваша сделка завершилась.",
        });
      }
    }
  } catch (error) {
    console.error("Error checking deals:", error);
  }
}

module.exports = {
  checkDeals,
};
