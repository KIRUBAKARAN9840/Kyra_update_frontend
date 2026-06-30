import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { updateExpoTokenAPI } from "../services/clientApi";

const projectId = Constants.expoConfig?.extra?.eas?.projectId;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications(userId) {
  useEffect(() => {
    if (!userId) return;

    registerForPushNotificationsAsync(userId);

    // Set up notification listeners if needed
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {},
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {});

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && userId) {
        registerForPushNotificationsAsync(userId);
      }
    });

    return () => {
      subscription.remove();
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [userId]);
}

export async function registerForPushNotificationsAsync(userId) {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  try {
    // Make sure we have a valid projectId
    if (!projectId) {
      console.error("Missing projectId in Constants.expoConfig.extra.eas");
      return null;
    }

    let deviceToken = null;
    if (Platform.OS === "android") {
      const token = await Notifications.getDevicePushTokenAsync();
      deviceToken = token.data;
    }

    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    const newExpoToken = expoPushToken.data;

    const oldExpoToken = await SecureStore.getItemAsync("expoPushToken");
    const oldDeviceToken = await SecureStore.getItemAsync("devicePushToken");

    let shouldUpdate = false;

    if (Platform.OS === "android") {
      shouldUpdate =
        newExpoToken !== oldExpoToken || deviceToken !== oldDeviceToken;
    } else {
      shouldUpdate = newExpoToken !== oldExpoToken;
    }

    if (shouldUpdate) {
      try {
        const payload = {
          expo_token: newExpoToken,
          client_id: userId,
          device_token: Platform.OS === "android" ? deviceToken : null,
        };
        const response = await updateExpoTokenAPI(payload);
        if (response?.status === 200) {
          await SecureStore.setItemAsync("expoPushToken", newExpoToken);
          if (Platform.OS === "android" && deviceToken) {
            await SecureStore.setItemAsync("devicePushToken", deviceToken);
          }
          return newExpoToken;
        } else {
          return null;
        }
      } catch (err) {
        return null;
      }
    } else {
      return newExpoToken;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
}
