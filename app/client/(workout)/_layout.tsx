import { Stack } from "expo-router";
import React from "react";

export default function workoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="fittbotWorkoutPage"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="homeWorkoutPage"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="allexercises"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="oneexercise"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="workoutreportpage"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="kyraAI"
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
