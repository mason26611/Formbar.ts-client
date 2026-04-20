import { Badge, Button, Flex, Modal, Typography } from "antd";
import { StudentAccordion } from "./AccordionCollapse";
import { useClassData } from "../main";
const { Text } = Typography;

export default function StudentObject({
	student,
	openModalId,
	setOpenModalId,
    style,
}: {
	student: any;
	openModalId: number | null;
	setOpenModalId: React.Dispatch<React.SetStateAction<number | null>>;
    style?: React.CSSProperties;
}) {
	const getStatusText = () => {
		if (student.tags?.includes("Offline")) return "Offline";
		if (student.help) return "Help Ticket";
		if (typeof student.break === "string") return "Requesting Break";
		if (typeof student.break === "boolean" && student.break)
			return "On Break";
		if (student.isGuest) return "Guest";
		return "";
	};

	const statusText = getStatusText();

    const { classData } = useClassData();

	return (
		<div key={student.id} style={style}>
			<div>
				<Badge.Ribbon
					color={
						statusText === "Help Ticket"
							? "red"
							: statusText === "On Break"
								? "yellow"
								: "gray"
					}
					style={{
						display: statusText ? "block" : "none",
						position: "absolute",
						top: "-20px",
						opacity: statusText === "Offline" ? 0.5 : 1,
					}}
					text={statusText}
					
				>
					<Button
						type="primary"
						style={{
							padding: "5px",
							height: "auto",
							width: "100%",
							opacity: statusText === "Offline" ? 0.5 : 1,
							fontSize: "clamp(12px, 1.5vw, 16px)",
							overflow: "hidden",
							textOverflow: "ellipsis",
							display: "block",
							whiteSpace: "nowrap"
						}}
						onClick={() => setOpenModalId(student.id)}
					>
						<Text strong style={{
							fontSize: "clamp(12px, 1.5vw, 16px)",
							overflow: "hidden",
							textOverflow: "ellipsis",
							display: "block",
							whiteSpace: "nowrap"}}>
							{student.displayName}
							{
								classData?.poll && (
									<span>
										{student.pollRes.buttonRes !== ""
											? (<> <span>-</span> <span style={{color: classData?.poll.responses.find((r: any) => r.answer === student.pollRes.buttonRes)?.color}}>{student.pollRes.buttonRes}</span></>)
											: ""}
									</span>
								)
							}
						</Text>
					</Button>
				</Badge.Ribbon>
				<Modal
					centered
					title={
						<Flex vertical>
							{student.displayName}
							<Text
								italic
								type="secondary"
								style={{ fontWeight: 300, fontSize: "16px" }}
							>
								ID: {student.id}
							</Text>
						</Flex>
					}
					zIndex={openModalId === student.id ? 1000 : -100}
					open={openModalId === student.id}
					onCancel={() => setOpenModalId(null)}
					footer={null}
				>
					<Flex justify="center">
						<StudentAccordion studentData={student} />
					</Flex>
				</Modal>
			</div>
		</div>
	);
}
