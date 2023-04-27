const cron = require("node-cron");
const { checkDeals } = require("./dealChecker");

// Запускаем задачу каждый час
const scheduledTask = cron.schedule("0 * * * *", async () => {
  try {
    await checkDeals();
  } catch (error) {
    console.error("Error checking deals:", error);
  }
});

// Запускаем наблюдателя
const startDealObserver = () => scheduledTask.start();

module.exports = {
    startDealObserver,
};