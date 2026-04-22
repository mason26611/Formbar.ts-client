import { http } from "@api/HTTPApi";

export function getNotifications() {
	return http("/notifications");
}

export function getNotificationById(notificationId: string) {
	return http(`/notifications/${encodeURIComponent(notificationId)}`);
}

export function markNotificationAsRead(notificationId: string) {
	return http(`/notifications/${encodeURIComponent(notificationId)}/mark-read`, "POST", {}, { read: true });
}

export function deleteAllNotifications() {
	return http("/notifications", "DELETE");
}

export function deleteNotificationById(notificationId: string) {
	return http(`/notifications/${encodeURIComponent(notificationId)}`, "DELETE");
}
