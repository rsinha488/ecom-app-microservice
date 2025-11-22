const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  client_id: {
    type: String,
    required: true,
    unique: true
  },
  client_secret: {
    type: String,
    required: true
  },
  client_name: {
    type: String,
    required: true
  },
  redirect_uris: [{
    type: String,
    required: true
  }],
  grant_types: [{
    type: String,
    enum: ['authorization_code', 'refresh_token', 'client_credentials', 'password'],
    default: 'authorization_code'
  }],
  response_types: [{
    type: String,
    enum: ['code', 'token', 'id_token'],
    default: 'code'
  }],
  scope: [{
    type: String,
    default: 'openid profile email'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Single field indexes
// Note: client_id index is created automatically by unique: true in schema
clientSchema.index({ isActive: 1 });

// Compound indexes
clientSchema.index({ isActive: 1, grant_types: 1 });

module.exports = mongoose.model('Client', clientSchema);
