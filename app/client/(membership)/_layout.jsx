import { Stack } from "expo-router";
import React from "react";

export default function MembershipLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="listall"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="onegym"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="payment"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="confirmed"
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
