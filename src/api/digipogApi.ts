import { http } from "@api/HTTPApi";

// POST: Award digipogs
export function awardDigipogs(body: {
    studentId: string,
    amount: number,
}) {
    return http("/digipogs/award", "POST", {}, body);
}

// POST: Transfer digipogs
export function transferDigipogs(body: {
    to: string,
    amount: number,
    pin: string,
    reason: string
}) {
    return http("/digipogs/transfer", "POST", {}, body);
}