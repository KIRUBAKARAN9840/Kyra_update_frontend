import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Keyboard,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import * as Animatable from "react-native-animatable";
import OTPInput from "../components/ui/OTPComponent";
import { OTPVerificationAPI, resendOTPAPI } from "../services/Api";
import { showToast } from "../utils/Toaster";
import { Image } from "expo-image";
import LottieView from "lottie-react-native";

const OTPVerificationScreen = () => {
  const { mobile } = useLocalSearchParams();
  const [otpValue, setOtpValue] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoVerifyInitiated, setAutoVerifyInitiated] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const lastVerifiedOTP = useRef(null);
  const verifyingRef = useRef(false);
  const otpLottieRef = useRef(null);
  const router = useRouter();

  let mobile_number;
  try {
    mobile_number = JSON.parse(mobile);
  } catch (error) {
    console.error("Error parsing mobile number:", error);
    mobile_number = mobile; // Use as-is if not valid JSON
  }

  const [entering, setEntering] = useState(false);

  // Play Lottie only when isLoading becomes true, pause & reset on unmount/stop
  useEffect(() => {
    if (isLoading) {
      const t = setTimeout(() => otpLottieRef.current?.play(), 100);
      return () => clearTimeout(t);
    } else {
      otpLottieRef.current?.reset();
    }
  }, [isLoading]);

  const handleOTPComplete = useCallback((otp) => {
    setOtpValue(otp);
    if (otp && otp.length === 6) {
      setVerificationFailed(false);
      setEntering(true);
      if (!verifyingRef.current) {
        verifyingRef.current = true;
        setAutoVerifyInitiated(true);
        handleVerify(otp);
      }
    }
  }, []);

  const handleResendOTP = async () => {
    try {
      // Reset states when resending OTP
      setOtpValue("");
      setAutoVerifyInitiated(false);
      setVerificationFailed(false);
      lastVerifiedOTP.current = null;
      verifyingRef.current = false;

      const id = null;
      const type = "mobile";
      const role = "client";

      const response = await resendOTPAPI(mobile, type, role, id);
      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: "Otp resent Successfully",
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Something went wrong. Please try again later",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    }
  };

  const handleVerify = async (manualOtp = null) => {
    const otpToVerify = manualOtp || otpValue;
    setEntering(true);
    if (!otpToVerify) {
      verifyingRef.current = false;
      return;
    }
    verifyingRef.current = true;

    try {
      const response = await OTPVerificationAPI(mobile, otpToVerify, "client");

      if (response?.status === 200) {
        // Check if incomplete registration - route to signup with mobile
        if (response?.incomplete_registration) {
          setIsLoading(true);
          setTimeout(() => {
            router.replace({
              pathname: "/register/signup",
              params: {
                mobile: mobile_number,
              },
            });
          }, 1000);
          return;
        }

        setIsLoading(true);
        setTimeout(async () => {
          if (response?.data?.gym_id) {
            await AsyncStorage.removeItem("gym_id");
            await AsyncStorage.removeItem("client_id");
            await AsyncStorage.removeItem("role");
            await SecureStore.deleteItemAsync("access_token");
            await SecureStore.deleteItemAsync("refresh_token");
            await AsyncStorage.removeItem("gym_name");
            await AsyncStorage.removeItem("gender");

            await AsyncStorage.setItem(
              "gym_id",
              response?.data?.gym_id.toString(),
            );
            await AsyncStorage.setItem(
              "client_id",
              response?.data?.client_id.toString(),
            );
            await AsyncStorage.setItem("role", "client");
            await SecureStore.setItemAsync(
              "access_token",
              response?.data?.access_token,
            );
            await SecureStore.setItemAsync(
              "refresh_token",
              response?.data?.refresh_token,
            );
            await AsyncStorage.setItem(
              "gym_name",
              response?.data?.gym_name.toString(),
            );
            await AsyncStorage.setItem(
              "gender",
              response?.data?.gender.toString(),
            );

            router.replace("/client/home");
          } else {
            await AsyncStorage.removeItem("gym_id");
            await AsyncStorage.setItem(
              "client_id",
              response?.data?.client_id.toString(),
            );
            await AsyncStorage.setItem("role", "client");
            await SecureStore.setItemAsync(
              "access_token",
              response?.data?.access_token,
            );
            await SecureStore.setItemAsync(
              "refresh_token",
              response?.data?.refresh_token,
            );
            await AsyncStorage.setItem(
              "gender",
              response?.data?.gender.toString(),
            );

            router.replace("/client/home");
          }
        }, 2000);
      } else {
        // Clear OTP and reset states so user can re-enter
        setOtpValue("");
        setVerificationFailed(true);
        setAutoVerifyInitiated(false);
        lastVerifiedOTP.current = null;
        verifyingRef.current = false;
        setIsLoading(false);
        setEntering(false);

        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Invalid OTP. Please try again.",
        });
      }
    } catch (error) {
      console.error("OTP Verification Error:", error);
      // Clear OTP and reset states so user can re-enter
      setOtpValue("");
      setVerificationFailed(true);
      setAutoVerifyInitiated(false);
      lastVerifiedOTP.current = null;
      verifyingRef.current = false;
      setIsLoading(false);
      setEntering(false);

      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    }
  };

  const handleChangeNumber = () => {
    router.replace("/");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        {isLoading ? (
          <LottieView
            ref={otpLottieRef}
            source={require("../assets/gif/otp.json")}
            autoPlay={false}
            loop
            renderToHardwareTextureAndroid
            style={styles.topImage}
          />
        ) : (
          <Image
            source={require("../assets/images/otp.webp")}
            style={styles.topImage}
            contentFit="contain"
          />
        )}

        <Text style={styles.title}>OTP Verification</Text>

        <Text style={styles.subtitle}>
          Enter the OTP sent to{" "}
          <Text style={{ color: "#263148", fontSize: 14 }}>
            {mobile_number}
          </Text>
        </Text>

        <OTPInput
          onComplete={handleOTPComplete}
          onResendOTP={handleResendOTP}
          clearOTP={verificationFailed} // Pass this prop to clear OTP input
        />

        <TouchableOpacity
          style={[
            styles.verifyButton,
            !otpValue
              ? styles.verifyButtonDisabled
              : styles.verifyButtonEnabled,
          ]}
          onPress={() => handleVerify()}
          disabled={!otpValue || entering}
        >
          {entering ? (
            <Animatable.View
              animation="pulse"
              easing="ease-out"
              iterationCount="infinite"
            >
              <Ionicons name="fitness" size={24} color="#FFFFFF" />
            </Animatable.View>
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <View style={styles.changeNumberContainer}>
          <Text style={styles.changeNumberText}>
            Want to change mobile number?{" "}
            <Text onPress={handleChangeNumber} style={styles.changeButton}>
              Change!
            </Text>
          </Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  container2: {
    flex: 1,
    backgroundColor: "#ffffff",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  topImage: {
    width: 250,
    height: 180,
    marginBottom: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#696969",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: "#767676",
    marginBottom: 10,
  },
  verifyButton: {
    width: "100%",
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  verifyButtonEnabled: {
    backgroundColor: "#FF5757",
  },
  verifyButtonDisabled: {
    backgroundColor: "#4A4A4A",
  },
  verifyButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  changeNumberContainer: {
    marginTop: 10,
  },
  changeNumberText: {
    fontSize: 14,
    color: "#888",
  },
  changeButton: {
    color: "#FF5757",
    fontWeight: "600",
  },
});

export default OTPVerificationScreen;
