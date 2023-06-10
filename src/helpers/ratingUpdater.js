const Review = require('../models/review');
const User = require('../models/user');
const Deal = require('../models/deal');

exports.updateSkillRating = async (userId, skillId) => {
    try {
        const user = await User.findById(userId);
        const reviews = await Review.find({ receiver: userId, 'skill._id': skillId });

        const totalRating = reviews.reduce((sum, r) => sum + r.skillRating, 0);
        const averageRating = parseFloat((totalRating / reviews.length).toFixed(2));

        const skillToTeachIndex = user.skillsToTeach.findIndex(s => s._id.toString() === skillId.toString());
        if (skillToTeachIndex !== -1) {
            user.skillsToTeach[skillToTeachIndex].rating = averageRating;
            user.skillsToTeach[skillToTeachIndex].isRated = true;

            await user.save();
            console.log('Skill rating updated:', user.skillsToTeach[skillToTeachIndex].rating);
        }
    } catch (error) {
        console.error('Error updating skill rating:', error);
    }
};

exports.updateTotalSkillsRating = async (userId) => {
    try {
        const user = await User.findById(userId);

        const ratedSkills = user.skillsToTeach.filter(skill => skill.isRated);
        const totalRating = ratedSkills.reduce((sum, skill) => sum + skill.rating, 0);
        const averageRating = ratedSkills.length > 0 ? parseFloat((totalRating / ratedSkills.length).toFixed(2)) : 0;

        user.totalSkillsRating = averageRating;
        await user.save();
        console.log('Total skills rating updated:', user.totalSkillsRating);
    } catch (error) {
        console.error('Error updating total skills rating:', error);
    }
};

exports.updateReliabilityRating = async (userId) => {
    try {
        const [user, deals] = await Promise.all([
            User.findById(userId),
            Deal.find({
                participants: userId,
                status: { $in: ['completed', 'half_completed', 'confirmed_reschedule', 'half_completed_confirmed_reschedule'] }
            })
        ]);

        const lateDeals = await Promise.all(deals.map(async deal => {
            const review = await Review.findOne({ receiver: userId, dealId: deal._id });
            if (review && review.isLate) {
                return review;
            }
        }));

        const lateDealsFiltered = lateDeals.filter(Boolean);

        const baseReliabilityRating = 5;
        const lateRatio = lateDealsFiltered.length / deals.length;
        const reliabilityRating = parseFloat((baseReliabilityRating * (1 - lateRatio)).toFixed(2));

        user.reliabilityRating = reliabilityRating;
        await user.save();
        console.log('Reliability rating updated:', user.reliabilityRating);
    } catch (error) {
        console.error('Error updating reliability rating:', error);
    }
};

exports.updateLoyaltyRating = async (userId) => {
  try {
    const user = await User.findById(userId);

    const deals = await Deal.find({
      participants: user._id,
      status: { $in: ['completed', 'half_completed', 'confirmed_reschedule', 'half_completed_confirmed_reschedule'] }
    });

    const reviewPromises = deals.map(deal => Review.findOne({ sender: user._id, dealId: deal._id }));
    const reviews = await Promise.all(reviewPromises);
    const reviewedDealsFiltered = reviews.filter(review => review);

    const totalDeals = deals.length;
    const totalReviewedDeals = reviewedDealsFiltered.length;

    const loyaltyRating = totalDeals > 0 ? parseFloat(((totalReviewedDeals / totalDeals) * 5).toFixed(2)) : 0;

    user.loyaltyRating = loyaltyRating;
    await user.save();
    console.log('Loyalty rating updated:', user.loyaltyRating);
  } catch (error) {
    console.error('Error updating loyalty rating:', error);
  }
};
