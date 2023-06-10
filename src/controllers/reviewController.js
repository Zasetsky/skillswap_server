const Review = require('../models/review');
const ratingUpdater = require('../helpers/ratingUpdater');

const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');


exports.createReview = (io) => {
  io.use(socketAuthMiddleware).on("connection", (socket) => {
    console.log("User connected to createReview");

    socket.on('createReview', async (data) => {
      try {
        // Проверка на наличие отзыва с таким dealId и formType
        const existingReview = await Review.findOne({ dealId: data.dealId, formType: data.formType });
        if (existingReview) {
          return socket.emit('error', { message: 'Review for this deal and form type already exists' });
        }
    
        const review = new Review(data);
        await review.save();

        const createdReview = await Review.findById(review._id).populate('sender');

        io.to(review.sender.toString()).emit('reviewCreated', createdReview);
        io.to(review.receiver.toString()).emit('reviewCreated', createdReview);

        // Обновить рейтинг навыка после успешного создания отзыва
        ratingUpdater.updateSkillRating(review.receiver, review.skill._id);
        ratingUpdater.updateTotalSkillsRating(review.receiver);
    
        // Обновить reliabilityRating после успешного создания отзыва
        ratingUpdater.updateReliabilityRating(review.receiver);
    
        // Обновить engagementRating после успешного создания отзыва
        ratingUpdater.updateLoyaltyRating(review.sender);
      } catch (error) {
        console.log(error);
        socket.emit('error', { message: 'Error creating review and updating rating', error });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected from chat");
    });
  });
};

exports.getUserReceivedReviews = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const reviews = await Review.find({ receiver: userId }).populate('sender');

    res.status(200).json({ message: 'Reviews for current deal fetched successfully', reviews });
  } catch (error) {
    console.error('Error fetching reviews for current deal:', error);
    res.status(500).json({ message: 'Error fetching reviews for current deal', error: error.message });
  }
};

exports.getCurrentDealReviews = async (req, res) => {
  try {
    const dealId = req.params.dealId;
    
    const reviews = await Review.find({ dealId });

    res.status(200).json({ message: 'Reviews for current deal fetched successfully', reviews });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews for current deal', error });
  }
};