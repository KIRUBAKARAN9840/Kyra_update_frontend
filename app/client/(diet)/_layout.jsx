import { Stack } from "expo-router";
import React from "react";

export default function DietLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="myListedFoodLogs"
        options={{ headerShown: false, gestureEnabled: false }}
      />

      <Stack.Screen
        name="reportPage"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="instructions"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="report"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="personalTemplate"
        options={{ headerShown: false, gestureEnabled: false }}
      />

      <Stack.Screen
        name="addTemplateCategoryPage"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="logDiet"
        options={{ headerShown: false, gestureEnabled: false }}
      />

      <Stack.Screen
        name="addFoodListPage"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="manualFoodSelector"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="newDefaultTemplateLogFoodPage"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="nutritionplan"
        options={{ headerShown: false, gestureEnabled: false }}
      />

      <Stack.Screen
        name="foodscanner"
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
