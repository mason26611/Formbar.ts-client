import type { ClassData, CurrentUserData, ScopeKey, Student } from "../types";

function unique(items: string[]) {
	return Array.from(new Set(items));
}

function getStudentClassScopes(student: Student | null | undefined, classData: ClassData | null | undefined): string[] {
	if (!student || !classData) return [];

	// Class permissions are legacy data for older integrations; the app uses
	// explicit role assignments in roles.class as the source of truth.
	const roleIdSet = new Set((student.roles?.class || []).map((role) => role.id));
	const scopes = (classData.roles || [])
		.filter((role) => roleIdSet.has(role.id))
		.flatMap((role) => role.scopes || []);

	if (student.scopes?.class?.length) {
		scopes.push(...student.scopes.class);
	}

	return unique(scopes);
}

export function getStudentClassScopeCount(student: Student | null | undefined, classData: ClassData | null | undefined): number {
	if (!student) return 0;

	const roleScopeCount = getStudentClassScopes(student, classData).length;
	if (roleScopeCount > 0) {
		return roleScopeCount;
	}

	return 0;
}

export function currentUserHasScope(userData: CurrentUserData | null | undefined, scopeKey: ScopeKey): boolean {
	if (!userData) return false;

	const isGlobalScope = userData.scopes?.global?.includes(scopeKey);
	const isClassScope = userData.scopes?.class?.includes(scopeKey);

	return Boolean(isClassScope || isGlobalScope);
}
