const mongoose = require('mongoose');
const AvailableSkill = require('./src/models/availableSkill');
const initialSkills = require('./initial_skills.json');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('Database connection established');
    })
    .catch((err) => {
        console.log('Error connecting to the database:', err);
    });

const seedAvailableSkills = async () => {
    try {
        await AvailableSkill.deleteMany({});

        for (const theme of initialSkills) {
            const themeName = theme.theme;

            for (const category of theme.categories) {
                const categoryName = category.category;

                for (const subCategory of category.subCategories) {
                    const subCategoryName = subCategory.subCategory;

                    for (const skill of subCategory.skills) {
                        const availableSkill = new AvailableSkill({
                            theme: themeName,
                            category: categoryName,
                            subCategory: subCategoryName,
                            skill: skill
                        });
                        await availableSkill.save();
                    }
                }
            }
        }

        console.log('Skills successfully seeded');
        mongoose.connection.close();
    } catch (err) {
        console.log('Error seeding available skills:', err);
    }
};

seedAvailableSkills();
