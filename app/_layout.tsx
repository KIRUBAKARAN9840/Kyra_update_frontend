import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import { toastConfig } from "../utils/Toaster";
import { useColorScheme } from "@/hooks/useColorScheme";
import { View } from "react-native";
import LottieView from "lottie-react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Vibration, Platform, AppState } from "react-native";
import { NavigationProvider } from "../context/NavigationContext";
import { UserProvider } from "../context/UserContext";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";
import appsFlyer from "react-native-appsflyer";

import { NoInternetScreen } from "../components/NoInternetScreen";
import { MaintenanceScreen } from "../components/MaintenanceScreen";
import { AppRedirectScreen } from "../components/AppRedirectScreen";
import ForceUpdateModal from "../components/ForceUpdateModal";
import { useNetworkStatusExpo } from "../hooks/useNetworkStatus";
import { useAppModal } from "../hooks/useAppModal";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const channel = notification.request.content.data?.channel || "default";

    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldHandleActionButtons: true,
      vibrate: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    };
  },
});

export default function RootLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const { isConnected, isRetrying, retryConnection } = useNetworkStatusExpo();
  const {
    showModal,
    modalAction,
    message,
    redirectUrl,
    updateInfo,
    handleUpdate,
  } = useAppModal();

  const [showSplashAnimation, setShowSplashAnimation] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  const [isSideNavVisible, setIsSideNavVisible] = useState(false);

  const toggleSideNav = () => {
    setIsSideNavVisible(!isSideNavVisible);
  };

  const closeSideNav = () => {
    setIsSideNavVisible(false);
  };

  async function configureNotificationChannels() {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: "#FF231F7C",
        enableVibrate: true,
        sound: "general_alert.wav",
      });

      await Notifications.setNotificationChannelAsync("diet_channel", {
        name: "Diet Notifications",
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: "#FF231F7C",
        enableVibrate: true,
        sound: "diet_alert.wav",
        vibrationPattern: [0, 250, 250, 250],
      });

      await Notifications.setNotificationChannelAsync("workout_channel", {
        name: "Workout Notifications",
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: "#FF231F7C",
        enableVibrate: true,
        sound: "workout_alert.wav",
        vibrationPattern: [0, 300, 300, 300],
      });

      await Notifications.setNotificationChannelAsync("water_channel", {
        name: "Workout Notifications",
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: "#FF231F7C",
        enableVibrate: true,
        sound: "water_alert.wav",
        vibrationPattern: [0, 300, 300, 300],
      });

      await Notifications.setNotificationChannelAsync("other_channel", {
        name: "Workout Notifications",
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: "#FF231F7C",
        enableVibrate: true,
        sound: "other_alert.wav",
        vibrationPattern: [0, 300, 300, 300],
      });
    }
  }

  // Check for OTA updates on app launch
  useEffect(() => {
    async function checkForUpdates() {
      try {
        if (!__DEV__) {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            // await Updates.reloadAsync();
          }
        }
      } catch (error) {}
    }
    checkForUpdates();
  }, []);

  useEffect(() => {
    configureNotificationChannels();

    const onDeepLink = (res) => {
      if (res?.deepLinkStatus === "FOUND") {
        const deepLinkData = res.data;

        const target = deepLinkData?.deep_link_value;

        if (target === "home") {
          router.push("/");
        } else if (target === "diet") {
          router.push("/");
        } else {
          router.push("/");
        }
      } else {
      }
    };

    if (Constants.executionEnvironment !== "storeClient") {
      appsFlyer
        .initSdk({
          devKey: "RnhTgu2xrt3Fov3gP7iqHk",
          isDebug: false,
          appId: "id6747237294",
          onDeepLinkListener: true,
          waitForMarketingUserTimeout: 0,
        })
        .then((result) => {})
        .catch((error) => {
          console.error("AppsFlyer SDK initialization failed", error);
        });
      appsFlyer.onDeepLink(onDeepLink);
    }
    return () => {
      // AppsFlyer SDK handles cleanup automatically
    };
  }, []);

  const goToPage = (page: string) => {
    switch (page) {
      case "My Gym":
        return "/client/home";
      case "Water":
        return "/client/home";
      case "Diet":
        return "/client/diet";
      case "friends":
        return "/client/(gymmate)/myfriends";
      case "my_requests":
        return "/client/(gymmate)/requests";
      case "received":
        return "/client/(tabs)/gymmate";
      case "matches":
        return "/client/(tabs)/gymmate";
      case "chat_thread":
        return "/client/(gymmate)/chat";
      case "home":
        return "/client/(tabs)/gymmate";
      case "stories":
        return "/client/(tabs)/gymmate";
      default:
        return "/client/home";
    }
  };

  const getParams = (page: any) => {
    switch (page) {
      case "My Gym":
        return "My Gym";
      case "Water":
        return "Water";
      case "Diet":
        return "";
      default:
        return "";
    }
  };

  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        const channel = notification.request.content.data?.channel || "default";

        const vibrationPattern =
          notification.request.content.data?.vibrationPattern;

        if (AppState.currentState === "active") {
          if (vibrationPattern && Array.isArray(vibrationPattern)) {
            Vibration.vibrate(vibrationPattern);
          }
        }
      },
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const channel =
          response.notification.request.content.data?.channel || "default";

        const vibrationPattern =
          response.notification.request.content.data?.vibrationPattern;

        if (vibrationPattern && Array.isArray(vibrationPattern)) {
          Vibration.vibrate(vibrationPattern);
        }

        const notificationPage =
          response.notification.request.content.data.data;
        const tabParam = getParams(notificationPage);

        const saveNotificationData = async () => {
          try {
            await AsyncStorage.setItem("notification_tab", tabParam);
            await AsyncStorage.setItem(
              "notification_timestamp",
              Date.now().toString(),
            );
            await AsyncStorage.setItem("notification_channel", channel);
            const accessToken = await SecureStore.getItemAsync("access_token");
            const targetRoute = accessToken ? goToPage(notificationPage) : "/";
            router.push({
              pathname: targetRoute,
              params: {
                tab: tabParam,
                notif_timestamp: Date.now().toString(),
                channel: channel,
                ...((notificationPage === "matches" ||
                  notificationPage === "received") && {
                  openConnections: "true",
                  connectionsTab: notificationPage === "matches" ? "2" : "0",
                }),
              },
            });
          } catch (error) {}
        };

        saveNotificationData();
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    AdvancedDotDigital: require("../assets/fonts/advanced_dot_digital-7.ttf"),
  });

  // Hide native splash immediately so only Lottie animation is visible
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Minimum 2 second timer
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Dismiss splash animation only when BOTH conditions are met
  useEffect(() => {
    if (minTimeElapsed && animationFinished && loaded) {
      setShowSplashAnimation(false);
    }
  }, [minTimeElapsed, animationFinished, loaded]);

  if (showSplashAnimation) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FF5757",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <StatusBar style="light" />
        <LottieView
          source={require("../assets/gif/start.json")}
          autoPlay
          loop={false}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onAnimationFinish={() => setAnimationFinished(true)}
        />
      </View>
    );
  }

  if (!loaded) {
    return null;
  }

  if (isConnected === false) {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <NoInternetScreen onRetry={retryConnection} isRetrying={isRetrying} />
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  if (showModal && modalAction === "maintenance") {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <MaintenanceScreen message={message} />
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  if (showModal && modalAction === "redirect") {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AppRedirectScreen message={message} redirectUrl={redirectUrl} />
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  if (showModal && modalAction === "force_update") {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <ForceUpdateModal
          visible={true}
          info={updateInfo}
          onUpdate={handleUpdate}
        />
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <UserProvider>
          <NavigationProvider>
            <View style={{ zIndex: 10000 }}>
              <Toast topOffset={70} config={toastConfig} />
            </View>

            <Stack>
              <Stack.Screen
                name="client/(tabs)"
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                  contentStyle: { backgroundColor: "#FFFFFF" },
                }}
              />
              <Stack.Screen
                name="client/(diet)"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/(dietcoach)"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/(pt)"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/(workout)"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/(gymmate)"
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                  contentStyle: { backgroundColor: "#FFFFFF" },
                }}
              />
              <Stack.Screen
                name="client/(sessions)"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/(dailypass)"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/(fitnessclass)"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/(membership)"
                options={{ headerShown: false, gestureEnabled: false }}
              />

              <Stack.Screen name="+not-found" />
              <Stack.Screen
                name="index"
                options={{ headerShown: false, gestureEnabled: false }}
              />

              <Stack.Screen
                name="verification"
                options={{ headerShown: false }}
              />

              {/* ---------------------- registration routes ---------------------- */}
              <Stack.Screen
                name="register/index"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="register/signup"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="register/second-step"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="register/age-selector"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="register/third-step"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="register/fourth-step"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="register/fifth-step"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="register/fifth-step-target"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="register/body-shape-current"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="register/body-shape-target"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="register/sixth-step"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="register/seventh-step"
                options={{ headerShown: false }}
              />

              {/* ---------------------- subscribed client routes ---------------------- */}
              <Stack.Screen
                name="OtpVerification"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/stepDetails"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/exercise"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/diettracker"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/rewardtc"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/subscription"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="client/paynow"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/rewardprogram"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/workouttracker"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/account"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/watertracker"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/credits"
                options={{ headerShown: false, gestureEnabled: false }}
              />

              <Stack.Screen
                name="client/referral"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="client/help"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="client/expertNutrition"
                options={{ headerShown: false, gestureEnabled: false }}
              />

              <Stack.Screen
                name="client/addimage"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/profile"
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="client/viewjourney"
                options={{ headerShown: false, gestureEnabled: false }}
              />

              <Stack.Screen
                name="client/ratenow"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="client/deleteaccount"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/passDateSelection"
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="client/passConfirmed"
                options={{ headerShown: false, gestureEnabled: false }}
              />

              <Stack.Screen
                name="client/personaltraining"
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="client/rewarddashboard"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="client/dailypass"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="client/allpass"
                options={{ headerShown: false, gestureEnabled: false }}
              />

              <Stack.Screen
                name="client/purchasehistory"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="client/passpay"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="client/gympay"
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="client/fittbotcash"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="client/nutritionBooking"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="client/settings"
                options={{ headerShown: false }}
              />

              {/* ---------------------- Unsubscribed client routes ---------------------- */}

              <Stack.Screen
                name="unpaid/activateaccount"
                options={{ headerShown: false }}
              />
            </Stack>
          </NavigationProvider>
        </UserProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
