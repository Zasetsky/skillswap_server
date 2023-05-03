const Review = require('../models/review');
const User = require('../models/user');
const Deal = require('../models/deal');

exports.updateSkillRating = async (userId, skillId) => {
    try {
        const [user, reviews] = await Promise.all([
            User.findById(userId),
            Review.find({ receiver: userId, skill: skillId })
        ]);

        const totalRating = reviews.reduce((sum, r) => sum + r.skillRating, 0);
        const averageRating = totalRating / reviews.length;

        const skillToTeachIndex = user.skillsToTeach.findIndex(s => s._id === skillId);
        if (skillToTeachIndex !== -1) {
            user.skillsToTeach[skillToTeachIndex].rating = averageRating;
            user.skillsToTeach[skillToTeachIndex].isRated = true;

            await user.save();
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
        const averageRating = ratedSkills.length > 0 ? totalRating / ratedSkills.length : 0;

        user.totalSkillsRating = averageRating;
        await user.save();
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
        const reliabilityRating = baseReliabilityRating * (1 - lateRatio);

        user.reliabilityRating = reliabilityRating;
        await user.save();
    } catch (error) {
        console.error('Error updating reliability rating:', error);
    }
};

exports.updateEngagementRating = async (userId) => {
    try {
        const user = await User.findById(userId);

        const deals = await Deal.find({
            participants: user._id,
            status: { $in: ['completed', 'half_completed', 'confirmed_reschedule', 'half_completed_confirmed_reschedule'] }
        });

        const reviewPromises = deals.map(deal => Review.findOne({ sender: user._id, dealId: deal._id }));
        const reviews = await Promise.all(reviewPromises);
        const reviewedDealsFiltered = reviews.filter(review => review);

        const averageReviewRating = reviewedDealsFiltered.length > 0 ? reviewedDealsFiltered.reduce((sum, review) => sum + review.skillRating, 0) / reviewedDealsFiltered.length : 0;
        const averageOnlineTime = user.averageOnlineTime;
        const userEngagement = (averageReviewRating + (averageOnlineTime / 60000)) / 2;

        // Вычислить средний рейтинг вовлеченности всех пользователей
        const averageEngagementRatingResult = await User.aggregate([
            {
                $group: {
                    _id: null,
                    averageEngagementRating: { $avg: '$engagementRating' },
                },
            },
        ]);
        const averageEngagementRating = averageEngagementRatingResult.length > 0 ? averageEngagementRatingResult[0].averageEngagementRating : 0;

        // Обновить рейтинг вовлеченности текущего пользователя относительно среднего рейтинга всех пользователей
        const engagementRating = 5 * (userEngagement / averageEngagementRating);
        user.engagementRating = engagementRating;
        await user.save();
    } catch (error) {
        console.error('Error updating engagement rating:', error);
    }
};
