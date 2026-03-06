import { Alert, Button, Card, Flex, Space, Table, Tag, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import FormbarHeader from "../components/FormbarHeader";
import { getAppearAnimation, useSettings, useUserData } from "../main";
import { accessToken, formbarUrl } from "../socket";
import { Permissions, type CurrentUserData } from "../types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type TestStatus = "pending" | "running" | "passed" | "failed" | "skipped";

type ApiResponse = {
	ok: boolean;
	status: number;
	body: unknown;
	rawText: string;
};

type TestResult = {
	key: string;
	category: string;
	label: string;
	method: HttpMethod;
	path: string;
	status: TestStatus;
	statusCode?: number;
	details: string;
	durationMs?: number;
};

type StaticIssue = {
	key: string;
	category: string;
	method: HttpMethod;
	path: string;
	reason: string;
};

type NotificationRecord = {
	id: number | string;
	is_read?: boolean;
	[key: string]: unknown;
};

type LogListRecord = {
	logs?: string[];
};

type CurrentLoginData = CurrentUserData & {
	classId?: number | null;
	digipogs?: number;
};

type TestingContext = {
	me: CurrentLoginData;
	activeClassId: string | null;
	classPermissionLevel: number;
	isManager: boolean;
	notifications: NotificationRecord[];
	logs: string[];
};

type AutoTestSpec = {
	key: string;
	category: string;
	label: string;
	method: HttpMethod;
	path: string | ((context: TestingContext) => string);
	skip?: (context: TestingContext) => string | null;
	onSuccess?: (context: TestingContext, response: ApiResponse) => void;
};

const AUTO_TEST_SPECS: AutoTestSpec[] = [
	{
		key: "config",
		category: "System",
		label: "Server config",
		method: "GET",
		path: "/config",
	},
	{
		key: "certs",
		category: "System",
		label: "Public certs",
		method: "GET",
		path: "/certs",
	},
	{
		key: "self-profile",
		category: "User",
		label: "Self profile",
		method: "GET",
		path: (context) => `/user/${context.me.id}`,
	},
	{
		key: "self-classes",
		category: "User",
		label: "Self classes",
		method: "GET",
		path: (context) => `/user/${context.me.id}/classes`,
	},
	{
		key: "self-active-class",
		category: "User",
		label: "Self active class",
		method: "GET",
		path: (context) => `/user/${context.me.id}/class`,
		skip: (context) =>
			context.activeClassId ? null : "Current login is not in an active class.",
	},
	{
		key: "self-transactions",
		category: "User",
		label: "Self transactions",
		method: "GET",
		path: (context) => `/user/${context.me.id}/transactions?limit=5&offset=0`,
	},
	{
		key: "self-pools",
		category: "Pools",
		label: "Self pools",
		method: "GET",
		path: (context) => `/user/${context.me.id}/pools?limit=5&offset=0`,
	},
	{
		key: "notifications",
		category: "Notifications",
		label: "Notifications inbox",
		method: "GET",
		path: "/notifications",
		onSuccess: (context, response) => {
			const data = getResponseData<{ notifications?: NotificationRecord[] }>(
				response.body,
			);
			context.notifications = Array.isArray(data?.notifications)
				? data.notifications
				: [];
		},
	},
	{
		key: "notification-detail",
		category: "Notifications",
		label: "Single notification",
		method: "GET",
		path: (context) => `/notifications/${encodeURIComponent(String(context.notifications[0].id))}`,
		skip: (context) =>
			context.notifications.length > 0
				? null
				: "Current login has no notifications to inspect.",
	},
	{
		key: "manager",
		category: "Manager",
		label: "Manager dashboard",
		method: "GET",
		path: "/manager?limit=10&offset=0",
		skip: (context) =>
			context.isManager ? null : "Current login is not a manager.",
	},
	{
		key: "logs",
		category: "Logs",
		label: "Log index",
		method: "GET",
		path: "/logs",
		skip: (context) =>
			context.isManager ? null : "Current login is not a manager.",
		onSuccess: (context, response) => {
			const data = getResponseData<LogListRecord>(response.body);
			context.logs = Array.isArray(data?.logs) ? data.logs : [];
		},
	},
	{
		key: "log-detail",
		category: "Logs",
		label: "Single log file",
		method: "GET",
		path: (context) => `/logs/${encodeURIComponent(context.logs[0])}`,
		skip: (context) => {
			if (!context.isManager) {
				return "Current login is not a manager.";
			}
			return context.logs.length > 0
				? null
				: "No log file name was available from /logs.";
		},
	},
	{
		key: "ip-whitelist",
		category: "IP",
		label: "Whitelist IPs",
		method: "GET",
		path: "/ip/whitelist",
		skip: (context) =>
			context.isManager ? null : "Current login is not a manager.",
	},
	{
		key: "ip-blacklist",
		category: "IP",
		label: "Blacklist IPs",
		method: "GET",
		path: "/ip/blacklist",
		skip: (context) =>
			context.isManager ? null : "Current login is not a manager.",
	},
	{
		key: "class-overview",
		category: "Class",
		label: "Current class overview",
		method: "GET",
		path: (context) => `/class/${context.activeClassId}`,
		skip: (context) =>
			context.activeClassId ? null : "Current login is not in an active class.",
	},
	{
		key: "class-permissions",
		category: "Class",
		label: "Current class permissions",
		method: "GET",
		path: (context) => `/class/${context.activeClassId}/permissions`,
		skip: (context) =>
			context.activeClassId ? null : "Current login is not in an active class.",
	},
	{
		key: "class-polls-current",
		category: "Class - Polls",
		label: "Current poll",
		method: "GET",
		path: (context) => `/class/${context.activeClassId}/polls/current`,
		skip: (context) =>
			context.activeClassId ? null : "Current login is not in an active class.",
	},
	{
		key: "class-polls-history",
		category: "Class - Polls",
		label: "Poll history",
		method: "GET",
		path: (context) => `/class/${context.activeClassId}/polls?limit=5&index=0`,
		skip: (context) =>
			context.activeClassId ? null : "Current login is not in an active class.",
	},
	{
		key: "room-tags",
		category: "Room",
		label: "Room tags",
		method: "GET",
		path: "/room/tags",
		skip: (context) =>
			context.activeClassId ? null : "Current login is not in an active class.",
	},
	{
		key: "room-links",
		category: "Room - Links",
		label: "Room links",
		method: "GET",
		path: (context) => `/room/${context.activeClassId}/links`,
		skip: (context) =>
			context.activeClassId ? null : "Current login is not in an active class.",
	},
	{
		key: "student-page",
		category: "Student",
		label: "Student page payload",
		method: "GET",
		path: "/student",
		skip: (context) =>
			context.activeClassId ? null : "Current login is not in an active class.",
	},
	{
		key: "class-active",
		category: "Class",
		label: "Class active flag",
		method: "GET",
		path: (context) => `/class/${context.activeClassId}/active`,
		skip: (context) => {
			if (!context.activeClassId) {
				return "Current login is not in an active class.";
			}
			return context.classPermissionLevel >= Permissions.TEACHER
				? null
				: "Current login does not have manage-class permissions.";
		},
	},
	{
		key: "class-students",
		category: "Class",
		label: "Class students",
		method: "GET",
		path: (context) => `/class/${context.activeClassId}/students`,
		skip: (context) => {
			if (!context.activeClassId) {
				return "Current login is not in an active class.";
			}
			return context.classPermissionLevel >= Permissions.TEACHER
				? null
				: "Current login does not have manage-class permissions.";
		},
	},
	{
		key: "class-banned",
		category: "Class",
		label: "Class banned users",
		method: "GET",
		path: (context) => `/class/${context.activeClassId}/banned`,
		skip: (context) => {
			if (!context.activeClassId) {
				return "Current login is not in an active class.";
			}
			return context.classPermissionLevel >= Permissions.TEACHER
				? null
				: "Current login does not have teacher-level class permissions.";
		},
	},
];

const UNSUPPORTED_ENDPOINTS: StaticIssue[] = [
	{ key: "api-permission-check", category: "System", method: "GET", path: "/apiPermissionCheck", reason: "Needs a raw API key, which the current login flow does not expose to the client." },
	{ key: "auth-login", category: "Auth", method: "POST", path: "/auth/login", reason: "Login flow is outside a current-session endpoint sweep." },
	{ key: "auth-refresh", category: "Auth", method: "POST", path: "/auth/refresh", reason: "Refresh mutates session tokens and is already exercised by the app bootstrap." },
	{ key: "auth-register", category: "Auth", method: "POST", path: "/auth/register", reason: "Requires creating a brand new account." },
	{ key: "auth-google", category: "Auth", method: "GET", path: "/auth/google", reason: "Requires an external OAuth redirect flow." },
	{ key: "auth-google-callback", category: "Auth", method: "GET", path: "/auth/google/callback", reason: "Requires an external OAuth callback payload." },
	{ key: "oauth-authorize", category: "OAuth", method: "GET", path: "/oauth/authorize", reason: "Requires third-party app query parameters and redirect handling." },
	{ key: "oauth-token", category: "OAuth", method: "POST", path: "/oauth/token", reason: "Needs an authorization code or refresh token from an external OAuth flow." },
	{ key: "oauth-revoke", category: "OAuth", method: "POST", path: "/oauth/revoke", reason: "Needs a token issued for an external OAuth client." },
	{ key: "verify-email-page", category: "User", method: "GET", path: "/user/verify/email", reason: "Requires a live email verification token from outside the current session." },
	{ key: "verify-request", category: "User", method: "POST", path: "/user/:id/verify/request", reason: "Sends a real verification email." },
	{ key: "verify-user", category: "User", method: "PATCH", path: "/user/:id/verify", reason: "Mutates another user's verification state." },
	{ key: "verify-user-legacy", category: "User", method: "POST", path: "/user/:id/verify", reason: "Legacy mutating alias of the verify endpoint." },
	{ key: "delete-user", category: "User", method: "DELETE", path: "/user/:id", reason: "Destructive user deletion should not auto-run from the client." },
	{ key: "delete-user-legacy", category: "User", method: "GET", path: "/user/:id/delete", reason: "Legacy destructive alias should not auto-run from the client." },
	{ key: "change-perm", category: "User", method: "PATCH", path: "/user/:email/perm", reason: "Mutates global permissions for a target user." },
	{ key: "change-perm-legacy", category: "User", method: "POST", path: "/user/:email/perm", reason: "Legacy mutating alias of the permission endpoint." },
	{ key: "ban-user", category: "User", method: "PATCH", path: "/user/:id/ban", reason: "Mutates another user's access state." },
	{ key: "ban-user-legacy", category: "User", method: "GET", path: "/user/:id/ban", reason: "Legacy mutating alias of the ban endpoint." },
	{ key: "unban-user", category: "User", method: "PATCH", path: "/user/:id/unban", reason: "Mutates another user's access state." },
	{ key: "unban-user-legacy", category: "User", method: "GET", path: "/user/:id/unban", reason: "Legacy mutating alias of the unban endpoint." },
	{ key: "regen-api-key", category: "User", method: "POST", path: "/user/:id/api/regenerate", reason: "Regenerates a real API key and invalidates the prior key." },
	{ key: "pin-update", category: "User", method: "PATCH", path: "/user/:id/pin", reason: "Mutates the active user's PIN." },
	{ key: "pin-verify", category: "User", method: "POST", path: "/user/:id/pin/verify", reason: "Needs a real PIN value from the user." },
	{ key: "pin-reset-request", category: "User", method: "POST", path: "/user/:id/pin/reset", reason: "Sends a real PIN reset email." },
	{ key: "pin-reset-token", category: "User", method: "PATCH", path: "/user/pin/reset", reason: "Requires a live PIN reset token from email." },
	{ key: "password-update", category: "User", method: "PATCH", path: "/user/me/password", reason: "Mutates the active user's password." },
	{ key: "password-reset", category: "User", method: "POST", path: "/user/me/password/reset", reason: "Sends a real password reset email." },
	{ key: "notifications-mark-read", category: "Notifications", method: "POST", path: "/notifications/:id/mark-read", reason: "Mutates notification state." },
	{ key: "notifications-delete-one", category: "Notifications", method: "DELETE", path: "/notifications/:id", reason: "Deletes real user data." },
	{ key: "notifications-delete-all", category: "Notifications", method: "DELETE", path: "/notifications/", reason: "Deletes the entire inbox." },
	{ key: "class-create", category: "Class", method: "POST", path: "/class/create", reason: "Creates a persistent class record." },
	{ key: "class-start", category: "Class", method: "POST", path: "/class/:id/start", reason: "Mutates live classroom state for real users." },
	{ key: "class-end", category: "Class", method: "POST", path: "/class/:id/end", reason: "Mutates live classroom state for real users." },
	{ key: "class-join", category: "Class", method: "POST", path: "/class/:id/join", reason: "Changes the active class for the current session." },
	{ key: "class-leave", category: "Class", method: "POST", path: "/class/:id/leave", reason: "Changes the active class for the current session." },
	{ key: "break-request", category: "Class - Breaks", method: "POST", path: "/class/:id/break/request", reason: "Mutates live classroom break state." },
	{ key: "break-end", category: "Class - Breaks", method: "POST", path: "/class/:id/break/end", reason: "Mutates live classroom break state." },
	{ key: "break-approve", category: "Class - Breaks", method: "POST", path: "/class/:id/students/:userId/break/approve", reason: "Mutates another user's live classroom state." },
	{ key: "break-approve-legacy", category: "Class - Breaks", method: "GET", path: "/class/:id/students/:userId/break/approve", reason: "Legacy mutating alias of the break approval endpoint." },
	{ key: "break-deny", category: "Class - Breaks", method: "POST", path: "/class/:id/students/:userId/break/deny", reason: "Mutates another user's live classroom state." },
	{ key: "help-request", category: "Class - Help", method: "POST", path: "/class/:id/help/request", reason: "Mutates live classroom help state." },
	{ key: "help-request-legacy", category: "Class - Help", method: "GET", path: "/class/:id/help/request", reason: "Legacy mutating alias of the help endpoint." },
	{ key: "help-delete", category: "Class - Help", method: "DELETE", path: "/class/:id/students/:userId/help", reason: "Mutates another user's live classroom state." },
	{ key: "help-delete-legacy", category: "Class - Help", method: "GET", path: "/class/:id/students/:userId/help/delete", reason: "Legacy mutating alias of the help deletion endpoint." },
	{ key: "poll-clear", category: "Class - Polls", method: "POST", path: "/class/:id/polls/clear", reason: "Clears live poll state." },
	{ key: "poll-create", category: "Class - Polls", method: "POST", path: "/class/:id/polls/create", reason: "Creates a live poll for a real classroom." },
	{ key: "poll-end", category: "Class - Polls", method: "POST", path: "/class/:id/polls/end", reason: "Mutates live poll state." },
	{ key: "poll-response", category: "Class - Polls", method: "POST", path: "/class/:id/polls/response", reason: "Submits a real poll response for the current user." },
	{ key: "room-join", category: "Room", method: "POST", path: "/room/:code/join", reason: "Changes the current room/class session." },
	{ key: "room-leave", category: "Room", method: "DELETE", path: "/room/:id/leave", reason: "Changes the current room/class session." },
	{ key: "room-leave-legacy", category: "Room", method: "POST", path: "/room/:id/leave", reason: "Legacy mutating alias of the room leave endpoint." },
	{ key: "room-tags-put", category: "Room", method: "PUT", path: "/room/tags", reason: "Mutates the current room tags." },
	{ key: "room-tags-post", category: "Room", method: "POST", path: "/room/tags", reason: "Legacy mutating alias of the room tags endpoint." },
	{ key: "room-link-add", category: "Room - Links", method: "POST", path: "/room/:id/links/add", reason: "Mutates shared room links." },
	{ key: "room-link-change", category: "Room - Links", method: "PUT", path: "/room/:id/links", reason: "Mutates shared room links." },
	{ key: "room-link-change-legacy", category: "Room - Links", method: "POST", path: "/room/:id/links/change", reason: "Legacy mutating alias of the room links update endpoint." },
	{ key: "room-link-remove", category: "Room - Links", method: "DELETE", path: "/room/:id/links", reason: "Mutates shared room links." },
	{ key: "room-link-remove-legacy", category: "Room - Links", method: "POST", path: "/room/:id/links/remove", reason: "Legacy mutating alias of the room links removal endpoint." },
	{ key: "student-post", category: "Student", method: "POST", path: "/student", reason: "Submits a real student poll response." },
	{ key: "digipogs-award", category: "Digipogs", method: "POST", path: "/digipogs/award", reason: "Mutates digipog balances for a live classroom." },
	{ key: "digipogs-transfer", category: "Digipogs", method: "POST", path: "/digipogs/transfer", reason: "Mutates digipog balances for real users." },
	{ key: "ip-add", category: "IP", method: "POST", path: "/ip/:type", reason: "Mutates server IP access configuration." },
	{ key: "ip-update", category: "IP", method: "PUT", path: "/ip/:type/:id", reason: "Mutates server IP access configuration." },
	{ key: "ip-delete", category: "IP", method: "DELETE", path: "/ip/:type/:id", reason: "Mutates server IP access configuration." },
	{ key: "ip-toggle", category: "IP", method: "POST", path: "/ip/:type/toggle", reason: "Mutates server IP access configuration and writes .env." },
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getResponseData<T>(payload: unknown): T | undefined {
	if (!isRecord(payload) || !("data" in payload)) {
		return undefined;
	}
	return payload.data as T;
}

function summarizePayload(payload: unknown): string {
	if (typeof payload === "string") {
		return truncate(payload);
	}

	if (isRecord(payload)) {
		if ("error" in payload) {
			const errorValue = payload.error;
			if (typeof errorValue === "string") {
				return truncate(errorValue);
			}
			if (isRecord(errorValue) && typeof errorValue.message === "string") {
				return truncate(errorValue.message);
			}
		}

		if ("message" in payload && typeof payload.message === "string") {
			return truncate(payload.message);
		}
	}

	try {
		return truncate(JSON.stringify(payload));
	} catch {
		return "Response received.";
	}
}

function truncate(value: string, limit = 160): string {
	return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function getStatusTag(status: TestStatus) {
	switch (status) {
		case "passed":
			return <Tag color="green">Passed</Tag>;
		case "failed":
			return <Tag color="red">Failed</Tag>;
		case "running":
			return <Tag color="blue">Running</Tag>;
		case "skipped":
			return <Tag color="orange">Skipped</Tag>;
		default:
			return <Tag>Pending</Tag>;
	}
}

async function callApi(path: string, method: HttpMethod): Promise<ApiResponse> {
	const response = await fetch(`${formbarUrl}/api/v1${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});
	const rawText = await response.text();
	let body: unknown = rawText;
	if (rawText) {
		try {
			body = JSON.parse(rawText);
		} catch {
			body = rawText;
		}
	}

	const bodySuccess =
		isRecord(body) && typeof body.success === "boolean" ? body.success : undefined;
	const hasStructuredError = isRecord(body) && "error" in body;

	return {
		ok: response.ok && bodySuccess !== false && !hasStructuredError,
		status: response.status,
		body,
		rawText,
	};
}

async function loadContext(): Promise<{
	context: TestingContext;
	meResult: ApiResponse;
}> {
	const meResult = await callApi("/user/me", "GET");
	const me = getResponseData<CurrentLoginData>(meResult.body);
	if (!meResult.ok || !me?.id) {
		throw new Error(summarizePayload(meResult.body) || "Failed to load /user/me.");
	}

	return {
		meResult,
		context: {
			me,
			activeClassId:
				me.activeClass != null
					? String(me.activeClass)
					: me.classId != null
						? String(me.classId)
						: null,
			classPermissionLevel:
				typeof me.classPermissions === "number" ? me.classPermissions : 0,
			isManager: me.permissions >= Permissions.MANAGER,
			notifications: [],
			logs: [],
		},
	};
}

export function Testing() {
	const { settings } = useSettings();
	const { userData } = useUserData();
	const autoRunKeyRef = useRef<string | null>(null);
	const runSuiteRef = useRef<() => Promise<void>>(async () => {});
	const [results, setResults] = useState<TestResult[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const [fatalError, setFatalError] = useState<string | null>(null);
	const [runStartedAt, setRunStartedAt] = useState<string | null>(null);

	const updateResult = (key: string, updater: (result: TestResult) => TestResult) => {
		setResults((current) =>
			current.map((result) => (result.key === key ? updater(result) : result)),
		);
	};

	runSuiteRef.current = async () => {
		if (!accessToken) {
			setFatalError(
				"No access token is available yet. Open this page after the current login finishes bootstrapping.",
			);
			return;
		}

		setIsRunning(true);
		setFatalError(null);
		setRunStartedAt(new Date().toLocaleTimeString());

		const initialResults: TestResult[] = [
			{
				key: "me",
				category: "User",
				label: "Current login",
				method: "GET",
				path: "/user/me",
				status: "pending",
				details: "",
			},
			...AUTO_TEST_SPECS.map((spec) => ({
				key: spec.key,
				category: spec.category,
				label: spec.label,
				method: spec.method,
				path: typeof spec.path === "string" ? spec.path : "",
				status: "pending" as TestStatus,
				details: "",
			})),
		];
		setResults(initialResults);

		try {
			updateResult("me", (result) => ({ ...result, status: "running" }));
			const startedAt = performance.now();
			const { context, meResult } = await loadContext();
			updateResult("me", (result) => ({
				...result,
				status: meResult.ok ? "passed" : "failed",
				statusCode: meResult.status,
				durationMs: Math.round(performance.now() - startedAt),
				details: summarizePayload(meResult.body),
			}));

			for (const spec of AUTO_TEST_SPECS) {
				const skipReason = spec.skip?.(context);
				const resolvedPath =
					typeof spec.path === "string" ? spec.path : spec.path(context);

				if (skipReason) {
					updateResult(spec.key, (result) => ({
						...result,
						path: resolvedPath,
						status: "skipped",
						details: skipReason,
					}));
					continue;
				}

				updateResult(spec.key, (result) => ({
					...result,
					path: resolvedPath,
					status: "running",
					details: "",
				}));

				const requestStartedAt = performance.now();
				try {
					const response = await callApi(resolvedPath, spec.method);
					spec.onSuccess?.(context, response);
					updateResult(spec.key, (result) => ({
						...result,
						status: response.ok ? "passed" : "failed",
						statusCode: response.status,
						durationMs: Math.round(performance.now() - requestStartedAt),
						details: summarizePayload(response.body),
					}));
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Request failed.";
					updateResult(spec.key, (result) => ({
						...result,
						status: "failed",
						durationMs: Math.round(performance.now() - requestStartedAt),
						details: message,
					}));
				}
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to bootstrap test context.";
			setFatalError(message);
			updateResult("me", (result) => ({
				...result,
				status: "failed",
				details: message,
			}));
		} finally {
			setIsRunning(false);
		}
	};

	const handleRunSuite = () => {
		void runSuiteRef.current();
	};

	useEffect(() => {
		if (!userData?.id) {
			return;
		}

		const nextKey = String(userData.id);
		if (autoRunKeyRef.current === nextKey) {
			return;
		}

		autoRunKeyRef.current = nextKey;
		void runSuiteRef.current();
	}, [userData?.id]);

	const passedCount = results.filter((result) => result.status === "passed").length;
	const failedCount = results.filter((result) => result.status === "failed").length;
	const skippedCount = results.filter((result) => result.status === "skipped").length;

	return (
		<div style={{ padding: "0 20px" }}>
			<FormbarHeader />
			<Flex
				vertical
				gap={16}
				style={{
					padding: "16px 0 32px",
					minHeight: "calc(100vh - 60px)",
					overflow: "auto",
				}}
			>
				<Card
					style={{
						background: "#000a",
						...getAppearAnimation(settings.disableAnimations, 0),
					}}
				>
					<Flex justify="space-between" align="center" wrap gap={16}>
						<div>
							<Typography.Title level={2} style={{ margin: 0 }}>
								Endpoint Testing
							</Typography.Title>
							<Typography.Paragraph style={{ margin: "8px 0 0" }}>
								This page auto-runs the safe endpoint suite using the current login
								context and records anything that cannot be tested safely from the
								client.
							</Typography.Paragraph>
							<Typography.Text type="secondary">
								Last run: {runStartedAt || "Not run yet"}
							</Typography.Text>
						</div>
						<Button type="primary" onClick={handleRunSuite} loading={isRunning}>
							Run Suite Again
						</Button>
					</Flex>
				</Card>

				<Space wrap size={[12, 12]} style={getAppearAnimation(settings.disableAnimations, 1)}>
					<Tag color="green">Passed: {passedCount}</Tag>
					<Tag color="red">Failed: {failedCount}</Tag>
					<Tag color="orange">Skipped: {skippedCount}</Tag>
					<Tag color="blue">Not auto-run: {UNSUPPORTED_ENDPOINTS.length}</Tag>
				</Space>

				{fatalError ? (
					<Alert
						type="error"
						showIcon
						message="Suite bootstrap failed"
						description={fatalError}
						style={getAppearAnimation(settings.disableAnimations, 2)}
					/>
				) : null}

				<Alert
					type="info"
					showIcon
					message="Auto-run scope"
					description="Read-only endpoints run automatically. Endpoints that mutate user, class, notification, digipog, IP, auth, or OAuth state are listed below as intentionally not auto-run."
					style={getAppearAnimation(settings.disableAnimations, 3)}
				/>

				<Card
					title="Auto-Run Results"
					style={{
						background: "#000a",
						...getAppearAnimation(settings.disableAnimations, 4),
					}}
				>
					<Table<TestResult>
						rowKey="key"
						size="small"
						pagination={false}
						dataSource={results}
						columns={[
							{
								title: "Category",
								dataIndex: "category",
								key: "category",
								width: 140,
							},
							{
								title: "Method",
								dataIndex: "method",
								key: "method",
								width: 90,
								render: (value: HttpMethod) => <Tag>{value}</Tag>,
							},
							{
								title: "Endpoint",
								key: "endpoint",
								render: (_, record) => (
									<div>
										<div>{record.label}</div>
										<Typography.Text type="secondary">{record.path}</Typography.Text>
									</div>
								),
							},
							{
								title: "Status",
								dataIndex: "status",
								key: "status",
								width: 110,
								render: (value: TestStatus) => getStatusTag(value),
							},
							{
								title: "Details",
								dataIndex: "details",
								key: "details",
							},
							{
								title: "Time",
								key: "durationMs",
								width: 90,
								render: (_, record) =>
									record.durationMs != null ? `${record.durationMs} ms` : "--",
							},
						]}
					/>
				</Card>

				<Card
					title="Not Auto-Run"
					style={{
						background: "#000a",
						...getAppearAnimation(settings.disableAnimations, 5),
					}}
				>
					<Table<StaticIssue>
						rowKey="key"
						size="small"
						pagination={{ pageSize: 12 }}
						dataSource={UNSUPPORTED_ENDPOINTS}
						columns={[
							{
								title: "Category",
								dataIndex: "category",
								key: "category",
								width: 140,
							},
							{
								title: "Method",
								dataIndex: "method",
								key: "method",
								width: 90,
								render: (value: HttpMethod) => <Tag>{value}</Tag>,
							},
							{
								title: "Endpoint",
								dataIndex: "path",
								key: "path",
							},
							{
								title: "Reason",
								dataIndex: "reason",
								key: "reason",
							},
						]}
					/>
				</Card>
			</Flex>
		</div>
	);
}
