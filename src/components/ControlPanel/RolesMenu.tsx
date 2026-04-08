import { useClassData, useMobileDetect, useSettings } from "../../main";
import { Button, Card, ColorPicker, Divider, Flex, Input, Menu, Switch, Typography } from "antd";
const { Title, Text } = Typography;
import { IonIcon } from "@ionic/react";
import * as IonIcons from "ionicons/icons";
import { getClassRoles, updateRole, createRole, deleteRole } from "../../api/rolesApi";
import { useEffect, useState } from "react";
import { darkMode, lightMode } from "../../../themes/ThemeConfig";

const SCOPE_CATEGORIES = {
	CLASS: {
		POLL: {
			title: "Polls",
			actions: {
				READ: { key: "class.poll.read", label: "Read", description: "View and see polls" },
				VOTE: { key: "class.poll.vote", label: "Vote", description: "Submit poll responses" },
				CREATE: { key: "class.poll.create", label: "Create", description: "Create new polls" },
				END: { key: "class.poll.end", label: "End", description: "End active polls" },
				DELETE: { key: "class.poll.delete", label: "Delete", description: "Delete polls" },
				SHARE: { key: "class.poll.share", label: "Share", description: "Share polls with others" },
			}
		},
		STUDENTS: {
			title: "Students",
			actions: {
				READ: { key: "class.students.read", label: "Read", description: "View student information" },
				KICK: { key: "class.students.kick", label: "Kick", description: "Remove students from class" },
				BAN: { key: "class.students.ban", label: "Ban", description: "Ban students from class" },
				PERM_CHANGE: { key: "class.students.perm_change", label: "Change Permissions", description: "Modify student permissions" },
			}
		},
		SESSION: {
			title: "Session",
			actions: {
				START: { key: "class.session.start", label: "Start", description: "Start a class session" },
				END: { key: "class.session.end", label: "End", description: "End a class session" },
				RENAME: { key: "class.session.rename", label: "Rename", description: "Rename the session" },
				SETTINGS: { key: "class.session.settings", label: "Settings", description: "Modify session settings" },
				REGENERATE_CODE: { key: "class.session.regenerate_code", label: "Regenerate Code", description: "Generate a new join code" },
			}
		},
		BREAK: {
			title: "Break",
			actions: {
				REQUEST: { key: "class.break.request", label: "Request", description: "Request a break" },
				APPROVE: { key: "class.break.approve", label: "Approve", description: "Approve break requests" },
			}
		},
		HELP: {
			title: "Help",
			actions: {
				REQUEST: { key: "class.help.request", label: "Request", description: "Request help" },
				APPROVE: { key: "class.help.approve", label: "Approve", description: "Approve help requests" },
			}
		},
		TIMER: {
			title: "Timer",
			actions: {
				CONTROL: { key: "class.timer.control", label: "Control", description: "Control the class timer" },
			}
		},
		AUXILIARY: {
			title: "Auxiliary",
			actions: {
				CONTROL: { key: "class.auxiliary.control", label: "Control", description: "Control auxiliary features" },
			}
		},
		GAMES: {
			title: "Games",
			actions: {
				ACCESS: { key: "class.games.access", label: "Access", description: "Access classroom games" },
			}
		},
		TAGS: {
			title: "Tags",
			actions: {
				MANAGE: { key: "class.tags.manage", label: "Manage", description: "Create and manage tags" },
			}
		},
		DIGIPOGS: {
			title: "Digipogs",
			actions: {
				AWARD: { key: "class.digipogs.award", label: "Award Digipogs", description: "Award digipogs to students" },
			}
		},
		LINKS: {
			title: "Links",
			actions: {
				READ: { key: "class.links.read", label: "Read", description: "View class links" },
				MANAGE: { key: "class.links.manage", label: "Manage", description: "Create and manage links" },
			}
		},
	}
};

type CategoryKey = keyof typeof SCOPE_CATEGORIES.CLASS;

