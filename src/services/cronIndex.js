const cron = require('node-cron');
const checkPendingCancellations = require('./cancellationRequestsChecker');
const checkAndUpdateDeals = require('./dealObserver');

function setupCronJobs(io) {
  // Проверка запросов на отмену каждый час
  cron.schedule('* * * * *', () => {
    console.log('Checking pending cancellation requests');
    checkPendingCancellations(io).catch((error) => {
      console.error('Error while checking pending cancellation requests:', error);
    });
  });

  // Проверка и обновление сделок каждый час
  cron.schedule('* * * * *', () => {
    console.log('Checking and updating deals');
    checkAndUpdateDeals(io).catch((error) => {
      console.error('Error while checking and updating deals:', error);
    });
  });

  // Настройте другие задачи `cron` для других чекеров здесь
}

module.exports = setupCronJobs;
