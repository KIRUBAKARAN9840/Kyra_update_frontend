import { Tabs } from "expo-router";
import React from "react";
import { LogBox, Platform } from "react-native";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import { TabScrollProvider } from "@/context/TabScrollContext";

LogBox.ignoreLogs([
  "Non-serializable values were found in the navigation state",
  "Sending `onAnimatedValueUpdate` with no listeners registered",
]);

export default function TabLayout() {
  return (
    <TabScrollProvider>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        safeAreaInsets={{ bottom: 0 }}
        screenOptions={{
          headerShown: false,
          safeAreaInsets: { bottom: 0 },
          tabBarStyle: { position: "absolute", height: 0, overflow: "hidden" },
          contentStyle: { backgroundColor: "#FFFFFF" },
        }}
      >
        <Tabs.Screen name="home" options={{ title: "Home" }} />
        <Tabs.Screen
          name="diet"
          options={{
            title: "My Cal",
          }}
        />
        <Tabs.Screen name="workout" options={{ title: "Features" }} />
        <Tabs.Screen name="gymmate" options={{ title: "Gym Mate" }} />
      </Tabs>
    </TabScrollProvider>
  );
}
