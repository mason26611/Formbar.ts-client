import { http } from "@api/HTTPApi";

// POST: Award digipogs
export function awardDigipogs(body: {
    studentId: number,
    amount: number,
}) {
    return http("/digipogs/award", "POST", {}, body);
}

// POST: Transfer digipogs
export function transferDigipogs(body: {
	from: number,
    to: number,
    amount: number,
    pin: string,
    reason: string
}) {
    return http("/digipogs/transfer", "POST", {}, body);
}