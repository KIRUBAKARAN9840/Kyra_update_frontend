import { Stack } from "expo-router";
import React from "react";

export default function SessionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="availableSessions"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="sessionPassSelection"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="dateSelection"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="timeSelection"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="reviewBooking"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="bookingConfirmed"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="trainerSelection"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
