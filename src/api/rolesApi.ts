import { http } from "./HTTPApi";

export function deleteRole(classId: number, roleId: number) {
	return http(`/class/${classId}/roles/${roleId}`, "DELETE");
}

export function removeRoleFromStudent(classId: number, roleId: number, studentId: string) {
	return http(`/class/${classId}/students/${studentId}/roles/${roleId}`, "DELETE");
}

export function getClassRoles(classId: number) {
	return http(`/class/${classId}/roles`);
}

export function getUserRoles(classId: number, studentId: string) {
	return http(`/class/${classId}/students/${studentId}/roles`);
}

export function updateRole(classId: number, roleId: number, body: {
	name: string,
	scopes: string[],
	color: string,
}) {
	return http(`/class/${classId}/roles/${roleId}`, "PATCH", {}, { ...body });
}

export function createRole(classId: number, body: {
	name: string,
	scopes: string[],
	color: string,
}) {
	return http(`/class/${classId}/roles`, "POST", {}, body);
}

export function addRoleToStudent(classId: number, roleId: number, studentId: string) {
	return http(`/class/${classId}/students/${studentId}/roles/${roleId}`, "POST");
}