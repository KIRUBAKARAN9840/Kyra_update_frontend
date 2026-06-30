import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  View,
  ScrollView,
  StyleSheet,
} from "react-native";
import FirstStepRegistration from "../../components/ui/Register/FirstStepRegistration";
import { Color, linearGradientColors } from "../../GlobalStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const Register = () => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
      ]}
    >
      <LinearGradient
        style={{ flex: 1, width: "100%", height: "100%" }}
        colors={["#FFFFFF", "#FFFFFF", "#FFFFFF"]}
      >
        <FirstStepRegistration />
      </LinearGradient>
    </View>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
});
