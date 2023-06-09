const SwapRequest = require('../models/swapRequest');
const User = require('../models/user');

exports.updateAverageResponseTime = async (userId) => {
    try {
        const swapRequests = await SwapRequest.find({
            receiverId: userId,
            status: 'accepted'
        });

        if (swapRequests.length > 0) {
            console.log('Hello!');
            let totalResponseTime = 0;

            swapRequests.forEach(request => {
                const responseTime = request.acceptAt - request.createdAt;
                totalResponseTime += responseTime;
            });

            const averageResponseTime = totalResponseTime / swapRequests.length;

            const user = await User.findById(userId);
            user.averageResponseTime = averageResponseTime;

            await user.save();
            console.log('Average response time updated:', user.averageResponseTime);
        }
    } catch (error) {
        console.error('Error updating average response time:', error);
    }
};
