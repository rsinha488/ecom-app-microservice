const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Orders DB connected successfully');
  } catch (error) {
    console.error('Orders DB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
