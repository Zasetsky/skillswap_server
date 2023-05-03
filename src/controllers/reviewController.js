const Review = require('../models/review');
const ratingUpdater = require('../helpers/ratingUpdater');

exports.createReview = async (req, res) => {
  try {
    const reviewData = req.body;
    const review = new Review(reviewData);
    await review.save();

    // Обновить рейтинг навыка после успешного создания отзыва
    await ratingUpdater.updateSkillRating(review.receiver, review.skill);
    await ratingUpdater.updateTotalSkillsRating(review.receiver);

    // Обновить reliabilityRating после успешного создания отзыва
    await ratingUpdater.updateReliabilityRating(review.receiver);

    // Обновить engagementRating после успешного создания отзыва
    await ratingUpdater.updateEngagementRating(review.receiver);

    res.status(201).json({ message: 'Review successfully created and rating updated', review });
  } catch (error) {
    res.status(500).json({ message: 'Error creating review and updating rating', error });
  }
};

