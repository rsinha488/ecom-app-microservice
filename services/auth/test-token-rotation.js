/**
 * Test script for Refresh Token Rotation
 *
 * This script tests:
 * 1. Login and initial token generation
 * 2. Token refresh and rotation
 * 3. Token reuse detection (security feature)
 * 4. Token family revocation on reuse
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const AUTH_URL = process.env.ISSUER || 'http://localhost:3000';
const CLIENT_ID = process.env.DEFAULT_CLIENT_ID || 'ecommerce-client';
const CLIENT_SECRET = process.env.DEFAULT_CLIENT_SECRET || 'ecommerce-secret-change-in-production';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'magenta');
  log(message, 'magenta');
  log('='.repeat(60), 'magenta');
}

// Test user credentials
const testUser = {
  email: `test_rotation_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Token Rotation Test User'
};

let tokens = {
  access: null,
  refresh: null,
  id: null
};

let tokenHistory = [];

/**
 * Step 1: Register a test user
 */
async function registerUser() {
  logSection('STEP 1: Registering Test User');

  try {
    const response = await axios.post(`${AUTH_URL}/v1/auth/register`, {
      email: testUser.email,
      password: testUser.password,
      name: testUser.name
    });

    logSuccess(`User registered: ${testUser.email}`);
    return true;
  } catch (error) {
    if (error.response?.data?.error === 'DuplicateEmail') {
      logWarning('User already exists, continuing...');
      return true;
    }
    logError(`Registration failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Step 2: Login and get initial tokens
 */
async function login() {
  logSection('STEP 2: Login and Get Initial Tokens');

  try {
    const response = await axios.post(`${AUTH_URL}/v1/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    tokens.access = response.data.accessToken;
    tokens.refresh = response.data.refreshToken;
    tokens.id = response.data.idToken;

    tokenHistory.push({
      step: 'login',
      refresh_token: tokens.refresh,
      timestamp: new Date()
    });

    logSuccess('Login successful');
    logInfo(`Access Token: ${tokens.access.substring(0, 50)}...`);
    logInfo(`Refresh Token: ${tokens.refresh}`);
    logInfo(`ID Token: ${tokens.id.substring(0, 50)}...`);

    return true;
  } catch (error) {
    logError(`Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Step 3: Verify token in database
 */
async function verifyTokenInDatabase(tokenValue) {
  logSection('STEP 3: Verify Token in Database');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logSuccess('Connected to MongoDB');

    const RefreshToken = mongoose.model('RefreshToken', new mongoose.Schema({}, { strict: false }));

    const tokenDoc = await RefreshToken.findOne({ token: tokenValue });

    if (tokenDoc) {
      logSuccess('Token found in database');
      logInfo(`Token ID: ${tokenDoc._id}`);
      logInfo(`Family ID: ${tokenDoc.family_id}`);
      logInfo(`Used: ${tokenDoc.used}`);
      logInfo(`Revoked: ${tokenDoc.revoked}`);
      logInfo(`Expires At: ${tokenDoc.expires_at}`);

      if (tokenDoc.replaced_by) {
        logInfo(`Replaced By: ${tokenDoc.replaced_by}`);
      }

      if (tokenDoc.used_at) {
        logInfo(`Used At: ${tokenDoc.used_at}`);
      }

      return tokenDoc;
    } else {
      logError('Token not found in database');
      return null;
    }
  } catch (error) {
    logError(`Database verification failed: ${error.message}`);
    return null;
  }
}

/**
 * Step 4: Refresh token (first time)
 */
async function refreshToken(refreshTokenValue, stepName = 'Token Refresh') {
  logSection(`STEP 4: ${stepName}`);

  const oldRefreshToken = refreshTokenValue;

  try {
    const response = await axios.post(`${AUTH_URL}/v1/auth/oauth/token`, {
      grant_type: 'refresh_token',
      refresh_token: refreshTokenValue,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;

    logSuccess('Token refresh successful');
    logInfo(`Old Refresh Token: ${oldRefreshToken}`);
    logInfo(`New Access Token: ${newAccessToken.substring(0, 50)}...`);
    logInfo(`New Refresh Token: ${newRefreshToken}`);

    if (newRefreshToken !== oldRefreshToken) {
      logSuccess('✓ Token rotation working! New refresh token issued');
    } else {
      logWarning('Token rotation NOT working - same token returned');
    }

    tokenHistory.push({
      step: stepName,
      old_refresh: oldRefreshToken,
      new_refresh: newRefreshToken,
      timestamp: new Date()
    });

    return {
      success: true,
      access: newAccessToken,
      refresh: newRefreshToken
    };
  } catch (error) {
    logError(`Token refresh failed: ${error.response?.data?.error_description || error.message}`);
    return {
      success: false,
      error: error.response?.data
    };
  }
}

/**
 * Step 5: Test token reuse detection
 */
async function testTokenReuse(oldRefreshToken) {
  logSection('STEP 5: Test Token Reuse Detection (Security Test)');

  logWarning('Attempting to reuse an old (already used) refresh token...');
  logInfo(`Token to reuse: ${oldRefreshToken}`);

  try {
    const response = await axios.post(`${AUTH_URL}/v1/auth/oauth/token`, {
      grant_type: 'refresh_token',
      refresh_token: oldRefreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    logError('SECURITY ISSUE: Token reuse was not detected! This should have failed.');
    return false;
  } catch (error) {
    if (error.response?.data?.error === 'invalid_grant') {
      logSuccess('✓ Token reuse detected successfully!');
      logInfo(`Error message: ${error.response.data.error_description}`);

      if (error.response.data.error_description.includes('Token reuse detected')) {
        logSuccess('✓ Security feature working: Token family revoked');
        return true;
      }
    }

    logWarning(`Unexpected error: ${error.response?.data?.error_description || error.message}`);
    return false;
  }
}

/**
 * Step 6: Verify all tokens in family are revoked
 */
async function verifyFamilyRevocation(familyId) {
  logSection('STEP 6: Verify Token Family Revocation');

  try {
    const RefreshToken = mongoose.model('RefreshToken', new mongoose.Schema({}, { strict: false }));

    const tokensInFamily = await RefreshToken.find({ family_id: familyId });

    logInfo(`Tokens in family: ${tokensInFamily.length}`);

    let allRevoked = true;

    tokensInFamily.forEach((token, index) => {
      logInfo(`\nToken ${index + 1}:`);
      logInfo(`  Token: ${token.token.substring(0, 20)}...`);
      logInfo(`  Used: ${token.used}`);
      logInfo(`  Revoked: ${token.revoked}`);

      if (!token.revoked) {
        allRevoked = false;
        logError('  ✗ This token should be revoked!');
      } else {
        logSuccess('  ✓ Correctly revoked');
      }
    });

    if (allRevoked) {
      logSuccess('\n✓ All tokens in family correctly revoked');
      return true;
    } else {
      logError('\n✗ Some tokens in family are not revoked');
      return false;
    }
  } catch (error) {
    logError(`Family verification failed: ${error.message}`);
    return false;
  }
}

/**
 * Step 7: Test that new tokens cannot be used after family revocation
 */
async function testRevokedTokenUsage(revokedRefreshToken) {
  logSection('STEP 7: Test Revoked Token Cannot Be Used');

  logInfo('Attempting to use a token from revoked family...');

  try {
    await axios.post(`${AUTH_URL}/v1/auth/oauth/token`, {
      grant_type: 'refresh_token',
      refresh_token: revokedRefreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    logError('SECURITY ISSUE: Revoked token was accepted! This should have failed.');
    return false;
  } catch (error) {
    if (error.response?.data?.error === 'invalid_grant') {
      logSuccess('✓ Revoked token correctly rejected');
      logInfo(`Error message: ${error.response.data.error_description}`);
      return true;
    }

    logWarning(`Unexpected error: ${error.response?.data?.error_description || error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  logSection('🚀 REFRESH TOKEN ROTATION TEST SUITE');
  logInfo(`Auth URL: ${AUTH_URL}`);
  logInfo(`Client ID: ${CLIENT_ID}`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  try {
    // Test 1: Register user
    results.total++;
    if (await registerUser()) {
      results.passed++;
    } else {
      results.failed++;
      throw new Error('Registration failed');
    }

    // Test 2: Login
    results.total++;
    if (await login()) {
      results.passed++;
    } else {
      results.failed++;
      throw new Error('Login failed');
    }

    // Test 3: Verify initial token in database
    results.total++;
    const initialTokenDoc = await verifyTokenInDatabase(tokens.refresh);
    if (initialTokenDoc) {
      results.passed++;
    } else {
      results.failed++;
      throw new Error('Token verification failed');
    }

    const familyId = initialTokenDoc.family_id;
    logInfo(`\n📝 Token Family ID: ${familyId}`);

    // Test 4: First refresh (rotation)
    results.total++;
    const oldToken1 = tokens.refresh;
    const refresh1 = await refreshToken(tokens.refresh, 'First Token Refresh');
    if (refresh1.success) {
      results.passed++;
      tokens.access = refresh1.access;
      tokens.refresh = refresh1.refresh;
    } else {
      results.failed++;
      throw new Error('First refresh failed');
    }

    // Verify old token is marked as used
    logInfo('\nVerifying old token is marked as used...');
    const usedToken1 = await verifyTokenInDatabase(oldToken1);
    if (usedToken1 && usedToken1.used) {
      logSuccess('✓ Old token correctly marked as used');
    } else {
      logError('✗ Old token not marked as used');
    }

    // Test 5: Second refresh (rotation again)
    results.total++;
    const oldToken2 = tokens.refresh;
    const refresh2 = await refreshToken(tokens.refresh, 'Second Token Refresh');
    if (refresh2.success) {
      results.passed++;
      tokens.access = refresh2.access;
      tokens.refresh = refresh2.refresh;
    } else {
      results.failed++;
      throw new Error('Second refresh failed');
    }

    // Test 6: Third refresh (rotation again)
    results.total++;
    const oldToken3 = tokens.refresh;
    const refresh3 = await refreshToken(tokens.refresh, 'Third Token Refresh');
    if (refresh3.success) {
      results.passed++;
      tokens.access = refresh3.access;
      tokens.refresh = refresh3.refresh;
    } else {
      results.failed++;
      throw new Error('Third refresh failed');
    }

    // Test 7: Token reuse detection (use old token)
    results.total++;
    if (await testTokenReuse(oldToken2)) {
      results.passed++;
    } else {
      results.failed++;
      logWarning('Token reuse detection test failed');
    }

    // Test 8: Verify family revocation
    results.total++;
    if (await verifyFamilyRevocation(familyId)) {
      results.passed++;
    } else {
      results.failed++;
      logWarning('Family revocation verification failed');
    }

    // Test 9: Test that newest token (from refresh3) cannot be used after family revocation
    results.total++;
    if (await testRevokedTokenUsage(tokens.refresh)) {
      results.passed++;
    } else {
      results.failed++;
      logWarning('Revoked token test failed');
    }

  } catch (error) {
    logError(`\nTest suite failed: ${error.message}`);
  } finally {
    // Disconnect from MongoDB
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      logInfo('\nDisconnected from MongoDB');
    }
  }

  // Print summary
  logSection('📊 TEST SUMMARY');
  logInfo(`Total Tests: ${results.total}`);
  logSuccess(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    logError(`Failed: ${results.failed}`);
  }

  const percentage = ((results.passed / results.total) * 100).toFixed(1);
  log(`\nSuccess Rate: ${percentage}%`, percentage === '100.0' ? 'green' : 'yellow');

  if (results.passed === results.total) {
    logSection('🎉 ALL TESTS PASSED! 🎉');
    log('Refresh token rotation is working correctly!', 'green');
  } else {
    logSection('⚠️  SOME TESTS FAILED');
    log('Please review the failures above', 'yellow');
  }

  // Print token history
  logSection('📜 TOKEN HISTORY');
  tokenHistory.forEach((entry, index) => {
    log(`\n${index + 1}. ${entry.step} - ${entry.timestamp.toISOString()}`, 'blue');
    if (entry.refresh_token) {
      logInfo(`   Refresh Token: ${entry.refresh_token}`);
    }
    if (entry.old_refresh) {
      logInfo(`   Old: ${entry.old_refresh}`);
      logInfo(`   New: ${entry.new_refresh}`);
    }
  });

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
