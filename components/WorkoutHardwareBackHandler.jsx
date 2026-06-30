import React, { useEffect } from "react";
import { BackHandler } from "react-native";
import { useRouter } from "expo-router";

const UnsavedChangesBackHandler = ({
  hasUnsavedChanges = false,
  enabled = true,
  onShowConfirmModal = null,
  routePath = null,
  params = {},
  onBackPress = null,
  useBackInsteadOfPush = false, // New prop to choose between push and back
}) => {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const backAction = () => {
      // If there are unsaved changes, show confirmation modal
      if (hasUnsavedChanges) {
        if (onShowConfirmModal) {
          onShowConfirmModal();
          return true; // Prevent default back behavior
        }
      }

      // If custom onBackPress is provided, call it first
      if (onBackPress) {
        const shouldContinue = onBackPress();
        // If onBackPress returns false, prevent default navigation
        if (shouldContinue === false) {
          return true;
        }
      }

      // Navigate to the specified route if provided
      if (routePath) {
        if (useBackInsteadOfPush) {
          // Use router.back() to go back in the navigation stack
          router.back();
        } else {
          if (Object.keys(params).length > 0) {
            router.push({
              pathname: routePath,
              params: params,
            });
          } else {
            router.push(routePath);
          }
        }
        return true; // Prevent default back behavior
      }

      return false; // Allow default back behavior if no route specified
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    // Cleanup function
    return () => backHandler.remove();
  }, [
    hasUnsavedChanges,
    routePath,
    params,
    enabled,
    onBackPress,
    onShowConfirmModal,
    router,
  ]);

  // This component doesn't render anything
  return null;
};

export default UnsavedChangesBackHandler;
