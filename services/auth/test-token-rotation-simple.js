/**
 * Simplified Test for Refresh Token Rotation (API only, no DB access)
 *
 * This script tests:
 * 1. Login and initial token generation
 * 2. Token refresh and rotation
 * 3. Token reuse detection (security feature)
 */

const axios = require('axios');

const AUTH_URL = 'http://localhost:3000';
const CLIENT_ID = 'ecommerce-client';
const CLIENT_SECRET = 'ecommerce-secret-change-in-production';

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
  log(`\n${'='.repeat(70)}`, 'magenta');
  log(message, 'magenta');
  log('='.repeat(70), 'magenta');
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
  logSection('STEP 1: Register Test User');

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
      step: 'Initial Login',
      refresh_token: tokens.refresh
    });

    logSuccess('Login successful!');
    logInfo(`Access Token: ${tokens.access.substring(0, 30)}...`);
    logInfo(`Refresh Token: ${tokens.refresh.substring(0, 30)}...${tokens.refresh.substring(tokens.refresh.length - 10)}`);
    logInfo(`ID Token: ${tokens.id.substring(0, 30)}...`);

    return true;
  } catch (error) {
    logError(`Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Refresh token
 */
async function refreshToken(refreshTokenValue, stepName) {
  logSection(`${stepName}`);

  const oldRefreshToken = refreshTokenValue;

  try {
    logInfo(`Using refresh token: ${oldRefreshToken.substring(0, 20)}...`);

    const response = await axios.post(`${AUTH_URL}/v1/auth/oauth/token`, {
      grant_type: 'refresh_token',
      refresh_token: refreshTokenValue,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;
    const newIdToken = response.data.id_token;

    logSuccess('Token refresh successful!');
    logInfo(`New Access Token: ${newAccessToken.substring(0, 30)}...`);
    logInfo(`New Refresh Token: ${newRefreshToken.substring(0, 20)}...${newRefreshToken.substring(newRefreshToken.length - 10)}`);

    if (newRefreshToken !== oldRefreshToken) {
      logSuccess('✓ TOKEN ROTATION CONFIRMED! New refresh token issued');
      log(`  Old: ${oldRefreshToken.substring(0, 20)}...`, 'yellow');
      log(`  New: ${newRefreshToken.substring(0, 20)}...`, 'green');
    } else {
      logWarning('Token rotation NOT working - same token returned');
    }

    tokenHistory.push({
      step: stepName,
      old_refresh: oldRefreshToken,
      new_refresh: newRefreshToken,
      rotated: newRefreshToken !== oldRefreshToken
    });

    return {
      success: true,
      access: newAccessToken,
      refresh: newRefreshToken,
      id: newIdToken
    };
  } catch (error) {
    logError(`Token refresh failed!`);
    logError(`Error: ${error.response?.data?.error || error.message}`);
    logError(`Description: ${error.response?.data?.error_description || 'N/A'}`);
    return {
      success: false,
      error: error.response?.data
    };
  }
}

/**
 * Test token reuse detection
 */
async function testTokenReuse(oldRefreshToken) {
  logSection('STEP 6: Test Token Reuse Detection (Security Check)');

  logWarning('⚠️  Attempting to reuse an ALREADY USED refresh token...');
  logInfo(`Token: ${oldRefreshToken.substring(0, 20)}...`);
  log('This should FAIL if token rotation is working correctly!\n', 'yellow');

  try {
    const response = await axios.post(`${AUTH_URL}/v1/auth/oauth/token`, {
      grant_type: 'refresh_token',
      refresh_token: oldRefreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    logError('🚨 SECURITY ISSUE DETECTED! 🚨');
    logError('Token reuse was NOT detected - this is a security vulnerability!');
    logError('The server accepted an already-used token.');
    return false;
  } catch (error) {
    if (error.response?.data?.error === 'invalid_grant') {
      const description = error.response.data.error_description;

      if (description && description.includes('Token reuse detected')) {
        logSuccess('✓✓✓ TOKEN REUSE DETECTED! ✓✓✓');
        logSuccess('Security feature working correctly!');
        logInfo(`Server response: "${description}"`);
        log('\n🛡️  All tokens in the family have been revoked for security', 'green');
        return true;
      } else {
        logSuccess('✓ Token was rejected (marked as invalid)');
        logInfo(`Reason: ${description}`);
        return true;
      }
    }

    logWarning(`Unexpected error: ${error.response?.data?.error_description || error.message}`);
    return false;
  }
}

/**
 * Test that tokens cannot be used after family revocation
 */
async function testRevokedTokenUsage(revokedRefreshToken) {
  logSection('STEP 7: Verify Revoked Tokens Cannot Be Used');

  logInfo('Testing if the newest token (from Step 5) can still be used...');
  logInfo('(It should be rejected because the entire family was revoked)');
  logInfo(`Token: ${revokedRefreshToken.substring(0, 20)}...\n`);

  try {
    await axios.post(`${AUTH_URL}/v1/auth/oauth/token`, {
      grant_type: 'refresh_token',
      refresh_token: revokedRefreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    logError('🚨 SECURITY ISSUE: Token from revoked family was accepted!');
    return false;
  } catch (error) {
    if (error.response?.data?.error === 'invalid_grant') {
      logSuccess('✓ Token correctly rejected - family revocation working!');
      logInfo(`Reason: ${error.response.data.error_description}`);
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
  logSection('🚀 REFRESH TOKEN ROTATION TEST SUITE 🚀');
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

    // Store original tokens for later reuse test
    const originalRefreshToken = tokens.refresh;

    // Test 3: First refresh (rotation)
    results.total++;
    const firstTokenBeforeRefresh = tokens.refresh;
    const refresh1 = await refreshToken(tokens.refresh, 'STEP 3: First Token Refresh & Rotation');
    if (refresh1.success) {
      results.passed++;
      tokens.access = refresh1.access;
      tokens.refresh = refresh1.refresh;
    } else {
      results.failed++;
      throw new Error('First refresh failed');
    }

    // Test 4: Second refresh (rotation again)
    results.total++;
    const secondTokenBeforeRefresh = tokens.refresh;
    const refresh2 = await refreshToken(tokens.refresh, 'STEP 4: Second Token Refresh & Rotation');
    if (refresh2.success) {
      results.passed++;
      tokens.access = refresh2.access;
      tokens.refresh = refresh2.refresh;
    } else {
      results.failed++;
      throw new Error('Second refresh failed');
    }

    // Test 5: Third refresh (rotation again)
    results.total++;
    const thirdTokenBeforeRefresh = tokens.refresh;
    const refresh3 = await refreshToken(tokens.refresh, 'STEP 5: Third Token Refresh & Rotation');
    if (refresh3.success) {
      results.passed++;
      tokens.access = refresh3.access;
      tokens.refresh = refresh3.refresh;
    } else {
      results.failed++;
      throw new Error('Third refresh failed');
    }

    // Test 6: Token reuse detection (use old token from Step 4)
    results.total++;
    if (await testTokenReuse(secondTokenBeforeRefresh)) {
      results.passed++;
    } else {
      results.failed++;
      logWarning('Token reuse detection test failed');
    }

    // Test 7: Verify newest token is also revoked (family revocation)
    results.total++;
    if (await testRevokedTokenUsage(tokens.refresh)) {
      results.passed++;
    } else {
      results.failed++;
      logWarning('Family revocation test failed');
    }

  } catch (error) {
    logError(`\nTest suite error: ${error.message}`);
  }

  // Print summary
  logSection('📊 TEST SUMMARY');
  logInfo(`Total Tests: ${results.total}`);
  logSuccess(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    logError(`Failed: ${results.failed}`);
  }

  const percentage = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  log(`\nSuccess Rate: ${percentage}%`, percentage === '100.0' ? 'green' : 'yellow');

  if (results.passed === results.total) {
    logSection('🎉🎉🎉 ALL TESTS PASSED! 🎉🎉🎉');
    log('\n✓ Refresh token rotation is implemented correctly!', 'green');
    log('✓ Token reuse detection is working!', 'green');
    log('✓ Token family revocation is working!', 'green');
    log('\n🛡️  Your authentication system is now MORE SECURE! 🛡️\n', 'green');
  } else {
    logSection('⚠️  SOME TESTS FAILED ⚠️');
    log('Please review the failures above', 'yellow');
  }

  // Print token rotation history
  logSection('📜 TOKEN ROTATION HISTORY');
  tokenHistory.forEach((entry, index) => {
    log(`\n${index + 1}. ${entry.step}`, 'blue');
    if (entry.refresh_token) {
      logInfo(`   Initial Token: ${entry.refresh_token.substring(0, 30)}...`);
    }
    if (entry.old_refresh && entry.new_refresh) {
      const icon = entry.rotated ? '🔄' : '❌';
      log(`   ${icon} Old: ${entry.old_refresh.substring(0, 30)}...`, 'yellow');
      log(`   ${icon} New: ${entry.new_refresh.substring(0, 30)}...`, entry.rotated ? 'green' : 'red');
      log(`   Rotated: ${entry.rotated ? 'YES ✓' : 'NO ✗'}`, entry.rotated ? 'green' : 'red');
    }
  });

  log(''); // Empty line
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
