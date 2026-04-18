import { useSettings, useUserData } from "../../main";
import { Flex, Card, Button, Typography, Divider } from "antd";
import { IonIcon } from "@ionic/react";
import * as IonIcons from "ionicons/icons";
import { darkMode, lightMode } from "../../../themes/ThemeConfig";
import { Link } from "react-router";
const { Title, Text } = Typography;

interface OAuthPermission {
	label: string;
	granted: boolean;
}

interface OAuthInfo {
	icon: any;
	text: React.ReactNode;
}

interface OAuthAppInfo {
	name: string;
	description: string;
	iconUrl: string;

	permissions: OAuthPermission[];
	info: {
		redirectUrl: string;
	}
}

export default function AuthorizeApp() {
	const { settings } = useSettings();
	const { userData } = useUserData();
	const theme = settings.appearance.theme === "dark" ? darkMode : lightMode;

	const appInfo: OAuthAppInfo = {
		name: "Jukebar",
		description: "A simple music player for your web browser.",
		iconUrl: "http://172.16.3.102:5000/img/favicon.png",
		permissions: [
			{
				label: "Access your name, ID, and profile information",
				granted: true,
			},
			{
				label: "Manage your digipog balance",
				granted: true,
			},
			{
				label: "Bake your friends a cake",
				granted: false,
			},
		],
		info: {
			redirectUrl: "http://localhost:8000"
		}
	};

	const infoItems: OAuthInfo[] = [
		{
			icon: IonIcons.link,
			text: (<>Once authorized, you will be redirected outside of Formbar to: <Text code style={{fontSize: 16, whiteSpace: 'nowrap'}}>{appInfo.info.redirectUrl}</Text></>),
		},
		// {
		// 	icon: IonIcons.documentText,
		// 	text: "The developer of this app's privacy policy and terms of service apply to this application.",
		// },
		// {
		// 	icon: IonIcons.time,
		// 	text: "Authorization will expire on Month Day, Year",
		// },
		{
			icon: IonIcons.lockClosed,
			text: "This application cannot read your sensitive information, such as your API key, password, or digipog pin.",
		},
	];

	return (
		<Flex
			justify="center"
			align="center"
			style={{
				width: "100%",
				height: "100vh",
				background:
					settings.appearance.theme === "dark"
						? "linear-gradient(rgba(54, 94, 146, 1) 0%, rgba(13, 40, 77, 1) 100%)"
						: "#f0f2f5",
			}}
		>
			<Card
				style={{
					width: "100%",
					maxWidth: "800px",
					background: theme.components.Card.colorBgContainer,
				}}
				styles={{
					body: {
						padding: "32px",
					},
				}}
			>
				<Flex vertical>
					<Flex gap={20} align="stretch">
						{/* Header Section */}
						<Flex vertical align="center" gap={20}>
							<Flex vertical align="center" gap={12}>
								<Flex gap={12} justify="center" align="center">
									{/* App Icons placeholder */}
									<div
										style={{
											width: "60px",
											height: "60px",
											borderRadius: "50%",
											backgroundImage: "url(/img/FormbarLogo-Circle.png)",
											backgroundSize: "100%",
											opacity: 0.5,
											flexShrink: 0
										}}
									/>
									<Divider style={{margin: 0, minWidth: 0, width: 20}} dashed/>
									<div
										style={{
											width: "60px",
											height: "60px",
											borderRadius: "50%",
											backgroundImage: `url(${appInfo.iconUrl})`,
											backgroundSize: "100%",
											opacity: 0.5,
											flexShrink: 0
										}}
									/>
								</Flex>
								<Text style={{ margin: 0 }}>
									An external application
								</Text>
								<Title level={4} style={{ margin: 0 }}>
									{appInfo.name}
								</Title>
								<Text type="secondary" style={{fontSize: 16}}>wants to access your account</Text>
								<Text type="secondary" style={{ fontSize: "12px" }}>
									Signed in as {userData?.displayName} <Divider vertical /> <Link to="/login">Not you?</Link>
								</Text>
							</Flex>

							<Divider style={{ margin: 0 }} />

							{/* Info Section */}
							<Flex vertical gap={8} style={{ width: "100%" }}>
								{infoItems.map((item, index) => (
									<Flex key={index} gap={8} align="start">
										<IonIcon icon={item.icon} 
											style={{
												opacity: 0.5,
												fontSize: 20,
												flexShrink: 0,
											}}
										/>
										<Text type="secondary" style={{fontSize: 16}}>
											{item.text}
										</Text>
									</Flex>
								))}
							</Flex>
						</Flex>

						<Divider style={{ margin: '20px 0', height: 'unset' }} vertical dashed/>

						{/* Permissions Section */}
						<Flex vertical gap={16} style={{ width: "100%", height: "unset" }}>
							<Text type="secondary" style={{ margin: 0, fontSize: 16 }}>
								This will allow the Application to:
							</Text>

							<Flex vertical gap={8}>
								{appInfo.permissions.map((permission, index) => (
									<Flex
										key={index}
										gap={12}
										align="center"
										justify="stretch"
										style={{ padding: "8px" }}
									>
										{permission.granted ? (
											<IonIcon icon={IonIcons.checkmarkCircle} 
												style={{
													color: "#65be39ff",
													fontSize: "24px",
													marginTop: "2px",
												}}
											/>
										) : (
											<IonIcon icon={IonIcons.closeCircle} 
												style={{
													color: "#c93739ff",
													fontSize: "24px",
													marginTop: "2px",
												}}
											/>
										)}
										<Flex vertical gap={0}>
											<Text style={{ fontSize: 18 }}>{permission.label}</Text>
										</Flex>
									</Flex>
								))}
							</Flex>
						</Flex>
					</Flex>
					{/* Action Buttons */}
					<Flex gap={12} style={{ width: "100%", marginTop: "12px" }}>
						<Button
							style={{ flex: 1 }}
							onClick={() => window.history.back()}
						>
							Cancel
						</Button>
						<Button
							type="primary"
							style={{ flex: 1 }}
							onClick={() => {
								// Handle authorization
							}}
						>
							Authorize
						</Button>
					</Flex>
				</Flex>
			</Card>
		</Flex>
	);
}