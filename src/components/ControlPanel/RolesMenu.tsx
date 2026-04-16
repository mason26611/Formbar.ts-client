import { isMobile, useClassData, useMobileDetect, useSettings } from "../../main";
import { Button, Card, ColorPicker, Divider, Flex, Input, List, Switch, Typography } from "antd";
const { Title, Text } = Typography;
import { IonIcon } from "@ionic/react";
import * as IonIcons from "ionicons/icons";
import { getClassRoles, updateRole, createRole, deleteRole } from "../../api/rolesApi";
import { useEffect, useState } from "react";
import { darkMode, lightMode } from "../../../themes/ThemeConfig";
import { SCOPES } from "../../types";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

type CategoryKey = keyof typeof SCOPES.CLASS;

interface SortableRoleItemProps {
	role: any;
	isSelected: boolean;
	onSelect: (id: number) => void;
}

function SortableRoleItem({ role, isSelected, onSelect }: SortableRoleItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: role.id });

	const style = {
		padding: 0,
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<List.Item
			ref={setNodeRef}
			style={style}
			onClick={() => onSelect(role.id)}
			className="sortable-role-item"
		>
			<Flex align="center" gap={8} style={{ width: "100%", cursor: "pointer" }}>
				<span
					style={{
						padding: "8px",
						flex: 1,
						backgroundColor: isSelected ? "rgba(0, 0, 0, 0.1)" : "transparent",
						borderLeft: isSelected ? `3px solid ${role.color}` : "3px solid transparent",
						borderRadius: "4px",
						color: role.color,
						fontWeight: isSelected ? 600 : 400,
						transition: "all 0.2s ease",
						display: 'flex',
						justifyContent: 'start',
						alignItems: 'center'
					}}
				>
					<div
						{...attributes}
						{...listeners}
						style={{
							padding: "4px 8px",
							cursor: "grab",
							display: "inline-flex",
							alignItems: "center",
						}}
					>
						<IonIcon icon={IonIcons.reorderFour} style={{ fontSize: 18 }} />
					</div>
					{role.name}
				</span>
			</Flex>
		</List.Item>
	);
}

export default function RolesMenu() {
	const isMobile = useMobileDetect();
	const {settings} = useSettings();
	const { classData } = useClassData();

	const [roles, setRoles] = useState<any[]>([]);
	const [originalRoles, setOriginalRoles] = useState<any[]>([]);
	const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
	const [editedRoleName, setEditedRoleName] = useState<string>("");
	const [editedRoleColor, setEditedRoleColor] = useState<string>("#000000");

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	useEffect(() => {
		if(!classData) return;

		fetchRoles();
	}, [classData]);

	useEffect(() => {
		const selectedRole = roles.find((r) => r.id === selectedRoleId);
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

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;

		if (!over) return;

		if (active.id !== over.id) {
			setRoles((prevRoles) => {
				const oldIndex = prevRoles.findIndex((r) => r.id === active.id);
				const newIndex = prevRoles.findIndex((r) => r.id === over.id);

				return arrayMove(prevRoles, oldIndex, newIndex);
			});
		}
	}

	return (
		<>
			<Flex style={{width: '100%', height: '100%', padding: 20, overflow:'scroll'}} gap={10} vertical={isMobile}>
				<Flex vertical style={{width:isMobile ? '100%' : '300px', borderRadius: 6, background: settings.appearance.theme === 'dark' ? darkMode.components.Card.colorBgContainer : lightMode.components.Card.colorBgContainer, padding: '15px 0'}} gap={10}>
					<Flex align="center" justify="space-between" style={{padding: '0 15px'}}>
						<Title level={4} style={{margin: 0}}>Roles</Title>
						<Button type="primary" variant="solid" color="blue" onClick={handleCreateRole} style={{display:'flex',justifyContent:'center',alignItems:'center'}}><IonIcon icon={IonIcons.addCircle}/></Button>
					</Flex>
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
						modifiers={[restrictToVerticalAxis]}
					>
						<SortableContext
							items={roles.map((r) => r.id)}
							strategy={verticalListSortingStrategy}
						>
							<List
								style={{width:'100%', borderRadius: 6, background: 'none', paddingInline: 0, overflowY: 'scroll', overflowX: 'hidden', flex: 1}}
								dataSource={roles}
								renderItem={(role) => (
									<SortableRoleItem
										key={role.id}
										role={role}
										isSelected={selectedRoleId === role.id}
										onSelect={setSelectedRoleId}
									/>
								)}
							/>
						</SortableContext>
					</DndContext>
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
							(Object.keys(SCOPES.CLASS) as CategoryKey[]).map((category) => {
								const categoryData = SCOPES.CLASS[category];
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