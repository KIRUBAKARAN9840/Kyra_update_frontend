import React, { useEffect } from "react";
import { BackHandler } from "react-native";
import { useRouter } from "expo-router";

const HardwareBackHandler = ({
  routePath,
  params = {},
  enabled = true,
  onBackPress = null,
}) => {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const backAction = () => {
      // If custom onBackPress is provided, call it first
      if (onBackPress) {
        const shouldContinue = onBackPress();
        // If onBackPress returns false, prevent default navigation
        if (shouldContinue === false) {
          return true;
        }
      }

      // Navigate to the specified route
      if (routePath) {
        if (Object.keys(params).length > 0) {
          router.replace({
            pathname: routePath,
            params: params,
          });
        } else {
          router.replace(routePath);
        }
        return true; // Prevent default back behavior
      }

      return false; // Allow default back behavior if no route specified
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    // Cleanup function
    return () => backHandler.remove();
  }, [routePath, params, enabled, onBackPress, router]);

  // This component doesn't render anything
  return null;
};

export default HardwareBackHandler;
