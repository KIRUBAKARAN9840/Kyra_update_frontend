import { useState, useEffect, useCallback, useMemo } from "react";
import { Platform, Linking } from "react-native";
import Constants from "expo-constants";
import { getMaintenenceAPI } from "../services/clientApi";

const getCurrentVersion = () => {
  return (
    Constants.expoConfig?.version ||
    Constants.manifest?.version ||
    Constants.manifest2?.extra?.expoClient?.version ||
    Constants.nativeAppVersion
  );
};

export const useAppModal = () => {
  const [modalData, setModalData] = useState({
    showModal: false,
    action: null, // 'maintenance' | 'redirect' | 'force_update'
    message: "",
    redirectUrl: "",
    updateInfo: null,
  });

  useEffect(() => {
    const checkModalStatus = async () => {
      try {
        const currentVersion = getCurrentVersion();
        const platform = Platform.OS === "android" ? "android" : "ios";
        const response = await getMaintenenceAPI(currentVersion, platform);

        if (
          response?.status === 200 &&
          response?.action &&
          response.action !== "ok"
        ) {
          const action = response.action;

          if (action === "maintenance") {
            setModalData({
              showModal: true,
              action: "maintenance",
              message: response?.message || "",
              redirectUrl: "",
              updateInfo: null,
            });
          } else if (action === "redirect") {
            const redirectUrl =
              Platform.OS === "ios"
                ? response?.app_store_url
                : response?.play_store_url;

            setModalData({
              showModal: true,
              action: "redirect",
              message: response?.message || "",
              redirectUrl: redirectUrl || "",
              updateInfo: null,
            });
          } else if (action === "force_update") {
            setModalData({
              showModal: true,
              action: "force_update",
              message: response?.message || "",
              redirectUrl: "",
              updateInfo: {
                update_url:
                  Platform.OS === "android"
                    ? "https://play.google.com/store/apps/details?id=com.fittbot.fittbot_client&hl=en_IN"
                    : "https://apps.apple.com/us/app/fittbot/id6747237294",
                button_label: response?.button_label || "Update Now",
                current_version: response?.current_version || "",
              },
            });
          }
        } else {
          setModalData({
            showModal: false,
            action: null,
            message: "",
            redirectUrl: "",
            updateInfo: null,
          });
        }
      } catch (error) {
        console.error("Error checking modal status:", error);
        // On error, don't show modal to allow app usage
        setModalData({
          showModal: false,
          action: null,
          message: "",
          redirectUrl: "",
          updateInfo: null,
        });
      }
    };

    checkModalStatus();
  }, []);

  const handleUpdate = useCallback(async () => {
    const url = modalData.updateInfo?.update_url;

    if (!url) {
      console.error("No update URL provided");
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.error("Cannot open URL:", url);
      }
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  }, [modalData.updateInfo]);

  return useMemo(
    () => ({
      showModal: modalData.showModal,
      modalAction: modalData.action,
      message: modalData.message,
      redirectUrl: modalData.redirectUrl,
      updateInfo: modalData.updateInfo,
      handleUpdate,
    }),
    [modalData, handleUpdate],
  );
};
