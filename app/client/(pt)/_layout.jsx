import { Stack } from "expo-router";
import React from "react";

export default function PTLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="listtrainers"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="ptCheckout"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
