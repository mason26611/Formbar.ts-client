import { http } from "@api/HTTPApi";

export function getTimer(classId: number) {
    return http(`/class/${classId}/timer`);
}

export function clearTimer(classId: number) {
    return http(`/class/${classId}/timer/clear`, "POST");
}

export function endTimer(classId: number) {
    return http(`/class/${classId}/timer/end`, "POST");
}

export function pauseTimer(classId: number) {
    return http(`/class/${classId}/timer/pause`, "POST");
}

export function resumeTimer(classId: number) {
    return http(`/class/${classId}/timer/resume`, "POST");
}

export function startTimer(classId: number, duration: number, sound: boolean = false) {
    return http(`/class/${classId}/timer/start`, "POST", {}, { duration, sound });
}