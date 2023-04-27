const cron = require('node-cron');
const checkPendingCancellations = require('./cancellationRequestsChecker');

function setupCronJobs() {
  // Проверка запросов на отмену каждый час
  cron.schedule('0 * * * *', () => {
    console.log('Checking pending cancellation requests');
    checkPendingCancellations().catch((error) => {
      console.error('Error while checking pending cancellation requests:', error);
    });
  });

  // Настройте другие задачи `cron` для других чекеров здесь
}

module.exports = setupCronJobs;