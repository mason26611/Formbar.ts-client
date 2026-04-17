export type CurrentUserData = {
	API: string;
	activeClass: number | null;
	break: boolean;
	classPermissions: number | null;
	classScopes?: string[];
	classRoles: Array<{
		id: number;
		name: string;
	}>;
	digipogs: number;
	displayName: string;
	email: string;
	help: boolean;
	id: string;
	isGuest: boolean;
	ownedPolls: any[];
	permissions: number;
	globalScopes?: string[];
	pogMeter: number;
	pollRes: { buttonRes: string; textRes: string; time: number | null };
	sharedPolls: any[];
	tags: any[];
	verified?: number;
};

export type UserData = {
	displayName: string;
	email: string;
	id: number;
	permissions: number;
	verified: number;
};

export type ClassData = {
	id: number;
	className: string;
	isActive: boolean;
	owner: number;
	timer: {
		startTime: number;
		endTime: number;
		active: boolean;
		sound: boolean;
	};
	poll: {
		allowMultipleResponses: boolean;
		allowTextResponses: boolean;
		allowVoteChanges: boolean;
		blind: boolean;
		excludedRespondents: any[];
		prompt: string;
        responses: any[];
        status: boolean;
        totalResponders: number;
        totalResponses: number;
        startTime: number;
        weight: number;
	};
	permissions: {
		links: number;
		controlPoll: number;
		manageStudents: number;
		breakHelp: number;
		manageClass: number;
		auxiliary: number;
		userDefaults: number;
		seePoll: number;
		votePoll: number;
	};
	roles: Array<{
		id: number;
		color: string;
		name: string;
		scopes: string[];
	}>
	key: string;
	tags: string[];
	settings: {
		mute: boolean;
		filter: any;
		sort: any;
		isExcluded: {
			guests: boolean;
			mods: boolean;
			teachers: boolean;
		};
	};
	students: Record<string, Student>;
};

export type PollAnswer = {
	answer: string;
	color: string;
	responses: number;
	weight: number;
};

export type Transaction = {
	amount: number;
	date: string;
	from?: {
		id: number | null;
		type: string;
		username?: string | null;
	};
	to?: {
		id: number | null;
		type: string;
		username?: string | null;
	};
	reason: string;
	// Legacy fields kept optional for backward compatibility.
	from_user?: number | null;
	to_user?: number | null;
	pool?: number | null;
};

export type Class = {
	id: string;
	name: string;
	key: string;
	owner: string;
	isActive: boolean;
	students: Student[];
};

export type ClassInfo = {
	id: string;
	name: string;
	isActive: boolean;
};

export type Student = {
	help: any;
	break: boolean;
	pollRes: any;
	tags: Array<string>;
    isGuest: boolean;
	id: string;
	email: string;
	displayName: string;
	permissions: number;
	scopes?: string[];
	digipogs: number;
	classRoles: Array<{
		id: number;
		name: string;
	}>;
	classPermissions: number;
};

export type Poll = {
	id?: string;
	prompt: string;
	responses: any[];
	blind: boolean;
	allowTextResponses: boolean;
	allowMultipleResponses: boolean;
    allowVoteChanges: boolean;
    status: boolean;
    totalResponders: number;
    totalResponses: number;
};

