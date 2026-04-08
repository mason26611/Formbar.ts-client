import CryptoJS from "crypto-js";
import { http } from "./HTTPApi";

const SECRET_KEY =
	import.meta.env.VITE_ENCRYPTION_KEY || "default-key-change-in-prod";

function encryptToken(token: string): string {
	return CryptoJS.AES.encrypt(token, SECRET_KEY).toString();
}

function decryptToken(encrypted: string): string {
	try {
		// Check if it looks like encrypted data (AES encrypted strings start with "U2FsdGVk")
		const isLikelyEncrypted = encrypted.startsWith("U2FsdGVk");

		if (!isLikelyEncrypted) {
			// Assume it's plaintext (migration from old storage)
			return encrypted;
		}

		const decrypted = CryptoJS.AES.decrypt(encrypted, SECRET_KEY).toString(
			CryptoJS.enc.Utf8,
		);

		if (!decrypted) {
			console.error(
				"Decryption returned empty string - check SECRET_KEY",
			);
			return "";
		}

		return decrypted;
	} catch (e) {
		console.error("Failed to decrypt token:", e);
		return "";
	}
}

export function setRefreshToken(token: string) {
	localStorage.setItem("refreshToken", encryptToken(token));
}

export function getRefreshToken(): string | null {
	const encrypted = localStorage.getItem("refreshToken");
	return encrypted ? decryptToken(encrypted) : null;
}

export function clearAuthTokens() {
	localStorage.removeItem("refreshToken");
}

export function authLogin(email: string, password: string) {
	const body = new URLSearchParams({
		email,
		password,
		loginType: "login",
	});

	return http(
		"/auth/login",
		"POST",
		{
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body,
	);
}

export function refreshAuthToken(refreshToken: string) {
	return http("/auth/refresh", "POST", {}, { token: refreshToken });
}

export function registerUser(body : {email: string, password: string, displayName: string}) {
	return http("/auth/register", "POST", {}, body	);
}