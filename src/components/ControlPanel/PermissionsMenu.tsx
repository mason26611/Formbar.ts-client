import { useClassData, useMobileDetect } from "../../main";
import { Table, Typography } from "antd";
const { Title } = Typography;
import type { TableProps } from "antd";
import { IonIcon } from "@ionic/react";
import * as IonIcons from "ionicons/icons";

const permissionOptions = [
	{
		name: "Guest",
        mobileIcon: IonIcons.personOutline,
		permissionLevel: 1,
	},
	{
		name: "Student",
        mobileIcon: IonIcons.schoolOutline,
		permissionLevel: 2,
	},
	{
		name: "Mod",
        mobileIcon: IonIcons.shieldCheckmarkOutline,
		permissionLevel: 3,
	},
	{
		name: "Teacher",
        mobileIcon: IonIcons.ribbonOutline,
		permissionLevel: 4,
	},
];

export default function PermissionsMenu() {
    const isMobile = useMobileDetect();
	const { classData } = useClassData();

	const desktopColumns: TableProps["columns"] = [
		{
			title: "",
			rowScope: "row",
			dataIndex: "key",
			align: "center" as const,
			width: 220,
		},
		...permissionOptions.map((option) => ({
			title: option.name,
			dataIndex: option.name,
			align: "center" as const,
			width: 110,
		})),
	];

	const mobileColumns: TableProps["columns"] = [
		{
			title: "Permission",
			rowScope: "row",
			dataIndex: "key",
			align: "center" as const,
			width: 190,
		},
		{
			title: "Min Role",
			dataIndex: "minimumRole",
			align: "center" as const,
			width: 140,
			render: (value: { icon: string; name: string }) => (
				<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
					<IonIcon icon={value.icon} />
					<span>{value.name}</span>
				</span>
			),
		},
	];

	let sortedPermissions = classData?.permissions
		? Object.entries(classData.permissions).sort((a, b) =>
				a[0].localeCompare(b[0]),
			)
		: [];

	const data = sortedPermissions.map(([permissionName, permissionLevel]) => {
		const row: any = {
			key: permissionToName(permissionName),
			dataIndex: permissionName,
			minimumRole: getPermissionRole(permissionLevel as number),
			align: "center" as const,

		};
		permissionOptions.forEach((option) => {
			row[option.name] =
				permissionLevel <= option.permissionLevel ? (
					<span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
						<IonIcon icon={IonIcons.checkmark} style={{ color: "green", fontSize: "28px" }} />
					</span>
                ) : (
					<span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
						<IonIcon icon={IonIcons.close} style={{ color: "red", fontSize: "28px" }} />
					</span>
                );
		});
		return row;
	});

	return (
		<>
			<Title level={isMobile ? 3 : 1} style={{ marginBottom: "50px" }}>Permissions</Title>
            
			<Table
				columns={isMobile ? mobileColumns : desktopColumns}
				dataSource={data}
				pagination={false}
				locale={{ emptyText: "No permissions available (no endpoint to edit)." }}
				style={{ width: isMobile ? "100%" : "80%", margin: isMobile ? "0" : "0 auto" }}
				scroll={isMobile ? { x: 330 } : undefined}
			/>
		</>
	);
}

// Converts the internal permission name to a display name

function permissionToName(permissionName: string): string {
	let permissionNameChars = permissionName.split("");
	permissionNameChars[0] = permissionNameChars[0].toUpperCase();

	permissionNameChars.forEach((char, index) => {
		if (char === char.toUpperCase() && index !== 0) {
			permissionNameChars.splice(index, 0, " ");
		}
	});

	permissionName = permissionNameChars.join("");
	return permissionName;
}

function getPermissionRole(permissionLevel: number) {
	const matchedRole = permissionOptions.find(
		(option) => permissionLevel <= option.permissionLevel,
	);

	return {
		name: matchedRole?.name ?? "Teacher",
		icon: matchedRole?.mobileIcon ?? IonIcons.ribbonOutline,
	};
}