export const SCOPES = {
	GLOBAL: {
		CLASS: {
			title: "Class",
			actions: {
				CREATE: { key: "global.class.create", label: "Create", description: "Create classes" },
				DELETE: { key: "global.class.delete", label: "Delete", description: "Delete classes" },
			},
		},
		USERS: {
			title: "Users",
			actions: {
				MANAGE: { key: "global.users.manage", label: "Manage", description: "Manage users" },
			},
		},
		DIGIPOGS: {
			title: "Digipogs",
			actions: {
				AWARD: { key: "global.digipogs.award", label: "Award", description: "Award digipogs globally" },
				TRANSFER: { key: "global.digipogs.transfer", label: "Transfer", description: "Transfer digipogs globally" },
			},
		},
		POOLS: {
			title: "Pools",
			actions: {
				MANAGE: { key: "global.pools.manage", label: "Manage", description: "Manage pools" },
			},
		},
		SYSTEM: {
			title: "System",
			actions: {
				ADMIN: { key: "global.system.admin", label: "Admin", description: "Full system administration" },
				MODERATE: { key: "global.system.moderate", label: "Moderate", description: "Moderate system features" },
				BLOCKED: { key: "global.system.blocked", label: "Blocked", description: "Blocked from system usage" },
			},
		},
	},
	CLASS: {
        SYSTEM: {
			title: 'System',
			actions: {
				ADMIN: { key: "class.system.admin", label: "Admin", description: "Overrides all other permissions." },
				PANEL_ACCESS: { key: "class.system.panel_access", label: "Panel Access", description: "Access to the teacher control panel." },
				// BLOCKED: { key: "class.system.blocked", label: "Blocked", description: "Blocked from system usage" },
			}
        },
		POLL: {
			title: "Polls",
			actions: {
				READ: { key: "class.poll.read", label: "Read", description: "View and see polls" },
				VOTE: { key: "class.poll.vote", label: "Vote", description: "Submit poll responses" },
				CREATE: { key: "class.poll.create", label: "Create", description: "Create new polls" },
				END: { key: "class.poll.end", label: "End", description: "End active polls" },
				DELETE: { key: "class.poll.delete", label: "Delete", description: "Delete polls" },
				SHARE: { key: "class.poll.share", label: "Share", description: "Share polls with others" },
			},
		},
		ROLES: {
			title: "Roles",
			actions: {
				ASSIGN: { key: "class.roles.assign", label: "Assign", description: "Assign roles to students" },
				READ: { key: "class.roles.read", label: "Read", description: "View roles and their permissions" },
				MANAGE: { key: "class.roles.manage", label: "Manage", description: "Create and manage roles" },
			},
		},
		STUDENTS: {
			title: "Students",
			actions: {
				READ: { key: "class.students.read", label: "Read", description: "View student information" },
				KICK: { key: "class.students.kick", label: "Kick", description: "Remove students from class" },
				BAN: { key: "class.students.ban", label: "Ban", description: "Ban students from class" },
				PERM_CHANGE: { key: "class.students.perm_change", label: "Change Permissions", description: "Modify student permissions" },
			},
		},
		SESSION: {
			title: "Session",
			actions: {
				START: { key: "class.session.start", label: "Start", description: "Start a class session" },
				END: { key: "class.session.end", label: "End", description: "End a class session" },
				RENAME: { key: "class.session.rename", label: "Rename", description: "Rename the session" },
				SETTINGS: { key: "class.session.settings", label: "Settings", description: "Modify session settings" },
				REGENERATE_CODE: { key: "class.session.regenerate_code", label: "Regenerate Code", description: "Generate a new join code" },
			},
		},
		BREAK: {
			title: "Break",
			actions: {
				REQUEST: { key: "class.break.request", label: "Request", description: "Request a break" },
				APPROVE: { key: "class.break.approve", label: "Approve", description: "Approve break requests" },
			},
		},
		HELP: {
			title: "Help",
			actions: {
				REQUEST: { key: "class.help.request", label: "Request", description: "Request help" },
				APPROVE: { key: "class.help.approve", label: "Approve", description: "Approve help requests" },
			},
		},
		TIMER: {
			title: "Timer",
			actions: {
				CONTROL: { key: "class.timer.control", label: "Control", description: "Control the class timer" },
			},
		},
		AUXILIARY: {
			title: "Auxiliary",
			actions: {
				CONTROL: { key: "class.auxiliary.control", label: "Control", description: "Control auxiliary features" },
			},
		},
		GAMES: {
			title: "Games",
			actions: {
				ACCESS: { key: "class.games.access", label: "Access", description: "Access classroom games" },
			},
		},
		TAGS: {
			title: "Tags",
			actions: {
				MANAGE: { key: "class.tags.manage", label: "Manage", description: "Create and manage tags" },
			},
		},
		DIGIPOGS: {
			title: "Digipogs",
			actions: {
				AWARD: { key: "class.digipogs.award", label: "Award Digipogs", description: "Award digipogs to students" },
			},
		},
		LINKS: {
			title: "Links",
			actions: {
				READ: { key: "class.links.read", label: "Read", description: "View class links" },
				MANAGE: { key: "class.links.manage", label: "Manage", description: "Create and manage links" },
			},
		},
	},
} as const;

type ExtractScopeKey<T> = T extends { key: infer K extends string }
	? K
	: T extends object
		? { [P in keyof T]: ExtractScopeKey<T[P]> }[keyof T]
		: never;

export type ScopeKey = ExtractScopeKey<typeof SCOPES>;