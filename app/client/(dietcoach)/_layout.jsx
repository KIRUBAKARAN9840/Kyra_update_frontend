import { Stack } from "expo-router";
import React from "react";

export default function DietCoachLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="height"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="goal"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="weightactual"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="weighttarget"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="allergies"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="preference"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="choices"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="medical"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="creatingplan"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="generated"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="savedmeal"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="followup"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="recipe"
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
