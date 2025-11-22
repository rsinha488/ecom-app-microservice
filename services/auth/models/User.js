const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  given_name: {
    type: String,
    trim: true
  },
  family_name: {
    type: String,
    trim: true
  },
  picture: {
    type: String
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  phone_number: {
    type: String
  },
  phone_number_verified: {
    type: Boolean,
    default: false
  },
  address: {
    street_address: String,
    locality: String,
    region: String,
    postal_code: String,
    country: String
  },
  roles: [{
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get OpenID Connect user info
userSchema.methods.getOIDCUserInfo = function() {
  return {
    sub: this._id.toString(),
    email: this.email,
    email_verified: this.email_verified,
    name: this.name,
    given_name: this.given_name,
    family_name: this.family_name,
    picture: this.picture,
    phone_number: this.phone_number,
    phone_number_verified: this.phone_number_verified,
    address: this.address,
    updated_at: this.updatedAt
  };
};

// Single field indexes
// Note: email index is created automatically by unique: true in schema
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Compound indexes
userSchema.index({ isActive: 1, roles: 1 });
userSchema.index({ email_verified: 1, isActive: 1 });

// Text index for search
userSchema.index({ name: 'text', email: 'text' });

module.exports = mongoose.model('User', userSchema);
