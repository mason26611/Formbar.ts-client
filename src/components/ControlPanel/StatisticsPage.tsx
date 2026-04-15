import { useEffect, useState } from "react";
import { useClassData, useMobileDetect } from "../../main";
import { Card, Flex, Statistic, Tooltip, Typography } from "antd";
const { Title } = Typography;
import { IonIcon } from "@ionic/react";
import * as IonIcons from "ionicons/icons";


export default function Statistics() {
	const { classData } = useClassData();

	const students =
		classData && classData.students
			? (Object.values(classData.students) as any[])
			: [];

	const [responseTime, setResponseTime] = useState<number>(0);
	const [responses, setResponses] = useState<number>(0);
	const [studentsOnBreak, setStudentsOnBreak] = useState<number>(0);
	const [helpTickets, setHelpTickets] = useState<number>(0);

    const isMobile = useMobileDetect();

	useEffect(() => {
		let totalResponseTimes: number[] = [];

		students.forEach((student) => {
			if (student.pollRes && student.pollRes.time) {
				// Convert ISO string to milliseconds
				const studentResponseTimeMs = new Date(
					student.pollRes.time,
				).getTime();

				// Poll start time is already in milliseconds
				const pollStartTimeMs = classData?.poll.startTime;

				// Calculate difference in seconds (student time - poll start time)
				const timeDifferenceMs =
					studentResponseTimeMs - (pollStartTimeMs ?? 0);
				const timeDifferenceSeconds = timeDifferenceMs / 1000;

				// Only include if positive and reasonable (less than 1 hour)
				if (timeDifferenceSeconds > 0) {
					totalResponseTimes.push(timeDifferenceSeconds);
				}
			}
		});

		// Calculate average response time
		const averageResponseTime =
			totalResponseTimes.length > 0
				? totalResponseTimes.reduce((a, b) => a + b, 0) /
					totalResponseTimes.length
				: 0;

		if (classData?.poll.startTime !== undefined)
			setResponseTime(averageResponseTime);
		else setResponseTime(0);

		setResponses(totalResponseTimes.length);
		setStudentsOnBreak(students.filter((s: any) => s.break).length);
		setHelpTickets(students.filter((s: any) => s.help).length);
	}, [students, classData]);

    const [statistics, setStatistics] = useState<Array<{
        title: string;
        stats: Array<{
            title: string;
            value: number | string;
            type?: string;
            format?: string;
            precision?: number;
            prefix?: React.ReactNode;
            suffix?: string;
        }>;
    }>>([
        {
            title: "Current Poll",
            stats: [
                {
                    title: "Poll Runtime",
                    value: classData?.poll.startTime == undefined
                        ? Date.now()
                        : classData?.poll.startTime,
                    type: "timer",
                    format: "H:mm:ss",
                },
                {
                    title: "Allowed to Vote",
                    value: students.filter((s: any) => !s.tags.includes("Offline")).length,
                },
                {
                    title: "Response Time",
                    value: responseTime,
                    precision: 2,
                    prefix: (<>
                        <IonIcon
                            icon={IonIcons.arrowUp}
                            style={{ marginTop: "2px" }}
                        />
                    </>),
                    suffix: "s",
                },
                {
                    title: "Responses",
                    value: responses,
                    suffix: `/ ${students.length}`,
                },
            ],
        },
        {
            title: "Users",
            stats: [
                {
                    title: "Help Tickets",
                    value: helpTickets,
                },
                {
                    title: "On Break",
                    value: studentsOnBreak,
                },
                {
                    title: "Total Students",
                    value: students.filter((s: any) => s.id !== classData?.owner)
                        .length,
                },
            ],
        },
        {
            title: "Other Stats",
            stats: [
                {
                    title: "N/A",
                    value: "N/A",
                },
            ],
        },
    ]);

	return (
		<>
			<Flex style={{height: '100%', maxHeight: '100%', padding: 20, paddingBottom: 0}} vertical justify="start" align="center" gap={20}>
				<Title level={isMobile ? 3 : 1} style={{ marginBottom: 0, flexShrink: 0 }}>Statistics</Title>
				<Flex gap={20} wrap="wrap" justify="center" align="center" style={{flex: '1 1 0', overflowY:'auto', width: '100%', paddingBottom: '20px'}}>
                    {statistics.map((card, cardIndex) => (
                        <Card key={cardIndex} title={card.title} styles={!isMobile ? {body: gridStyle} : {body: {display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto"}}}>
                            {card.stats.map((stat, statIndex) => {
                                const statContent = stat.type === "timer" ? (
                                    <Statistic.Timer
                                        type="countup"
                                        title={stat.title}
                                        value={stat.value}
                                        format={stat.format}
                                    />
                                ) : (
                                    <Statistic
                                        title={stat.title}
                                        value={stat.value}
                                        precision={stat.precision}
                                        prefix={stat.prefix}
                                        suffix={stat.suffix}
                                    />
                                );

                                const cardContent = (
                                    <Card key={statIndex} variant="borderless">
                                        {statContent}
                                    </Card>
                                );

                                // Add tooltip for Response Time stat
                                if (stat.title === "Response Time") {
                                    return (
                                        <Tooltip
                                            key={statIndex}
                                            mouseEnterDelay={0.5}
                                            title={
                                                "Average Response Time: " +
                                                responseTime.toFixed(2) +
                                                " seconds"
                                            }
                                            placement="top"
                                        >
                                            <Card variant="borderless">
                                                <Statistic
                                                    title={stat.title}
                                                    value={stat.value}
                                                    precision={stat.precision}
                                                    styles={{
                                                        content: { color: "#3f8600" },
                                                    }}
                                                    style={{
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    }}
                                                    prefix={stat.prefix}
                                                    suffix={stat.suffix}
                                                />
                                            </Card>
                                        </Tooltip>
                                    );
                                }

                                return cardContent;
                            })}
                        </Card>
                    ))}
				</Flex>
			</Flex>
		</>
	);
}

const gridStyle = {
	display: "grid",
	gridTemplateColumns: "repeat(2, minmax(200px, 1fr))",
	gap: "10px",
};
