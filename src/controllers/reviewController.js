const Review = require('../models/review');

exports.createReview = async (req, res) => {
  try {
    const reviewData = req.body;
    const review = new Review(reviewData);
    await review.save();
    res.status(201).json({ message: 'Review successfully created', review });
  } catch (error) {
    res.status(500).json({ message: 'Error creating review', error });
  }
};
