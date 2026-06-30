import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import OTPInput from "../components/ui/OTPInput";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  changePasswordAPI,
  forgotpasswordAPI,
  resendOTPAPI,
  updateVerificationStatusAPI,
  VerifyOTPAPI,
} from "../services/Api";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Animatable from "react-native-animatable";
import { FontFamily, Color } from "../GlobalStyles";
import { showToast } from "../utils/Toaster";

const { width, height } = Dimensions.get("window");

// Verification Step Circle Component
const VerificationStepCircle = ({ step, currentStep, completed }) => {
  return (
    <View style={styles.stepCircleContainer}>
      <View
        style={[
          styles.stepCircle,
          currentStep === step && styles.activeStepCircle,
          completed && styles.completedStepCircle,
        ]}
      >
        <Text
          style={[
            styles.stepCircleText,
            currentStep === step && styles.activeStepCircleText,
            completed && styles.completedStepCircleText,
          ]}
        >
          {step}
        </Text>
      </View>
    </View>
  );
};

const Verification = () => {
  const router = useRouter();
  const { contact, id, verification } = useLocalSearchParams();

  let verificationStatus;
  try {
    verificationStatus = JSON.parse(verification);
  } catch (error) {
    console.error("Error parsing verification status:", error);
    verificationStatus = { mobile: false, password: false };
  }

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const shakeAnimation = new Animated.Value(0);
  const logoOpacity = new Animated.Value(1);
  const logoTranslateY = new Animated.Value(0);
  const [verifyStatus, setVerifyStatus] = useState(
    verificationStatus || { mobile: false, password: false },
  );

  const [currentStep, setCurrentStep] = useState(verifyStatus.mobile ? 2 : 1);
  const [phoneOTP, setPhoneOTP] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    logoOpacity.setValue(0);
    logoTranslateY.setValue(-20);

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const shakeInputs = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleMobileVerification = async () => {
    setIsLoading(true);
    try {
      const response = await VerifyOTPAPI(contact, phoneOTP);
      if (response?.status === 200) {
        const payload = {
          id,
          verification: {
            mobile: true,
            password: verifyStatus.password,
          },
          role: "client",
        };
        const res = await updateVerificationStatusAPI(payload);

        if (res.status === 200) {
          if (verifyStatus.password) {
            showToast({
              type: "success",
              title: "Success",
              desc: "Mobile Number Verified Successfully. Please login again to get started",
            });
            router.push("/");
          } else {
            setVerifyStatus((prev) => ({ ...prev, mobile: true }));
            setCurrentStep(2);
            showToast({
              type: "success",
              title: "Success",
              desc: "Mobile number verified successfully",
            });
            setPhoneOTP(null);
          }
        } else {
          showToast({
            type: "error",
            title: "Error",
            desc:
              response?.detail ||
              "Something went wrong. Please try again later",
          });
        }
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
    } finally {
      setIsLoading(false);
    }
  };

  const validatePasswords = () => {
    const newErrors = {};

    if (!newPassword.trim()) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirm password is required";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return newErrors;
  };

  const handleSubmit = () => {
    const formErrors = validatePasswords();

    if (Object.keys(formErrors).length === 0) {
      submitNewPassword();
    } else {
      setErrors(formErrors);
      shakeInputs();
    }
  };

  const submitNewPassword = async () => {
    setIsLoading(true);
    try {
      const payload = {
        type: "mobile",
        data: contact,
        password: newPassword,
      };

      const response = await changePasswordAPI(payload);
      if (response?.status === 200) {
        const payload = {
          id,
          verification: {
            mobile: true,
            password: true,
          },
          role: "client",
        };
        const res = await updateVerificationStatusAPI(payload);
        if (res.status === 200) {
          setVerifyStatus((prev) => ({ ...prev, password: true }));
          setCurrentStep(2);
          showToast({
            type: "success",
            title: "Success",
            desc: "2 Step verification completed successfully. Please Login again to enjoy Fymble!!",
          });
          router.push("/");
        } else {
          showToast({
            type: "error",
            title: "Error",
            desc:
              response?.detail ||
              "Something went wrong. Please try again later",
          });
        }
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      const response = await resendOTPAPI(contact, "mobile", "client", id);
      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: "OTP Resent Successfully",
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

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#202020", "#303030", "#404040"]}
        style={styles.background}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ translateY: logoTranslateY }],
              },
            ]}
          >
            <Text style={styles.logoText}>
              <Text style={styles.logoFirstPart}>Fitt</Text>
              <Text style={styles.logoSecondPart}>bot</Text>
            </Text>
            {/* <View style={styles.logoUnderline} />
            <Text style={styles.tagline}>Your Personal Fitness Companion</Text> */}
          </Animated.View>

          <Animatable.View
            animation="fadeInUp"
            duration={800}
            delay={300}
            style={styles.card}
          >
            <View style={styles.stepsHeader}>
              <VerificationStepCircle
                step={1}
                currentStep={currentStep}
                completed={verifyStatus.mobile}
              />
              <VerificationStepCircle
                step={2}
                currentStep={currentStep}
                completed={verifyStatus.password}
              />
            </View>

            <Animated.View
              style={[
                styles.formContainer,
                { transform: [{ translateX: shakeAnimation }] },
              ]}
            >
              {/* Mobile Verification Step */}
              {currentStep === 1 && (
                <View>
                  <Text style={styles.heading}>Mobile Verification</Text>
                  <Text style={styles.label}>Enter OTP sent to {contact}</Text>
                  <OTPInput
                    onComplete={(otp) => {
                      setPhoneOTP(otp);
                    }}
                    onResendOTP={handleResendOTP}
                  />
                  <TouchableOpacity
                    style={
                      phoneOTP == null
                        ? styles.loginButtonDisabled
                        : styles.loginButton
                    }
                    onPress={handleMobileVerification}
                    disabled={phoneOTP == null}
                  >
                    {isLoading ? (
                      <Animatable.View
                        animation="pulse"
                        easing="ease-out"
                        iterationCount="infinite"
                      >
                        <Ionicons name="fitness" size={24} color="#FFFFFF" />
                      </Animatable.View>
                    ) : (
                      <Text style={styles.loginButtonText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Password Change Step */}
              {currentStep === 2 && (
                <Animatable.View
                  animation="fadeInUp"
                  duration={800}
                  delay={300}
                >
                  <View>
                    <Text style={styles.heading}>Change Password</Text>
                  </View>

                  <View style={styles.formContainer}>
                    <Animated.View
                      style={[
                        styles.inputWrapper,
                        errors.newPassword
                          ? { transform: [{ translateX: shakeAnimation }] }
                          : {},
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="#888888"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="New Password"
                        placeholderTextColor="#AAAAAA"
                        secureTextEntry={!showNewPassword}
                        value={newPassword}
                        onChangeText={(text) => {
                          setNewPassword(text);
                          if (errors.newPassword) {
                            setErrors({ ...errors, newPassword: null });
                          }
                        }}
                      />
                      <TouchableOpacity
                        style={styles.eyeIconContainer}
                        onPress={() => setShowNewPassword(!showNewPassword)}
                      >
                        <Ionicons
                          name={
                            showNewPassword ? "eye-outline" : "eye-off-outline"
                          }
                          size={20}
                          color="#888888"
                        />
                      </TouchableOpacity>
                    </Animated.View>
                    {errors.newPassword && (
                      <Text style={styles.errorText}>{errors.newPassword}</Text>
                    )}

                    <Animated.View
                      style={[
                        styles.inputWrapper,
                        errors.confirmPassword
                          ? { transform: [{ translateX: shakeAnimation }] }
                          : {},
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="#888888"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm Password"
                        placeholderTextColor="#AAAAAA"
                        secureTextEntry={!showConfirmPassword}
                        value={confirmPassword}
                        onChangeText={(text) => {
                          setConfirmPassword(text);
                          if (errors.confirmPassword) {
                            setErrors({ ...errors, confirmPassword: null });
                          }
                        }}
                      />
                      <TouchableOpacity
                        style={styles.eyeIconContainer}
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        <Ionicons
                          name={
                            showConfirmPassword
                              ? "eye-outline"
                              : "eye-off-outline"
                          }
                          size={20}
                          color="#888888"
                        />
                      </TouchableOpacity>
                    </Animated.View>
                    {errors.confirmPassword && (
                      <Text style={styles.errorText}>
                        {errors.confirmPassword}
                      </Text>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={
                        isLoading
                          ? styles.loginButtonDisabled
                          : styles.loginButton
                      }
                      onPress={handleSubmit}
                      disabled={isLoading}
                    >
                      <Text style={styles.loginButtonText}>
                        {isLoading ? "UPDATING..." : "UPDATE PASSWORD"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Animatable.View>
              )}
            </Animated.View>
          </Animatable.View>
        </ScrollView>

        {!keyboardVisible && (
          <Animatable.View
            animation="fadeIn"
            duration={1000}
            delay={600}
            style={styles.footer}
          >
            <Text style={styles.footerText}>
              © 2025 NFCTech Fitness Private Limited
            </Text>
          </Animatable.View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: height * 0.1,
    paddingBottom: height * 0.1,
    paddingHorizontal: width * 0.03,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: height * 0.04,
  },
  logoText: {
    fontSize: 55,
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
    fontWeight: "bold",
  },
  logoFirstPart: {
    color: "#FF5757",
  },
  logoSecondPart: {
    color: "#FFFFFF",
  },
  logoUnderline: {
    width: 80,
    height: 4,
    backgroundColor: "#FF5757",
    borderRadius: 2,
    marginTop: 5,
  },
  tagline: {
    color: "#DDDDDD",
    fontSize: 14,
    marginTop: 10,
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    marginTop: height * 0.02,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  stepsHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  stepCircleContainer: {
    marginHorizontal: 10,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  activeStepCircle: {
    backgroundColor: "#FF5757",
  },
  completedStepCircle: {
    backgroundColor: "#4CAF50",
  },
  stepCircleText: {
    color: "#666",
    fontWeight: "bold",
  },
  activeStepCircleText: {
    color: "white",
  },
  completedStepCircleText: {
    color: "white",
  },
  heading: {
    fontSize: 22,
    textAlign: "center",
    fontWeight: "700",
    marginBottom: height * 0.03,
  },
  formContainer: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  inputIcon: {
    marginRight: 10,
  },
  eyeIconContainer: {
    padding: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: FontFamily.urbanistMedium,
    color: "#333333",
  },
  label: {
    fontSize: width * 0.03,
    fontWeight: "500",
    color: "#34495E",
    marginBottom: height * 0.02,
  },
  errorText: {
    color: "#FF5757",
    fontSize: 12,
    marginTop: -5,
    marginBottom: 10,
    paddingLeft: 5,
  },
  loginButton: {
    backgroundColor: "#FF5757",
    borderRadius: 12,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    marginTop: height * 0.02,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: FontFamily.urbanistBold,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    width: "100%",
    alignItems: "center",
  },
  footerText: {
    color: "#DDDDDD",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
  },
  invalidInput: {
    borderColor: "#FF5757",
    borderWidth: 2,
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
  disabledButtonText: {
    color: "#888888",
  },
  loginButton: {
    backgroundColor: "#FF5757",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#FF5757",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  loginButtonDisabled: {
    backgroundColor: "#FF5757",
    height: 55,
    borderRadius: 12,
    opacity: 0.5,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#FF5757",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  loginButtonText: {
    fontSize: 14,
    fontFamily: FontFamily.urbanistSemiBold,
    color: Color.white,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});

export default Verification;
