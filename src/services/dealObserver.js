const Deal = require('../models/deal');

async function checkAndUpdateDeals() {
  try {
    const deals = await Deal.find({
      $or: [
        { status: 'confirmed' },
        { status: 'reschedule_offer' },
        { status: 'reschedule_offer_update' },
        { status: 'half_completed' },
        { status: 'confirmed_reschedule' },
        { status: 'half_completed_confirmed_reschedule' },
      ],
    });

    for (const deal of deals) {
      if (deal.status === 'confirmed') {

        if (
            deal.update.form.meetingDate &&
            deal.update.form.meetingTime &&
            deal.update.form.meetingDuration
          ) {

          if (isDealCompleted(deal.update.form)) {
            await Deal.updateOne({ _id: deal._id }, { status: 'half_completed' });
          }

        } else {

          if (isDealCompleted(deal.form)) {
            await Deal.updateOne({ _id: deal._id }, { status: 'half_completed' });
          }

        }

      } else if (deal.status === 'reschedule_offer') {

        if (isDealCompleted(deal.update.form)) {
          await Deal.updateOne({ _id: deal._id }, { status: 'half_completed' });
        }

      } else if (deal.status === 'reschedule_offer_update') {

        if (isDealCompleted(deal.form)) {
          await Deal.updateOne({ _id: deal._id }, { status: 'half_completed' });
        }

      } else if (deal.status === 'half_completed') {

        if (
            deal.update.form2.meetingDate &&
            deal.update.form2.meetingTime &&
            deal.update.form2.meetingDuration
          ) {

          if (isDealCompleted(deal.update.form2)) {
            await Deal.updateOne({ _id: deal._id }, { status: 'completed' });
          }

        } else {

          if (isDealCompleted(deal.form2)) {
            await Deal.updateOne({ _id: deal._id }, { status: 'completed' });
          }
        }

      } else if (deal.status === 'confirmed_reschedule') {

        if (isDealCompleted(deal.reschedule.form)) {
          await Deal.updateOne({ _id: deal._id }, { status: 'half_completed' });
        }

      } else if (deal.status === 'half_completed_confirmed_reschedule') {

        if (isDealCompleted(deal.reschedule.form2)) {
          await Deal.updateOne({ _id: deal._id }, { status: 'completed' });
        }

      }
    }
  } catch (error) {
    console.error('Ошибка при проверке и обновлении сделок:', error);
  }
}

function isDealCompleted(form) {
  const meetingDate = new Date(form.meetingDate);
  const meetingTime = form.meetingTime.split(':');
  const meetingDuration = parseInt(form.meetingDuration, 10);

  meetingDate.setHours(meetingDate.getHours() + parseInt(meetingTime[0], 10));
  meetingDate.setMinutes(meetingDate.getMinutes() + parseInt(meetingTime[1], 10));
  meetingDate.setMinutes(meetingDate.getMinutes() + meetingDuration);

  const now = new Date();

  return now >= meetingDate;
}

module.exports = checkAndUpdateDeals;
