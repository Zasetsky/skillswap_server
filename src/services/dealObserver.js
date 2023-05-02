const Deal = require('../models/deal');

async function checkAndUpdateDeals() {
  try {
    const deals = await Deal.find({
      $or: [
        { status: 'confirmed' },
        { status: 'reschedule_first_offer' },
        { status: 'reschedule_offer' },
        { status: 'reschedule_offer_update' },
        { status: 'half_completed' },
        { status: 'confirmed_reschedule' },
        { status: 'half_completed_confirmed_reschedule' },
      ],
    });

    for (const deal of deals) {
      deal.previousStatus = deal.status;

      const updateDealStatus = async (form1, form2, newStatus) => {
        if (isDealCompleted(form1)) {
          await Deal.updateOne({ _id: deal._id }, { status: newStatus });
        } else if (isDealCompleted(form2)) {
          await Deal.updateOne({ _id: deal._id }, { status: newStatus });
        }
      };

      if (['confirmed', 'reschedule_first_offer'].includes(deal.status)) {
        if (deal.update.form.meetingDate && deal.update.form2.meetingDate) {
          await updateDealStatus(deal.update.form, deal.update.form2, 'half_completed');
        } else {
          await updateDealStatus(deal.form, deal.form2, 'half_completed');
        }
      } else if (deal.status === 'reschedule_offer') {
        await updateDealStatus(deal.update.form, deal.update.form2, 'half_completed');
      } else if (deal.status === 'reschedule_offer_update') {
        await updateDealStatus(deal.form, deal.form2, 'half_completed');
      } else if (deal.status === 'confirmed_reschedule') {
        await updateDealStatus(deal.reschedule.form, null, 'half_completed');
      } else if (deal.status === 'half_completed') {
        if (['confirmed', 'reschedule_first_offer'].includes(deal.previousStatus)) {
          if (deal.update.form.meetingDate && deal.update.form2.meetingDate) {
            await updateDealStatus(deal.update.form, deal.update.form2, 'completed');
          } else {
            await updateDealStatus(deal.form, deal.form2, 'completed');
          }
        } else if (deal.previousStatus === 'reschedule_offer') {
          await updateDealStatus(deal.update.form, deal.update.form2, 'completed');
        } else if (deal.previousStatus === 'reschedule_offer_update') {
          await updateDealStatus(deal.form, deal.form2, 'completed');
        }
      } else if (deal.status === 'half_completed_confirmed_reschedule') {
        await updateDealStatus(deal.reschedule.form2, null, 'completed');
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

