import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Linking } from "react-native";
import { getVersionAPI } from "../services/clientApi";

const getCurrentVersion = () => {
  const version =
    Constants.expoConfig?.version ||
    Constants.manifest?.version ||
    Constants.manifest2?.extra?.expoClient?.version ||
    Constants.nativeAppVersion;

  return version;
};

export const useForceUpdate = () => {
  const [state, setState] = useState({
    visible: false,
    info: null,
  });

  const checkVersion = useCallback(async () => {
    try {
      const currentVersion = getCurrentVersion();
      const platform = Platform.OS === "android" ? "android" : "ios";
      const response = await getVersionAPI(currentVersion, platform);

      if (response?.status === 200 && response?.force_update === true) {
        const info = {
          title: "Update Required",
          update_url:
            Platform.OS === "android"
              ? "https://play.google.com/store/apps/details?id=com.fittbot.fittbot_client&hl=en_IN"
              : "https://apps.apple.com/us/app/fittbot/id6747237294",
          button_label: "Update Now",
          app_name: "Fymble - Book Daily Gym Pass",
          force_update: true,
        };
        setState({ visible: true, info });
      } else {
        setState({ visible: false, info: null });
      }
    } catch (error) {
      console.error("Version check failed:", error);
    }
  }, []);

  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  const handleUpdate = useCallback(() => {
    const url = state.info?.update_url;
    if (url) {
      Linking.openURL(url).catch((error) => {
        console.error("Failed to open URL:", error);
      });
    }
  }, [state.info]);

  return useMemo(
    () => ({
      visible: state.visible,
      info: state.info,
      handleUpdate,
      checkVersion,
    }),
    [state, handleUpdate, checkVersion],
  );
};
