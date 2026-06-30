import React, { useRef } from "react";
import { BackHandler, ToastAndroid } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const useBackHandler = () => {
  const doubleBackPressRef = useRef(false);
  const timeoutRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      const backAction = () => {
        if (doubleBackPressRef.current) {
          BackHandler.exitApp();
          return true;
        }

        doubleBackPressRef.current = true;
        ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);

        timeoutRef.current = setTimeout(() => {
          doubleBackPressRef.current = false;
        }, 2000);

        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => {
        backHandler.remove();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [])
  );
};

export default useBackHandler;
