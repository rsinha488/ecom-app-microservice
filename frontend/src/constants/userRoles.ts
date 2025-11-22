/**
 * User Role Constants (Frontend)
 *
 * Numeric codes for user roles - synchronized with backend
 * Backend: services/shared/constants/userRoles.js
 */

export enum UserRoleCode {
  USER = 1,
  MODERATOR = 2,
  ADMIN = 3,
}

export const USER_ROLE_NAME: Record<number, string> = {
  1: 'user',
  2: 'moderator',
  3: 'admin',
};

export const USER_ROLE_DISPLAY: Record<number, string> = {
  1: 'User',
  2: 'Moderator',
  3: 'Administrator',
};

export const USER_ROLE_DESCRIPTION: Record<number, string> = {
  1: 'Standard user with basic permissions',
  2: 'Moderator with content management permissions',
  3: 'Administrator with full system access',
};

export const USER_ROLE_LEVEL: Record<number, number> = {
  1: 1, // User: Level 1
  2: 2, // Moderator: Level 2
  3: 3, // Admin: Level 3 (highest)
};

export interface UserPermissions {
  canViewProducts: boolean;
  canPurchase: boolean;
  canManageOwnOrders: boolean;
  canManageOwnProfile: boolean;
  canManageProducts: boolean;
  canManageOrders: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canManageSettings?: boolean;
}

export const USER_ROLE_PERMISSIONS: Record<number, UserPermissions> = {
  1: {
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
    canViewProducts: true,
    canPurchase: true,
    canManageOwnOrders: true,
    canManageOwnProfile: true,
    canManageProducts: true,
    canManageOrders: true,
    canManageUsers: false,
    canViewAnalytics: true,
  },
  3: {
    canViewProducts: true,
    canPurchase: true,
    canManageOwnOrders: true,
    canManageOwnProfile: true,
    canManageProducts: true,
    canManageOrders: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canManageSettings: true,
  },
};

/**
 * Get role label from numeric code
 */
export function getUserRoleLabel(code: number): string {
  return USER_ROLE_NAME[code] || 'unknown';
}

/**
 * Get role code from label
 */
export function getUserRoleCode(label: string): number | null {
  const lowerLabel = label?.toLowerCase();
  const code = Object.keys(USER_ROLE_NAME).find(
    key => USER_ROLE_NAME[parseInt(key)] === lowerLabel
  );
  return code ? parseInt(code) : null;
}

/**
 * Get role display name
 */
export function getUserRoleDisplay(code: number): string {
  return USER_ROLE_DISPLAY[code] || 'Unknown Role';
}

/**
 * Get role description
 */
export function getUserRoleDescription(code: number): string {
  return USER_ROLE_DESCRIPTION[code] || 'Unknown user role';
}

/**
 * Get role permissions
 */
export function getUserRolePermissions(code: number): UserPermissions {
  return USER_ROLE_PERMISSIONS[code] || USER_ROLE_PERMISSIONS[1];
}

/**
 * Check if role has specific permission
 */
export function hasPermission(roleCode: number, permission: keyof UserPermissions): boolean {
  const permissions = getUserRolePermissions(roleCode);
  return permissions[permission] === true;
}

/**
 * Check if role is admin
 */
export function isAdmin(code: number): boolean {
  return code === UserRoleCode.ADMIN;
}

/**
 * Check if role is moderator or above
 */
export function isModeratorOrAbove(code: number): boolean {
  return code >= UserRoleCode.MODERATOR;
}

/**
 * Check if role has higher or equal level than another
 */
export function hasRoleLevel(roleCode: number, requiredRoleCode: number): boolean {
  return USER_ROLE_LEVEL[roleCode] >= USER_ROLE_LEVEL[requiredRoleCode];
}

/**
 * Validate role code
 */
export function isValidUserRole(code: number): boolean {
  return code >= 1 && code <= 3;
}

/**
 * Get all valid role codes
 */
export function getAllUserRoles(): number[] {
  return Object.values(UserRoleCode).filter((v) => typeof v === 'number') as number[];
}

/**
 * Convert string role or array of string roles to numeric
 */
export function convertStringRolesToNumeric(roles: string | string[]): number | number[] | null {
  if (Array.isArray(roles)) {
    return roles.map(role => getUserRoleCode(role)).filter((code): code is number => code !== null);
  }
  return getUserRoleCode(roles);
}

/**
 * Convert numeric role or array of numeric roles to strings
 */
export function convertNumericRolesToStrings(roles: number | number[]): string | string[] {
  if (Array.isArray(roles)) {
    return roles.map(role => getUserRoleLabel(role)).filter(r => r !== 'unknown');
  }
  return getUserRoleLabel(roles);
}

/**
 * Get highest role from array of roles
 */
export function getHighestRole(roles: number[]): number {
  if (!Array.isArray(roles) || roles.length === 0) {
    return UserRoleCode.USER;
  }
  return Math.max(...roles);
}
