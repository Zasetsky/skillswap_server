const Deal = require('../models/deal');

async function checkAndUpdateDeals() {
  try {
    const deals = await Deal.find({
      status: {
        $in: [
          'confirmed',
          'reschedule_offer',
          'reschedule_offer_update',
          'confirmed_reschedule',
          'half_completed',
          'half_completed_confirmed_reschedule',
        ],
      },
    });

    const updateDealStatus = async (deal, formPath1, formPath2, newStatus) => {
      const form1 = getNestedObject(deal, formPath1);
      const form2 = getNestedObject(deal, formPath2);

      const updateStatusIfCompleted = async (form, formPath) => {
        if (!form.isCompleted && isDealCompleted(form)) {
          await Deal.updateOne(
            { _id: deal._id },
            { 
              status: newStatus,
              $push: { completedForm: formPath },
              [`${formPath}.isCompleted`]: true,
            }
          );
        }
      };

      await updateStatusIfCompleted(form1, formPath1);
      await updateStatusIfCompleted(form2, formPath2);
    };

    function getNestedObject(obj, path) {
      return path.split('.').reduce((nestedObj, key) => {
        return nestedObj && nestedObj[key] !== 'undefined' ? nestedObj[key] : null;
      }, obj);
    }

    for (const deal of deals) {
      const newStatus = ['confirmed', 'confirmed_reschedule', 'reschedule_offer', 'reschedule_offer_update'].some(
        (status) => status === deal.status
      )
        ? 'half_completed'
        : 'completed';

      await updateDealStatus(deal, 'form', 'form2', newStatus);
    }
  } catch (error) {
    console.error('Ошибка при проверке и обновлении сделок:', error);
  }
}

function isDealCompleted(form) {
  const meetingDate = new Date(form.meetingDate);
  const meetingTime = form.meetingTime.split(':');
  const meetingDuration = parseInt(form.meetingDuration, 10);

  meetingDate.setUTCHours(meetingDate.getUTCHours() + parseInt(meetingTime[0], 10));
  meetingDate.setUTCMinutes(meetingDate.getUTCMinutes() + parseInt(meetingTime[1], 10) + meetingDuration);

  const now = new Date();
  const moscowOffset = 180; // Московское время (UTC+3) в минутах
  now.setUTCMinutes(now.getUTCMinutes() + moscowOffset);
  console.log(now);
  return now >= meetingDate;
}

module.exports = checkAndUpdateDeals;
