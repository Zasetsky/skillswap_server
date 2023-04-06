const mongoose = require('mongoose');

const availableSkillSchema = new mongoose.Schema({
    theme: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    subCategory: {
        type: String,
        required: true
    },
    skill: {
        type: String,
        required: true
    }
});

const AvailableSkill = mongoose.model('AvailableSkill', availableSkillSchema);
module.exports = AvailableSkill;