const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Users DB connected successfully');
  } catch (error) {
    console.error('Users DB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