export default function RolesMenu() {
	const {settings} = useSettings();
    const isMobile = useMobileDetect();
	const { classData } = useClassData();

	const [roles, setRoles] = useState<any[]>([]);
	const [originalRoles, setOriginalRoles] = useState<any[]>([]);
	const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
	const [allowedScopes, setAllowedScopes] = useState<string[]>([]);
	const [editedRoleName, setEditedRoleName] = useState<string>("");
	const [editedRoleColor, setEditedRoleColor] = useState<string>("#000000");

	useEffect(() => {
		if(!classData) return;

		fetchRoles();
	}, [classData]);

	useEffect(() => {
		const selectedRole = roles.find((r) => r.id === selectedRoleId);
		setAllowedScopes(selectedRole?.scopes || []);
		setEditedRoleName(selectedRole?.name || "");
		setEditedRoleColor(selectedRole?.color || "#000000");
	}, [selectedRoleId, roles]);

	function fetchRoles() {
		if(!classData) return;

		getClassRoles(classData?.id).then((roles) => {
			console.log(roles);
			setRoles(roles.data);
			setOriginalRoles(JSON.parse(JSON.stringify(roles.data)));
		});
	}

	function hasChanges() {
		return JSON.stringify(roles) !== JSON.stringify(originalRoles);
	}

	function handleSave() {
		if (!classData) return;

		const savePromises: Promise<any>[] = [];

		// Find deleted roles (in originalRoles but not in roles)
		const deletedRoles = originalRoles.filter(
			(original) => !roles.find((r) => r.id === original.id)
		);

		// Find new roles (in roles but not in originalRoles)
		const newRoles = roles.filter(
			(role) => !originalRoles.find((r) => r.id === role.id)
		);

		// Find updated roles (in both but with changes)
		const updatedRoles = roles.filter((role) => {
			const original = originalRoles.find((r) => r.id === role.id);
			return original && JSON.stringify(original) !== JSON.stringify(role);
		});

		// Delete roles
		deletedRoles.forEach((role) => {
			savePromises.push(deleteRole(classData.id, role.id));
		});

		// Create new roles
		newRoles.forEach((role) => {
			savePromises.push(
				createRole(classData.id, {
					name: role.name,
					scopes: role.scopes,
					color: role.color,
				})
			);
		});

		// Update existing roles
		updatedRoles.forEach((role) => {
			savePromises.push(
				updateRole(classData.id, role.id, {
					name: role.name,
					scopes: role.scopes,
					color: role.color,
				})
			);
		});

		Promise.all(savePromises)
			.then(() => {
				fetchRoles();
			})
			.catch((err) => {
				console.error("Error saving roles:", err);
			});
	}

	function handleCancel() {
		setRoles(JSON.parse(JSON.stringify(originalRoles)));
		setSelectedRoleId(null);
		setEditedRoleName("");
		setEditedRoleColor("#000000");
	}

	function handlePermissionToggle(scopeKey: string, isChecked: boolean) {
		if(!selectedRoleId) return;

		setRoles((prevRoles) =>
			prevRoles.map((role) => {
				if (role.id !== selectedRoleId) return role;

				const updatedScopes = isChecked
					? [...(role.scopes || []), scopeKey]
					: (role.scopes || []).filter((s: any) => s !== scopeKey);

				return { ...role, scopes: updatedScopes };
			})
		);
	}

	function handleCreateRole() {
		const newRoleId = Math.min(...roles.map(r => r.id), 0) - 1; // Generate temporary negative ID for new roles
		
		setRoles((prevRoles) => [
			...prevRoles,
			{
				id: newRoleId,
				name: "New role",
				scopes: [],
				color: "#000000",
			}
		]);
		setSelectedRoleId(newRoleId);
	}

	function handleDeleteRole() {
		if(!selectedRoleId) return;

		setRoles((prevRoles) =>
			prevRoles.filter((role) => role.id !== selectedRoleId)
		);
		setSelectedRoleId(null);
	}

	return (
		<>
			<Flex style={{width: '100%', height: '100%'}} gap={10}>
				<Flex vertical style={{width:'300px', borderRadius: 6, background: settings.appearance.theme === 'dark' ? darkMode.components.Card.colorBgContainer : lightMode.components.Card.colorBgContainer, padding: '15px 0'}} gap={10}>
					<Flex align="center" justify="space-between" style={{padding: '0 15px'}}>
						<Title level={4} style={{margin: 0}}>Roles</Title>
						<Button type="primary" variant="solid" color="blue" onClick={handleCreateRole} style={{display:'flex',justifyContent:'center',alignItems:'center'}}><IonIcon icon={IonIcons.addCircle}/></Button>
					</Flex>
					<Menu style={{width:'100%', borderRadius: 6, background: 'none'}}>
						{
							roles.map((role) => (
								<Menu.Item key={role.id} style={{border: '2px solid red'}} onClick={() => setSelectedRoleId(role.id)}>
									{role.name}
								</Menu.Item>
							))
						}
					</Menu>
				</Flex>
				<Card style={{flex:"1 1 auto", display: 'flex', flexDirection: 'column'}} styles={{body:{height:'100%', display: 'flex', flexDirection: 'column'}}}>
					<Flex vertical justify="start" align="center" style={{height:'100%', overflowY:'auto', flex: 1}}>
						<Flex align="center" justify="space-between" gap={10} style={{width:'100%', marginBottom: 20}}>
							<Input style={{flex: '1 1 auto'}} placeholder="Role Name" value={editedRoleName} onChange={(e) => {
								setEditedRoleName(e.target.value);
								if(!selectedRoleId) return;
								setRoles((prevRoles) =>
									prevRoles.map((role) => {
										if (role.id !== selectedRoleId) return role;
										return { ...role, name: e.target.value };
									})
								);
							}} />
							<ColorPicker disabledAlpha value={editedRoleColor} styles={{
								root: {
									height: '100%',
									minWidth: 'unset',
									width: 'unset',
									aspectRatio: 1,
								},
							}} onChange={(color) => {
								const colorHex = color.toHexString();
								setEditedRoleColor(colorHex);
								if(!selectedRoleId) return;
								setRoles((prevRoles) =>
									prevRoles.map((role) => {
										if (role.id !== selectedRoleId) return role;
										return { ...role, color: colorHex };
									})
								);
							}}/>
							<Button variant="solid" type="primary" color="red" style={{aspectRatio: 1, height: '42px'}} onClick={handleDeleteRole} disabled={!selectedRoleId}>
								<IonIcon icon={IonIcons.trash} />
							</Button>
						</Flex>
						{
							(Object.keys(SCOPE_CATEGORIES.CLASS) as CategoryKey[]).map((category) => {
								const categoryData = SCOPE_CATEGORIES.CLASS[category];
								return (
									<div key={category} style={{marginTop: 20, width: '100%'}}>
										<Title level={4} style={{marginBottom: 10, fontSize: 16, fontWeight: 'bolder'}}>{categoryData.title}</Title>
										<Flex vertical gap={5}>
											{
												Object.entries(categoryData.actions).map(([action, actionData]) => {
													const selectedRole = roles.find((r) => r.id === selectedRoleId);
													const hasPermission = selectedRole?.scopes?.includes(actionData.key) ?? false;

													return (
														<Flex key={action} style={{ borderRadius: 4, padding: 5 }} align="center">
															<Flex vertical style={{flex: 1}}>
																<Text style={{fontWeight: 500}}>{actionData.label}</Text>
																<Text type="secondary" style={{ fontSize: 12 }}>
																	{actionData.description}
																</Text>
															</Flex>
															<Switch
																style={{ marginLeft: "auto" }}
																checked={hasPermission}
																onChange={(checked) => handlePermissionToggle(actionData.key, checked)}
																disabled={!selectedRoleId}
															/>
														</Flex>
													);
												})
											}
											<Divider style={{margin: '10px 0'}} />
										</Flex>
									</div>
								);
							})
						}
					</Flex>
					{hasChanges() && (
						<Flex gap={10} style={{marginTop: 20}} justify="flex-end">
							<Button onClick={handleCancel}>Cancel</Button>
							<Button type="primary" onClick={handleSave}>Save Changes</Button>
						</Flex>
					)}
				</Card>
			</Flex>
		</>
	);
}