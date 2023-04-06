const User = require('../models/user');

exports.sendSwapRequest = async (req, res) => {
    try {
      const senderId = req.userId;
      const { receiverId, senderData, receiverData } = req.body;
  
      // Проверка на существующий запрос на обмен
      const sender = await User.findById(senderId);
      const existingRequest = sender.swapRequests.some((request) => {
        const isMatch =
          request.receiverData.id.toString() === receiverId &&
          request.senderData.skillsToLearn.length ===
            senderData.skillsToLearn.length &&
          request.senderData.skillsToLearn.every((skill, index) => {
            return (
              skill.theme === senderData.skillsToLearn[index].theme &&
              skill.category === senderData.skillsToLearn[index].category &&
              skill.subCategory === senderData.skillsToLearn[index].subCategory &&
              skill.skill === senderData.skillsToLearn[index].skill
            );
          });
  
        if (isMatch) {
          console.log('Existing request found:', request);
        }
        return isMatch;
      });
  
      if (existingRequest) {
        console.log('Swap request already exists');
        return res.status(400).send({ error: 'Swap request already exists' });
      }
  
      await User.findByIdAndUpdate(receiverId, {
        $push: { swapRequests: { senderData, status: 'pending' } },
      });
  
      await User.findByIdAndUpdate(senderId, {
        $push: { swapRequests: { receiverData, status: 'pending' } },
      });
  
      res.status(200).send({ message: 'Swap request sent successfully' });
    } catch (error) {
      res.status(500).send({ error: 'Error sending swap request' });
    }
  };
  
  
  
  
  
  exports.updateSwapRequest = async (req, res) => {
    try {
      const { swapRequestId, status } = req.body;
      const userId = req.userId;
  
      await User.updateOne(
        { _id: userId, 'swapRequests._id': swapRequestId },
        { $set: { 'swapRequests.$.status': status } }
      );
  
      res.status(200).send({ message: 'Swap request updated successfully' });
    } catch (error) {
      res.status(500).send({ error: 'Error updating swap request' });
    }
  };
  
  exports.deleteSwapRequest = async (req, res) => {
    try {
      const { swapRequestId } = req.body;
      const userId = req.userId;
  
      await User.updateOne(
        { _id: userId },
        { $pull: { swapRequests: { _id: swapRequestId } } }
      );
  
      res.status(200).send({ message: 'Swap request deleted successfully' });
    } catch (error) {
      res.status(500).send({ error: 'Error deleting swap request' });
    }
  };
  