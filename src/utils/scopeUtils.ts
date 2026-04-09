import { SCOPES } from "../types";
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

function getStudentByUser(userData: CurrentUserData | null | undefined, classData: ClassData | null | undefined): Student | null {
	if (!userData || !classData?.students) return null;

	if (classData.students[userData.id]) {
		return classData.students[userData.id];
	}

	const students = Object.values(classData.students);
	return students.find((student) => student.id === userData.id || student.email === userData.email) || null;
}

function fallbackHasGlobalScope(permissionLevel: number | undefined, scopeKey: ScopeKey): boolean {
	const level = permissionLevel ?? 0;

	switch (scopeKey) {
		case SCOPES.GLOBAL.SYSTEM.actions.ADMIN.key:
			return level >= 5;
		case SCOPES.GLOBAL.SYSTEM.actions.MODERATE.key:
		case SCOPES.GLOBAL.CLASS.actions.CREATE.key:
		case SCOPES.GLOBAL.CLASS.actions.DELETE.key:
		case SCOPES.GLOBAL.USERS.actions.MANAGE.key:
		case SCOPES.GLOBAL.POOLS.actions.MANAGE.key:
		case SCOPES.GLOBAL.DIGIPOGS.actions.AWARD.key:
		case SCOPES.GLOBAL.DIGIPOGS.actions.TRANSFER.key:
			return level >= 4;
		case SCOPES.GLOBAL.SYSTEM.actions.BLOCKED.key:
			return level === 0;
		default:
			return false;
	}
}

function fallbackHasClassScope(classPermissionLevel: number | undefined | null, scopeKey: ScopeKey): boolean {
	const level = classPermissionLevel ?? 0;
	const isTeacherLevel = level >= 4;
	const isStudentLevel = level <= 2;

	if (scopeKey === SCOPES.CLASS.SESSION.actions.SETTINGS.key) return isTeacherLevel;
	if (scopeKey === SCOPES.CLASS.STUDENTS.actions.PERM_CHANGE.key) return isTeacherLevel;
	if (scopeKey === SCOPES.CLASS.POLL.actions.CREATE.key) return isTeacherLevel;
	if (scopeKey === SCOPES.CLASS.POLL.actions.VOTE.key) return isStudentLevel;
	if (scopeKey === SCOPES.CLASS.POLL.actions.READ.key) return isStudentLevel || isTeacherLevel;

	return false;
}

export function hasGlobalScope(userData: CurrentUserData | null | undefined, scopeKey: ScopeKey): boolean {
	if (!userData) return false;

	if (userData.scopes?.includes(scopeKey)) {
		return true;
	}

	return fallbackHasGlobalScope(userData.permissions, scopeKey);
}

export function hasClassScopeForStudent(student: Student | null | undefined, classData: ClassData | null | undefined, scopeKey: ScopeKey): boolean {
	if (!student) return false;

	const roleScopes = getClassRoleScopes(student, classData);
	if (roleScopes.includes(scopeKey)) {
		return true;
	}

	return fallbackHasClassScope(student.classPermissions, scopeKey);
}

export function hasCurrentUserClassScope(userData: CurrentUserData | null | undefined, classData: ClassData | null | undefined, scopeKey: ScopeKey): boolean {
	const student = getStudentByUser(userData, classData);
	if (student && hasClassScopeForStudent(student, classData, scopeKey)) {
		return true;
	}

	return fallbackHasClassScope(userData?.classPermissions, scopeKey);
}

export function canAccessTeacherPanel(userData: CurrentUserData | null | undefined, classData: ClassData | null | undefined): boolean {
	return hasCurrentUserClassScope(userData, classData, SCOPES.CLASS.SESSION.actions.SETTINGS.key);
}

export function canAccessStudentView(userData: CurrentUserData | null | undefined, classData: ClassData | null | undefined): boolean {
	return hasCurrentUserClassScope(userData, classData, SCOPES.CLASS.POLL.actions.VOTE.key);
}

export function isLearnerStudent(student: Student, classData: ClassData | null | undefined): boolean {
	return !hasClassScopeForStudent(student, classData, SCOPES.CLASS.SESSION.actions.SETTINGS.key);
}
