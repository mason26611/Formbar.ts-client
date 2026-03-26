import { IonIcon } from "@ionic/react";
import {
    Flex,
    Menu,
    Switch,
    type MenuProps,
    Typography,
    Slider,
    Select,
} from "antd";

const { Text } = Typography;

import { useState } from "react";
import { useMobileDetect, useSettings, useTheme } from "../main";
import { settingCategories, settingsConfig, type SettingConfig } from "../settings.config";

type MenuItem = Required<MenuProps>['items'][number] & {
    selectedicon?: React.ReactNode;
    deselectedicon?: React.ReactNode;
};


interface SettingItemProps {
	config: SettingConfig;
	value: any;
	onChange: (newValue: any) => void;
}



export default function SettingsModal() {
    const [currentCategoryId, setCurrentCategoryId] = useState<string>("appearance");
    const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
        return settingCategories.map((category, index) => ({
            key: category.id,
            icon: <IonIcon icon={index === 0 ? category.selectedIcon : category.deselectedIcon} />,
            selectedicon: <IonIcon icon={category.selectedIcon} />,
            deselectedicon: <IonIcon icon={category.deselectedIcon} />,
            label: category.label,
        }));
    });
    
    const { settings, updateSettings } = useSettings();
    const isMobile = useMobileDetect();
    
    function SettingItem({ config, value, onChange }: SettingItemProps) {
        switch (config.type) {
            case "boolean":
                return (
                    <Flex gap={10} align="center">
                        <Switch checked={value} onChange={onChange} />
                        <Flex vertical gap={2}>
                            <Text>{isMobile && config.mobileLabel ? config.mobileLabel : config.label}</Text>
                            {!isMobile && config.description && (
                                <Text type="secondary" style={{ fontSize: "12px" }}>
                                    {config.description}
                                </Text>
                            )}
                        </Flex>
                    </Flex>
                );
            case "number":
                return (
                    <Flex gap={10} align="center" style={{ width: "100%" }}>
                        <Text>{isMobile && config.mobileLabel ? config.mobileLabel : config.label}</Text>
                        <Slider
                            style={{ flex: 1 }}
                            value={value}
                            onChange={onChange}
                            min={config.min}
                            max={config.max}
                            step={config.step}
                        />
                        <Text style={{ minWidth: "30px" }}>{value}</Text>
                    </Flex>
                );
            case "select":
                return (
                    <Flex gap={10} align="center">
                        <Text>{isMobile && config.mobileLabel ? config.mobileLabel : config.label}</Text>
                        <Select
                            style={{ flex: 1 }}
                            value={value}
                            onChange={onChange}
                            options={config.options}
                        />
                    </Flex>
                );
            default:
                return null;
        }
    }

    function openMenu(key: string) {
        if (key === currentCategoryId) return;
        setCurrentCategoryId(key);

        const updatedItems = menuItems.map((item) => {
            if (item?.type === "divider") return item;

            if (item && item.key === key && "icon" in item) {
                return { ...item, icon: item.selectedicon } as typeof item;
            } else if (item && "icon" in item) {
                return { ...item, icon: item.deselectedicon } as typeof item;
            }
            return item;
        });
        setMenuItems(updatedItems);
    }

    function getSettingValue(config: SettingConfig): any {
        const categoryKey = config.category as keyof typeof settings;
        const category = settings[categoryKey];
        
        if (config.key === "theme") {
            return settings.appearance.theme;
        }
        
        return (category as any)?.[config.key];
    }

    function updateSetting(config: SettingConfig, newValue: any) {
        const categoryKey = config.category as keyof typeof settings;
        
        if (config.key === "theme") {
            updateSettings({
                appearance: { ...settings.appearance, theme: newValue },
            });
            return;
        }

        updateSettings({
            [categoryKey]: {
                ...(settings[categoryKey] as any),
                [config.key]: newValue,
            },
        });
    }

    const currentCategorySettings = settingsConfig.filter(
        (config) => config.category === currentCategoryId
    );

    return (
        <Flex style={{ width: "100%", height: "100%" }}>
            <Menu
                defaultSelectedKeys={["appearance"]}
                mode="inline"
                items={menuItems}
                inlineCollapsed={isMobile}
                theme={"dark"}
                style={{
                    height: "100%",
                    minWidth: isMobile ? "80px" : "250px",
                    maxWidth: isMobile ? "80px" : "250px",
                    padding: "0 10px",
                    paddingTop: "15px",
                }}
                className={settings.accessibility.disableAnimations ? "" : "animMenu"}
                styles={{
                    itemIcon: {
                        marginRight: "18px",
                    },
                }}
                onClick={(e) => openMenu(e.key)}
            />
            <Flex style={{ padding: 20, width: "100%", height: "100%", overflowY: "auto" }}>
                <Flex vertical gap={15} style={{ width: "100%" }}>
                    {currentCategorySettings.map((config) => (
                        <SettingItem
                            key={config.key}
                            config={config}
                            value={getSettingValue(config)}
                            onChange={(newValue) => updateSetting(config, newValue)}
                        />
                    ))}
                </Flex>
            </Flex>
        </Flex>
    );
}