/**
 * User Role Constants
 *
 * Numeric codes for user roles throughout the system.
 * Using numbers instead of strings provides better performance,
 * smaller storage footprint, and type safety.
 *
 * IMPORTANT: These constants must be synchronized across all services:
 * - Auth Service
 * - Users Service
 * - Products Service (for admin-only operations)
 * - Orders Service (for admin-only operations)
 *
 * @constant {Object} USER_ROLE_CODE - Numeric role codes
 * @constant {Object} USER_ROLE_NAME - Human-readable names
 * @constant {Object} USER_ROLE_DISPLAY - Display labels
 * @constant {Object} USER_ROLE_DESCRIPTION - Detailed descriptions
 * @constant {Object} USER_ROLE_PERMISSIONS - Permission sets
 */

// Numeric role codes (stored in database)
const USER_ROLE_CODE = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
};

// Human-readable role names
const USER_ROLE_NAME = {
  1: 'user',
  2: 'moderator',
  3: 'admin',
};

// Display labels (for UI)
const USER_ROLE_DISPLAY = {
  1: 'User',
  2: 'Moderator',
  3: 'Administrator',
};

// Role descriptions
const USER_ROLE_DESCRIPTION = {
  1: 'Standard user with basic permissions',
  2: 'Moderator with content management permissions',
  3: 'Administrator with full system access',
};

// Permission hierarchies (higher number = more permissions)
const USER_ROLE_LEVEL = {
  1: 1, // User: Level 1
  2: 2, // Moderator: Level 2
  3: 3, // Admin: Level 3 (highest)
};

// Permission sets for each role
const USER_ROLE_PERMISSIONS = {
  1: {
    // User permissions
    canViewProducts: true,
    canPurchase: true,
    canManageOwnOrders: true,
    canManageOwnProfile: true,
    canManageProducts: false,
    canManageOrders: false,
    canManageUsers: false,
    canViewAnalytics: false,
  },
  2: {
    // Moderator permissions
    canViewProducts: true,
    canPurchase: true,
    canManageOwnOrders: true,
    canManageOwnProfile: true,
    canManageProducts: true,    // ✓ Can manage products
    canManageOrders: true,       // ✓ Can view/update orders
    canManageUsers: false,       // ✗ Cannot manage users
    canViewAnalytics: true,      // ✓ Can view analytics
  },
  3: {
    // Admin permissions (full access)
    canViewProducts: true,
    canPurchase: true,
    canManageOwnOrders: true,
    canManageOwnProfile: true,
    canManageProducts: true,
    canManageOrders: true,
    canManageUsers: true,        // ✓ Can manage users
    canViewAnalytics: true,
    canManageSettings: true,     // ✓ Can manage system settings
  },
};

/**
 * Get role label from numeric code
 * @param {number} code - Role code (1-3)
 * @returns {string} Role label
 */
function getUserRoleLabel(code) {
  return USER_ROLE_NAME[code] || 'unknown';
}

/**
 * Get role code from label
 * @param {string} label - Role label ('user', 'admin', etc.)
 * @returns {number|null} Role code
 */
function getUserRoleCode(label) {
  const lowerLabel = label?.toLowerCase();
  const code = Object.keys(USER_ROLE_NAME).find(
    key => USER_ROLE_NAME[key] === lowerLabel
  );
  return code ? parseInt(code) : null;
}

/**
 * Get role display name
 * @param {number} code - Role code (1-3)
 * @returns {string} Display name
 */
function getUserRoleDisplay(code) {
  return USER_ROLE_DISPLAY[code] || 'Unknown Role';
}

/**
 * Get role description
 * @param {number} code - Role code (1-3)
 * @returns {string} Role description
 */
function getUserRoleDescription(code) {
  return USER_ROLE_DESCRIPTION[code] || 'Unknown user role';
}

/**
 * Get role permissions
 * @param {number} code - Role code (1-3)
 * @returns {Object} Permissions object
 */
function getUserRolePermissions(code) {
  return USER_ROLE_PERMISSIONS[code] || USER_ROLE_PERMISSIONS[1];
}

/**
 * Check if role has specific permission
 * @param {number} roleCode - Role code
 * @param {string} permission - Permission name
 * @returns {boolean} True if role has permission
 */
function hasPermission(roleCode, permission) {
  const permissions = getUserRolePermissions(roleCode);
  return permissions[permission] === true;
}

/**
 * Check if role is admin
 * @param {number} code - Role code
 * @returns {boolean} True if admin
 */
function isAdmin(code) {
  return code === USER_ROLE_CODE.ADMIN;
}

/**
 * Check if role is moderator or above
 * @param {number} code - Role code
 * @returns {boolean} True if moderator or admin
 */
function isModeratorOrAbove(code) {
  return code >= USER_ROLE_CODE.MODERATOR;
}

/**
 * Check if role has higher or equal level than another
 * @param {number} roleCode - Role to check
 * @param {number} requiredRoleCode - Required role level
 * @returns {boolean} True if role level is sufficient
 */
function hasRoleLevel(roleCode, requiredRoleCode) {
  return USER_ROLE_LEVEL[roleCode] >= USER_ROLE_LEVEL[requiredRoleCode];
}

/**
 * Validate role code
 * @param {number} code - Role code to validate
 * @returns {boolean} True if valid
 */
function isValidUserRole(code) {
  return code >= 1 && code <= 3;
}

/**
 * Get all valid role codes
 * @returns {number[]} Array of valid role codes
 */
function getAllUserRoles() {
  return Object.values(USER_ROLE_CODE);
}

/**
 * Convert string role or array of string roles to numeric
 * Useful for migration from string-based roles
 * @param {string|string[]} roles - Role(s) as string(s)
 * @returns {number|number[]} Numeric role code(s)
 */
function convertStringRolesToNumeric(roles) {
  if (Array.isArray(roles)) {
    return roles.map(role => getUserRoleCode(role)).filter(Boolean);
  }
  return getUserRoleCode(roles);
}

/**
 * Convert numeric role or array of numeric roles to strings
 * Useful for API responses or backward compatibility
 * @param {number|number[]} roles - Role(s) as number(s)
 * @returns {string|string[]} String role label(s)
 */
function convertNumericRolesToStrings(roles) {
  if (Array.isArray(roles)) {
    return roles.map(role => getUserRoleLabel(role)).filter(r => r !== 'unknown');
  }
  return getUserRoleLabel(roles);
}

/**
 * Get highest role from array of roles
 * @param {number[]} roles - Array of role codes
 * @returns {number} Highest role code
 */
function getHighestRole(roles) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return USER_ROLE_CODE.USER;
  }
  return Math.max(...roles);
}

module.exports = {
  USER_ROLE_CODE,
  USER_ROLE_NAME,
  USER_ROLE_DISPLAY,
  USER_ROLE_DESCRIPTION,
  USER_ROLE_LEVEL,
  USER_ROLE_PERMISSIONS,
  getUserRoleLabel,
  getUserRoleCode,
  getUserRoleDisplay,
  getUserRoleDescription,
  getUserRolePermissions,
  hasPermission,
  isAdmin,
  isModeratorOrAbove,
  hasRoleLevel,
  isValidUserRole,
  getAllUserRoles,
  convertStringRolesToNumeric,
  convertNumericRolesToStrings,
  getHighestRole,
};
