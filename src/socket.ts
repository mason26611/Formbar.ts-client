import { io, Socket } from "socket.io-client";
import Log from "./debugLogger";
import {
	authLogin,
	refreshAuthToken,
	setRefreshToken,
	getRefreshToken,
	clearAuthTokens,
	getGuestAccessToken,
	setGuestAccessToken,
} from "./api/authApi";

//! ONLY UNTIL LOGIN IS IMPLEMENTED
export const formbarUrl = import.meta.env.VITE_FORMBAR_API_URL || "http://localhost:420";

export let refreshToken: string = getRefreshToken() || "";
export let accessToken: string = getGuestAccessToken() || "";
export let socket: Socket;

type SocketEventHandlers = {
	onConnect?: () => void;
	onConnectError?: (err: unknown) => void;
	onDisconnect?: (reason: string) => void;
	onSetClass?: (classID: number) => void;
};

let eventHandlers: SocketEventHandlers = {};

export function registerSocketEventHandlers(handlers: SocketEventHandlers) {
	eventHandlers = handlers;
	attachEventHandlers();
}

function attachEventHandlers() {
	if (!socket) return;

	if (eventHandlers.onConnect) {
		socket.on("connect", eventHandlers.onConnect);
	}

	if (eventHandlers.onConnectError) {
		socket.on("connect_error", eventHandlers.onConnectError);
	}

	if (eventHandlers.onDisconnect) {
		socket.on("disconnect", eventHandlers.onDisconnect);
	}

	if (eventHandlers.onSetClass) {
		socket.on("setClass", eventHandlers.onSetClass);
	}
}

function clearInMemoryAuth() {
	refreshToken = "";
	accessToken = "";
}

function connectSocketWithAccessToken(nextAccessToken: string) {
	accessToken = nextAccessToken;

	if (socket) {
		socket.removeAllListeners();
		socket.disconnect();
	}

	socket = io(formbarUrl, {
		extraHeaders: {
			authorization: `Bearer ${nextAccessToken}`,
		},
		autoConnect: false,
		reconnectionAttempts: 5,
		reconnectionDelay: 2000,
	});

	attachEventHandlers();
	socket.connect();
}

export function socketLogin(
	token?: string,
	tokenType: "refresh" | "access" = "refresh",
) {
	if (tokenType === "access") {
		const accessTokenToUse = token || getGuestAccessToken() || "";
		if (!accessTokenToUse) {
			Log({ message: "No guest access token available", level: "error" });
			window.dispatchEvent(new CustomEvent("formbar:authfailed"));
			return;
		}

		clearAuthTokens();
		setGuestAccessToken(accessTokenToUse);
		clearInMemoryAuth();
		Log({ message: "Starting guest session", level: "info" });
		connectSocketWithAccessToken(accessTokenToUse);
		return;
	}

	// Get the decrypted token from storage, or use the parameter as fallback
	const tokenToUse = getRefreshToken() || token || "";

	if (!tokenToUse) {
		Log({ message: "No refresh token available", level: "error" });
		window.dispatchEvent(new CustomEvent("formbar:authfailed"));
		return;
	}

	refreshAuthToken(tokenToUse)
		.then(async (res) => {
			if (!res.ok) {
				clearAuthTokens();
				clearInMemoryAuth();
				Log({ message: "Failed to refresh token", level: "error" });

				// Get cached credentials from sessionStorage (lost on page refresh)
				const cachedCreds = sessionStorage.getItem("formbarLoginCreds");
				if (!cachedCreds) {
					window.dispatchEvent(new CustomEvent("formbar:authfailed"));
					return null;
				}

				const [email, password] = JSON.parse(cachedCreds);
				const loginResponse = await authLogin(email, password);
				if (!loginResponse.ok) {
					throw new Error("Login failed", { cause: loginResponse.error });
				}
				const { data } = loginResponse;
				const { refreshToken } = data;
				Log({ message: "Login successful", data: loginResponse });

				// Delegate to a fresh socketLogin call and stop this chain
				// so the next .then() is not reached with undefined.
				socketLogin(refreshToken);
				return null;
			}

			const { data } = res;
			const {
				accessToken: newAccessToken,
				refreshToken: newRefreshToken,
			} = data;
			Log({ message: "Token refreshed successfully", data });

			setRefreshToken(newRefreshToken);
			refreshToken = newRefreshToken;
			connectSocketWithAccessToken(newAccessToken);
		})
		.catch((err) => {
			clearInMemoryAuth();
			Log({
				message: "Error refreshing token",
				data: err,
				level: "error",
			});
			// Signal the app that all auth attempts have failed so it can clear
			// stale tokens and return the user to the login page.
			window.dispatchEvent(new CustomEvent("formbar:authfailed"));
		});

}

setInterval(() => {
	if (refreshToken) {
		socketLogin(refreshToken);
	}
}, 15 * 60 * 1000); // Refresh every 10 minutes
