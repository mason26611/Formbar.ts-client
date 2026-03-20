import { io, Socket } from "socket.io-client";
import Log from "./debugLogger";
import { authLogin, refreshAuthToken, setRefreshToken, getRefreshToken, clearAuthTokens } from "./api/authApi";

//! ONLY UNTIL LOGIN IS IMPLEMENTED
export const formbarUrl = import.meta.env.VITE_FORMBAR_API_URL || "http://localhost:420";

export let refreshToken: string = getRefreshToken() || "";
export let accessToken: string = "";
export let socket: Socket;

type SocketEventHandlers = {
	onConnect?: () => void;
	onConnectError?: (err: any) => void;
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

export function socketLogin(token?: string) {
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
				let { refreshToken } = data;
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
			accessToken = newAccessToken;

			socket = io(formbarUrl, {
				extraHeaders: {
					authorization: `Bearer ${newAccessToken}`,
				},
				autoConnect: false,
				reconnectionAttempts: 5,
				reconnectionDelay: 2000,
			});

			attachEventHandlers(); // Attach handlers after socket is created
			socket.connect();
		})
		.catch((err) => {
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