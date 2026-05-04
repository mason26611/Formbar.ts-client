import { http } from "@api/HTTPApi";

export type OAuthAuthorizeParams = {
	clientId: string;
	redirectUri: string;
	scope: string;
	state: string;
	responseType?: string;
};

export async function authorizeOAuthApp(params: OAuthAuthorizeParams): Promise<string> {
	const query = new URLSearchParams();
	query.set("client_id", params.clientId);
	query.set("redirect_uri", params.redirectUri);
	query.set("scope", params.scope);
	query.set("state", params.state);
	query.set("response_mode", "json");

	if (params.responseType) {
		query.set("response_type", params.responseType);
	}

	const response = await http(`/oauth/authorize?${query.toString()}`, "GET", {
		Accept: "application/json",
	});

	const redirectUrl = response?.data?.redirectUrl;
	if (typeof redirectUrl !== "string" || !redirectUrl) {
		throw new Error("OAuth authorization did not return a redirect URL.");
	}

	return redirectUrl;
}