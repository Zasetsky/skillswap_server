const User = require('../models/user');
const Review = require('../models/review');
const SwapRequest = require('../models/swapRequest');

async function calculateTotalSkillsRating(userId) {
    const user = await User.findById(userId);
  
    const totalSkillsRating = user.skillsToTeach.reduce((sum, skill) => sum + skill.rating, 0);
  
    user.totalSkillsRating = totalSkillsRating;
    await user.save();
  
    return totalSkillsRating;
  }
  
  async function updateSkillRating(userId, skillId, newRating) {
    const user = await User.findById(userId);
  
    const skillToTeach = user.skillsToTeach.find(skill => skill._id.toString() === skillId);
  
    if (skillToTeach) {
      skillToTeach.rating = newRating;
      await user.save();
    } else {
      throw new Error('Skill not found');
    }
  }
  
  async function calculateReliabilityRating(userId) {
    const reviews = await Review.find({ receiver: userId });
  
    const lateReviews = reviews.filter(review => review.isLate).length;
    const totalReviews = reviews.length;
  
    const reliabilityRating = (totalReviews > 0) ? ((totalReviews - lateReviews) / totalReviews) * 5 : 0;
  
    const user = await User.findById(userId);
    user.reliabilityRating = reliabilityRating;
    await user.save();
  
    return reliabilityRating;
  }
  
  async function calculateEngagementRating(userId) {
    const swapRequests = await SwapRequest.find({ $or: [{ senderId: userId }, { receiverId: userId }] });
    const totalSwapRequests = swapRequests.length;
  
    const ratedSwapRequests = swapRequests.filter(swapRequest => {
      const review = await Review.findOne({ swapRequestId: swapRequest._id });
      return !!review;
    }).length;
  
    const engagementRating = (totalSwapRequests > 0) ? (ratedSwapRequests / totalSwapRequests) * 5 : 0;
  
    const user = await User.findById(userId);
    user.engagementRating = engagementRating;
    await user.save();
  
    return engagementRating;
  }