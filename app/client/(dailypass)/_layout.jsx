import { Stack } from "expo-router";
import React from "react";

export default function DailyPassLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="listgyms"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="passDateSelection"
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
