import type { LoginResponse, MeResponse, StaffMember } from '../../../api/schemas';

export type LoginProfile = NonNullable<LoginResponse['profile']>;
export type LoginUser = NonNullable<LoginResponse['user']>;

const MANAGER_ROLES = new Set(['manager', 'admin', 'owner']);

export function normalizeRole(role?: string | null): string {
  return role?.trim().toLowerCase() ?? '';
}

export function isManagerRole(role?: string | null): boolean {
  return MANAGER_ROLES.has(normalizeRole(role));
}

export function resolveMatchingStaff(
  staffList: StaffMember[],
  userId?: string | null,
): StaffMember | null {
  if (!userId || staffList.length === 0) {
    return null;
  }
  return staffList.find(staff => staff.id === userId) ?? null;
}

export interface ResolveIsManagerInput {
  loginProfile?: LoginProfile | null;
  me?: MeResponse | null;
  activeStaff?: StaffMember | null;
}

/**
 * Resolves whether the authenticated HORECA user has manager privileges.
 * Prioritizes the authoritative `loginResponse.profile.role`, then `me.role` / permissions,
 * and falls back to `activeStaff` when no explicit profile role is present.
 */
export function resolveIsManager({
  loginProfile,
  me,
  activeStaff,
}: ResolveIsManagerInput): boolean {
  const profileRole = normalizeRole(loginProfile?.role);
  if (profileRole) {
    return isManagerRole(profileRole);
  }

  if (isManagerRole(me?.role)) {
    return true;
  }

  if (me?.permissions?.includes('reports:read')) {
    return true;
  }

  return (
    isManagerRole(activeStaff?.access) ||
    isManagerRole(activeStaff?.role)
  );
}
