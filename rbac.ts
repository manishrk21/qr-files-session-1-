// lib/auth/rbac.ts
export type AdminRole = 'owner' | 'admin' | 'staff';

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  owner: ['*'],
  admin: ['menu:*', 'orders:*', 'tables:*', 'customers:read', 'analytics:read', 'settings:read', 'settings:update'],
  staff: ['orders:read', 'orders:update_status'],
};

export function hasPermission(role: AdminRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.includes('*')) return true;
  if (perms.includes(permission)) return true;
  const [resource] = permission.split(':');
  return perms.includes(`${resource}:*`);
}

export function requirePermission(role: AdminRole, permission: string): void {
  if (!hasPermission(role, permission)) {
    throw new PermissionError(`Role '${role}' lacks permission '${permission}'`);
  }
}

export class PermissionError extends Error {
  readonly code = 'FORBIDDEN';
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}
