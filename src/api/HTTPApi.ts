import { accessToken } from "@utils/socket";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
const apiVersion = "v1";

function getToken() {
	return accessToken;
}

export async function http(
	path: string,
	method: HttpMethod = "GET",
    headers?: Record<string, string>,
	body?: unknown,
): Promise<any> {
	const baseUrl = import.meta.env.VITE_FORMBAR_API_URL ?? "";
	const token = getToken();

	const res = await fetch(`${baseUrl}/api/${apiVersion}${path}`, {
		method,
		headers: {
			"Content-Type": headers?.["Content-Type"] || "application/json",
            Authorization: token ? `Bearer ${token}` : "",
			...(headers || {}),
		},
		...(body !== undefined ? { body: body instanceof URLSearchParams ? body.toString() : JSON.stringify(body) } : {}),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`${text || res.statusText}`);
	}

	// Handles 204 No Content
	if (res.status === 204) return undefined;

    const response = await res.json();
    response.ok = res.ok;

	return response;
}
