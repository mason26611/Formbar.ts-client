import * as IonIcons from "ionicons/icons";
import type { ScopeKey } from "@/types";

export type SettingType = "boolean" | "number" | "select" | "action";

export interface SettingConfig {
	key: string;
	label: string;
    mobileLabel?: string;
	description?: string;
	type: SettingType;
	category: string;
	options?: { label: string; value: any }[];
	min?: number;
	max?: number;
	step?: number;
	requiresLogin?: boolean;
	requiredScopes?: ScopeKey[];
}

export interface SettingCategory {
	id: string;
	label: string;
	icon: any;
	selectedIcon: any;
	deselectedIcon: any;
}

export const settingCategories: SettingCategory[] = [
	{
		id: "general",
		label: "General",
		icon: IonIcons.settingsOutline,
		selectedIcon: IonIcons.settings,
		deselectedIcon: IonIcons.settingsOutline,
	},
	{
		id: "appearance",
		label: "Appearance",
		icon: IonIcons.colorPaletteOutline,
		selectedIcon: IonIcons.colorPalette,
		deselectedIcon: IonIcons.colorPaletteOutline,
	},
	{
		id: "accessibility",
		label: "Accessibility",
		icon: IonIcons.accessibility,
		selectedIcon: IonIcons.accessibility,
		deselectedIcon: IonIcons.accessibilityOutline,
	},
	{
		id: 'divider',
		label: '',
		icon: null,
		selectedIcon: null,
		deselectedIcon: null,
	},
	{
		id: 'user',
		label: 'User',
		icon: IonIcons.personOutline,
		selectedIcon: IonIcons.person,
		deselectedIcon: IonIcons.personOutline,
	}
];

export const settingsConfig: SettingConfig[] = [
	{
		key: "sfxVolume",
		label: "Sound Effects Volume",
        mobileLabel: "SFX",
		type: "number",
		category: "general",
		min: 0,
		max: 100,
		step: 1,
	},
	{
		key: "theme",
		label: "Theme",
		type: "select",
		category: "appearance",
		options: [
			{ label: "Light", value: "light" },
			{ label: "Dark", value: "dark" },
		],
	},
	{
		key: "disableAnimations",
		label: "Disable Animations",
		type: "boolean",
		category: "accessibility",
		description: "Reduces motion and animations throughout the app",
	},
	{
		key: "logout",
		label: "Log Out",
		type: "action",
		category: "user",
		requiresLogin: true,
	}
];