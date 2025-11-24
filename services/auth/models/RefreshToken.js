const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  client_id: {
    type: String,
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scope: [{
    type: String
  }],
  expires_at: {
    type: Date,
    required: true
  },
  revoked: {
    type: Boolean,
    default: false
  },
  // Token rotation fields
  family_id: {
    type: String,
    required: true,
    index: true
  },
  replaced_by: {
    type: String,
    default: null
  },
  used: {
    type: Boolean,
    default: false
  },
  used_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Auto-delete expired tokens
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
