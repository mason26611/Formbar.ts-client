import {
    Flex, Button, Typography, Card, Row, Col, Progress
} from 'antd';
import { useMobileDetect } from '../../main';
import { IonIcon } from "@ionic/react";
import * as IonIcons from "ionicons/icons";

const { Title, Text } = Typography;

const defaultTimers = [
    {
        name: "Timer 1",
        duration: 60,
        isRunning: false,
    },
    {
        name: "Timer 2",
        duration: 120,
        isRunning: false,
    },
    {
        name: "Timer 3",
        duration: 180,
        isRunning: false,
    }
]

export default function TimerPage() {
    const isMobile = useMobileDetect();

    // Create a 5x2 grid using defaultTimers
    const grid = [];
    for (let rowIdx = 0; rowIdx < 5; rowIdx++) {
        for (let colIdx = 0; colIdx < 2; colIdx++) {
            const timerIdx = rowIdx * 2 + colIdx;
            const timer = defaultTimers[timerIdx];
            grid.push(
                <Col span={8} key={`col-${rowIdx}-${colIdx}`}>
                    {
                        timer && (
                            <Card>
                                <Flex justify='center' align='center' vertical gap={10}>
                                    {
                                        !isMobile && (
                                            <Title level={3} style={{margin:0}}>{timer.name}</Title>
                                        )
                                    }
                                    <Progress 
                                        type="dashboard"
                                        percent={100}
                                        size={isMobile ? 50 : 70}
                                        format={() => timer.duration.toString() + "s"}
                                        strokeColor={{
                                            '0%': 'rgb(94, 158, 230)',
                                            '100%': 'rgba(41, 96, 167, 0.9)',
                                        }}
                                        styles={{
                                            indicator: {
                                                color: 'white',
                                            }
                                        }}
                                        strokeLinecap='round'
                                    />
                                    <Button style={{cursor:'not-allowed', opacity: 0.5}} type='primary'>
                                        {
                                            isMobile ? (
                                                <Flex align="center" justify="center" gap={5}>
                                                    <IonIcon icon={IonIcons.play} />
                                                </Flex>
                                            ) : "Start"
                                        }
                                    </Button>
                                </Flex>
                            </Card>
                        )
                    }
                </Col>
            );
        }
    }
    return (
        <>
            <Title style={{ marginBottom: "10px" }} level={isMobile ? 3 : 1}>Timers</Title>
            <Flex gap={20} vertical={isMobile}>
                <Row gutter={isMobile ? [8, 0] : [16, 16]} style={{width: '100%', marginInline: isMobile ? 0 : 'auto'}}>
                    {grid}
                </Row>
                <Flex gap={20} style={{width: '100%'}}>
                    <Card title="Custom Timer" style={{width: '100%'}}>

                    </Card>
                </Flex>
            </Flex>
        </>
    )
}