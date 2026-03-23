import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useI18n } from "@/lib/i18n";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('dashboard'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="control"
        options={{
          title: t('mouse'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="cursorarrow" color={color} />,
        }}
      />
      <Tabs.Screen
        name="monitor"
        options={{
          title: t('systemMonitor'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="files"
        options={{
          title: t('fileManager'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="folder.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="gear" color={color} />,
        }}
      />
    </Tabs>
  );
}
