import type { ClassData, CurrentUserData, ScopeKey, Student } from "../types";

function unique(items: string[]) {
	return Array.from(new Set(items));
}

function getClassRoleScopes(student: Student | null | undefined, classData: ClassData | null | undefined): string[] {
	if (!student || !classData) return [];

	const roleIdSet = new Set((student.classRoles || []).map((role) => role.id));
	const scopes = (classData.roles || [])
		.filter((role) => roleIdSet.has(role.id))
		.flatMap((role) => role.scopes || []);

	if (student.scopes?.length) {
		scopes.push(...student.scopes);
	}

	return unique(scopes);
}

export function getStudentClassScopeCount(student: Student | null | undefined, classData: ClassData | null | undefined): number {
	if (!student) return 0;

	const roleScopeCount = getClassRoleScopes(student, classData).length;
	if (roleScopeCount > 0) {
		return roleScopeCount;
	}

	return Number(student.classPermissions ?? 0);
}

export function currentUserHasScope(userData: CurrentUserData | null | undefined, scopeKey: ScopeKey): boolean {
	if (!userData) return false;
	if (userData.globalScopes?.includes("global.system.admin")) return true; // Admin override for all scopes.

	const isGlobalScope = userData.globalScopes?.includes(scopeKey);
	const isClassScope = userData.classScopes?.includes(scopeKey);

	return (isClassScope || isGlobalScope) ?? false;
}

export function userHasAllScopes(userData: CurrentUserData | null | undefined, scopeKeys: ScopeKey[]): boolean {
	if (!userData) return false;
	return scopeKeys.every((scopeKey) => currentUserHasScope(userData, scopeKey));
}

export function userHasAnyScope(userData: CurrentUserData | null | undefined, scopeKeys: ScopeKey[]): boolean {
	if (!userData) return false;
	return scopeKeys.some((scopeKey) => currentUserHasScope(userData, scopeKey));
}