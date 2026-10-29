const mongoose = require('mongoose');




const connectDB = async () => {
    try {
        const uri = process.env.DATABASEURI;
        await mongoose.connect(uri);

        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);

    }
};

module.exports = connectDB;
