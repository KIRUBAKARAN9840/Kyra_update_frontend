import React from "react";
import { BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";

const useHomeBackHandler = () => {
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      const backAction = () => {
        router.push({
          pathname: "/client/home",
          params: {
            tab: "My Progress",
          },
        });
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => {
        backHandler.remove();
      };
    }, [router])
  );
};

export default useHomeBackHandler;
