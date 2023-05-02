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

    const updateDealStatus = async (deal, formPath1, formPath2, newStatus) => {
      const form1 = getNestedObject(deal, formPath1);
      const form2 = getNestedObject(deal, formPath2);
    
      if (
        (deal.status === "confirmed_reschedule" || deal.status === "half_completed_confirmed_reschedule") &&
        (isDealCompleted(form1) || isDealCompleted(form2))
      ) {
        await Deal.updateOne({ _id: deal._id }, { status: newStatus });
      } else {
        if (!form1.isCompleted && isDealCompleted(form1)) {
          await Deal.updateOne(
            { _id: deal._id },
            { status: newStatus, [`${formPath1}.isCompleted`]: true }
          );
        } else if (!form2.isCompleted && isDealCompleted(form2)) {
          await Deal.updateOne(
            { _id: deal._id },
            { status: newStatus, [`${formPath2}.isCompleted`]: true }
          );
        }
      }
    };
    

    function getNestedObject(obj, path) {
      return path.split('.').reduce((nestedObj, key) => {
        return nestedObj && nestedObj[key] !== 'undefined' ? nestedObj[key] : null;
      }, obj);
    }

    for (const deal of deals) {
      deal.previousStatus = deal.status;

      if (['confirmed', 'reschedule_first_offer'].includes(deal.status)) {
        if (deal.update.form.meetingDate && deal.update.form2.meetingDate) {
          await updateDealStatus(deal, 'update.form', 'update.form2', 'half_completed');
        } else {
          await updateDealStatus(deal, 'form', 'form2', 'half_completed');
        }
      } else if (deal.status === 'reschedule_offer') {
        await updateDealStatus(deal, 'update.form', 'update.form2', 'half_completed');
      } else if (deal.status === 'reschedule_offer_update') {
        await updateDealStatus(deal, 'form', 'form2', 'half_completed');
      } else if (deal.status === 'confirmed_reschedule') {
        await updateDealStatus(deal, 'reschedule.form', null, 'half_completed');
      } else if (deal.status === 'half_completed') {
        if (['confirmed', 'reschedule_first_offer'].includes(deal.previousStatus)) {
          if (deal.update.form.meetingDate && deal.update.form2.meetingDate) {
            await updateDealStatus(deal, 'update.form', 'update.form2', 'completed');
          } else {
            await updateDealStatus(deal, 'form', 'form2', 'completed');
          }
        } else if (deal.previousStatus === 'reschedule_offer') {
          await updateDealStatus(deal, 'update.form', 'update.form2', 'completed');
        } else if (deal.previousStatus === 'reschedule_offer_update') {
          await updateDealStatus(deal, 'form', 'form2', 'completed');
        }
      } else if (deal.status === 'half_completed_confirmed_reschedule') {
        await updateDealStatus(deal, 'reschedule.form2', null, 'completed');
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

