import { Stack } from "expo-router";
import React from "react";

export default function FitnessLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="allclass"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="listclass"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="sessionCheckout"
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
