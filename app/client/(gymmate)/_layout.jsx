import { Stack } from "expo-router";
import React from "react";

export default function GymMateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="profilemate"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="profilebio"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="friends"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="requests"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="chat"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="myfriends"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="selectdate"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="mateprefer"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="level"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="vibe"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="choosegym"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="sessioncreated"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="myrequests"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="allmates"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="editprofileme"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="message"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="mystory"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="blockeduser"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="profilecreated"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="activity"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="timing"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="location"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="goal"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="gymvibe"
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
