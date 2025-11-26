require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Client = require('../models/Client');

/**
 * Script to seed initial OAuth2 client
 * Run: node utils/seedClient.js
 */

const seedClient = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Check if client already exists
    const existingClient = await Client.findOne({ client_id: process.env.CLIENT_ID });

    if (existingClient) {
      console.log('Client already exists:', existingClient.client_id);
      process.exit(0);
    }

    // Create default client
    const client = new Client({
      client_id: process.env.CLIENT_ID || 'ecommerce-client',
      client_secret: process.env.CLIENT_SECRET || 'ecommerce-client-secret',
      client_name: 'E-commerce Platform',
      redirect_uris: [
        'http://localhost:3000/callback',
        'http://localhost:3001/callback',
        'http://localhost:3002/callback',
        'http://localhost:3003/callback',
        'http://localhost:3004/callback'
      ],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: ['openid', 'profile', 'email', 'address', 'phone'],
      isActive: true
    });

    await client.save();
    console.log('Client created successfully:');
    console.log('Client ID:', client.client_id);
    console.log('Redirect URIs:', client.redirect_uris);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding client:', error);
    process.exit(1);
  }
};

seedClient();
