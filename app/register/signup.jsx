import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  Alert,
  BackHandler,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Formik, Field } from "formik";
import * as Yup from "yup";
import { Feather } from "@expo/vector-icons";
import { Color } from "../../GlobalStyles";
import {
  checkReferral as checkReferralAPI,
  registerUserNew,
} from "../../services/clientApi";
import { showToast } from "../../utils/Toaster";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { registerForPushNotificationsAsync } from "../../components/usePushNotifications";
import { ImageBackground } from "expo-image";
import appsFlyer from "react-native-appsflyer";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Indian cities array for location suggestions
const INDIAN_CITIES = [
  // Metro Cities
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Ahmedabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Jaipur",
  "Surat",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Thane",
  "Bhopal",
  "Visakhapatnam",
  "Pimpri-Chinchwad",
  "Patna",
  "Vadodara",
  "Ghaziabad",
  "Ludhiana",
  "Agra",
  "Nashik",
  "Ranchi",
  "Faridabad",
  "Meerut",
  "Rajkot",
  "Varanasi",
  "Srinagar",
  "Aurangabad",
  "Dhanbad",
  "Amritsar",
  "Navi Mumbai",
  "Allahabad",
  "Howrah",
  "Jabalpur",
  "Gwalior",
  "Vijayawada",
  "Jodhpur",
  "Madurai",
  "Raipur",
  "Kota",
  "Guwahati",
  "Chandigarh",
  "Solapur",
  "Hubli-Dharwad",
  "Mysore",
  "Tiruchirappalli",
  "Bareilly",
  "Aligarh",
  "Tiruppur",
  "Gurgaon",
  "Moradabad",
  "Jalandhar",
  "Bhubaneswar",
  "Salem",
  "Mira-Bhayandar",
  "Warangal",
  "Thiruvananthapuram",
  "Bhiwandi",
  "Saharanpur",
  "Guntur",
  "Amravati",
  "Bikaner",
  "Noida",
  "Jamshedpur",
  "Bhilai",
  "Cuttack",
  "Firozabad",
  "Kochi",
  "Nellore",
  "Bhavnagar",
  "Dehradun",
  "Durgapur",
  "Asansol",
  "Rourkela",
  "Nanded",
  "Kolhapur",
  "Ajmer",
  "Akola",
  "Gulbarga",
  "Jamnagar",
  "Ujjain",
  "Loni",
  "Siliguri",
  "Jhansi",
  "Ulhasnagar",
  "Jammu",
  "Sangli-Miraj & Kupwad",
  "Mangalore",
  "Erode",
  "Belgaum",
  "Ambattur",
  "Tirunelveli",
  "Malegaon",
  "Gaya",
  "Jalgaon",
  "Udaipur",
  "Maheshtala",
  "Tirupur",
  "Davanagere",
  "Kozhikode",
  "Akola",
  "Rajpur",
  "Bokaro",
  "Dhule",
  "Karnal",
  "Bathinda",
  "Jalna",
  "Eluru",
  "Baroda",
  "Kurnool",
  "Kakinada",
  "Nizamabad",
  "Panipat",
  "Tumkur",
  "Ramagundam",
  "Raichur",
  "Nalgonda",
  "Bellary",
  "Kadapa",
  "Khammam",
  "Secunderabad",
  "Vizianagaram",
  "Anantapur",
  "Karimnagar",
  "Nellore",
  "Ongole",
  "Nizamabad",
  "Mahbubnagar",
  "Adoni",
  "Proddatur",
  "Machilipatnam",
  "Chittoor",
  "Tenali",
  "Chirala",
  "Hindupur",
  "Narasaraopet",
  "Kavali",
  "Srikakulam",
  "Bhimavaram",
  "Madanapalle",
  "Guntakal",
  "Markapur",
  "Repalle",
  "Tadipatri",
  "Tadepalligudem",
  "Gudivada",
  "Vinukonda",
].sort();

// Black and white confetti colors
const CONFETTI_COLORS = ["#000000", "#FFFFFF", "#333333", "#CCCCCC"];

const ConfettiPiece = ({ delay, side, color }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(new Animated.Value(0)).current;

  const horizontalSpread = (Math.random() - 0.5) * SCREEN_WIDTH * 0.7;
  const verticalDistance = SCREEN_HEIGHT * (0.5 + Math.random() * 0.4);
  const confettiSize = 3 + Math.random() * 4;

  useEffect(() => {
    const animationDelay = delay + Math.random() * 100;

    Animated.parallel([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1200 + Math.random() * 400,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.timing(rotationValue, {
        toValue: 1,
        duration: 1000 + Math.random() * 300,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  const startX =
    side === "left"
      ? 20 + Math.random() * 40
      : SCREEN_WIDTH - 60 + Math.random() * 40;
  const startY = SCREEN_HEIGHT - 20;

  const translateX = animatedValue.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [
      startX,
      startX + horizontalSpread * 0.6,
      startX + horizontalSpread,
    ],
  });

  const translateY = animatedValue.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [
      startY,
      startY - verticalDistance * 0.8,
      startY - verticalDistance * 0.95,
      startY - verticalDistance,
    ],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0.3, 1.2, 1, 0.4],
  });

  const rotate = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          backgroundColor: color,
          width: confettiSize,
          height: confettiSize,
          borderRadius: 1,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }, { rotate }],
        },
      ]}
    />
  );
};

// Validation Schema - contact is conditional
const createValidationSchema = (hasMobileParam) => {
  const schemaShape = {
    full_name: Yup.string()
      .min(2, "Name is too short")
      .max(50, "Name is too long")
      .required("Full Name is required"),

    gender: Yup.string()
      .oneOf(["male", "female"], "Please select a gender")
      .required("Gender is required"),

    location: Yup.string()
      .min(2, "Location is too short")
      .max(50, "Location is too long")
      .required("Location is required"),

    referral_id: Yup.string()
      .min(2, "Referral ID is too short")
      .max(20, "Referral ID is too long"),
  };

  // Only require contact if not passed as param
  if (!hasMobileParam) {
    schemaShape.contact = Yup.string()
      .matches(/^[0-9]{10}$/, "Mobile number must be 10 digits")
      .required("Mobile Number is required");
  }

  return Yup.object().shape(schemaShape);
};

// Custom Input Component
const CustomInput = ({
  field: { name, onChange, value },
  form: { errors, touched, handleBlur },
  ...props
}) => {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={[
          styles.input,
          errors[name] && touched[name] && styles.inputError,
        ]}
        onChangeText={onChange(name)}
        onBlur={handleBlur(name)}
        value={value}
        placeholderTextColor="#767676"
        {...props}
      />
      {errors[name] && touched[name] && (
        <Text style={styles.errorText}>{errors[name]}</Text>
      )}
    </View>
  );
};

// Location Input Component with Autocomplete
const LocationInput = ({
  field: { name, onChange, value },
  form: { errors, touched, handleBlur, setFieldValue },
  ...props
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState([]);

  const handleTextChange = (text) => {
    onChange(name)(text);
    if (text.length > 0) {
      const filtered = INDIAN_CITIES.filter((city) =>
        city.toLowerCase().startsWith(text.toLowerCase()),
      ).slice(0, 10); // Limit to 10 suggestions
      setFilteredCities(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectCity = (city) => {
    setFieldValue(name, city);
    setShowSuggestions(false);
    setFilteredCities([]);
  };

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={[
          styles.input,
          errors[name] && touched[name] && styles.inputError,
        ]}
        onChangeText={handleTextChange}
        onBlur={() => {
          handleBlur(name);
          setShowSuggestions(false);
        }}
        value={value}
        placeholderTextColor="#767676"
        {...props}
      />
      {showSuggestions && filteredCities.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.suggestionsScroll}
          >
            {filteredCities.map((city, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => selectCity(city)}
              >
                <Feather
                  name="map-pin"
                  size={16}
                  color="#767676"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.suggestionText}>{city}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      {errors[name] && touched[name] && (
        <Text style={styles.errorText}>{errors[name]}</Text>
      )}
    </View>
  );
};

// Gender Selection Component
const GenderSelector = ({
  field: { name, value },
  form: { setFieldValue, errors, touched },
}) => {
  return (
    <View style={styles.inputContainer}>
      <View style={styles.genderRow}>
        <TouchableOpacity
          style={styles.genderOption}
          onPress={() => setFieldValue(name, "male")}
          activeOpacity={0.7}
        >
          <Text style={styles.genderText}>Male</Text>
          <View
            style={[
              styles.radioButton,
              value === "male" && styles.radioButtonSelected,
            ]}
          >
            {value === "male" && <View style={styles.radioButtonInner} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.genderOption}
          onPress={() => setFieldValue(name, "female")}
          activeOpacity={0.7}
        >
          <Text style={styles.genderText}>Female</Text>
          <View
            style={[
              styles.radioButton,
              value === "female" && styles.radioButtonSelected,
            ]}
          >
            {value === "female" && <View style={styles.radioButtonInner} />}
          </View>
        </TouchableOpacity>
      </View>
      {errors[name] && touched[name] && (
        <Text style={styles.errorText}>{errors[name]}</Text>
      )}
    </View>
  );
};

const SignUp = () => {
  const router = useRouter();
  const { mobile: mobileParam } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isReferralValid, setIsReferralValid] = useState(false);
  const [referralClientName, setReferralClientName] = useState("");
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [isCheckingReferral, setIsCheckingReferral] = useState(false);
  const insets = useSafeAreaInsets();
  const modalScale = useRef(new Animated.Value(0)).current;

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.push("/");
        return true;
      },
    );

    return () => backHandler.remove();
  }, []);

  // Check if mobile is passed as param (incomplete registration flow)
  const hasMobileParam = !!mobileParam;

  const handleApplyReferral = async (referralCode, setFieldValue) => {
    if (!referralCode?.trim()) return;

    try {
      setIsCheckingReferral(true);
      const response = await checkReferralAPI(referralCode.trim());

      if (response?.status === 200 && response?.available === true) {
        setIsReferralValid(true);
        setReferralClientName(response?.client_name || "");
        setShowReferralModal(true);

        // Animate modal entrance
        Animated.spring(modalScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      } else {
        setIsReferralValid(false);
        setReferralClientName("");
        setShowReferralModal(false);
        setFieldValue("referral_id", "");

        showToast({
          type: "error",
          title: "Invalid Referral",
          desc: "This referral code is not valid. Please check and try again.",
        });
      }
    } catch (error) {
      setIsReferralValid(false);
      setReferralClientName("");
      setShowReferralModal(false);
      setFieldValue("referral_id", "");

      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to validate referral code. Please try again.",
      });
    } finally {
      setIsCheckingReferral(false);
    }
  };

  const closeReferralModal = () => {
    Animated.timing(modalScale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowReferralModal(false);
    });
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setIsLoading(true);

      // Use mobile from param if available, otherwise from form
      const mobileNumber = hasMobileParam ? mobileParam : values.contact;

      const payload = {
        name: values.full_name,
        mobile_number: mobileNumber,
        gender: values.gender,
        location: values.location,
        referral_id: isReferralValid ? values.referral_id : null,
        platform: Platform.OS,
      };
      const response = await registerUserNew(payload);

      if (response?.status === 200) {
        const deviceId = await AsyncStorage.getItem("device_id");
        appsFlyer
          .logEvent("af_complete_registration", {
            device_id:
              deviceId ||
              Math.random().toString(15).substring(2) + Date.now().toString(15),
            timestamp: new Date().toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            }),
          })
          .catch((err) => console.log("AppsFlyer error:", err));
        // If mobile param exists (incomplete registration flow), complete registration here
        if (hasMobileParam) {
          // Store data in AsyncStorage like in second-step.jsx
          await AsyncStorage.setItem(
            "client_id",
            JSON.stringify(response?.data?.client_id),
          );
          await AsyncStorage.setItem("role", "client");
          await SecureStore.setItemAsync(
            "access_token",
            response.data.access_token,
          );
          await SecureStore.setItemAsync(
            "refresh_token",
            response?.data?.refresh_token,
          );
          await AsyncStorage.setItem(
            "gender",
            response?.data?.gender.toString(),
          );
          await registerForPushNotificationsAsync(response.data.client_id);

          showToast({
            type: "success",
            title: "Success",
            desc: "Registration Successful. Let's start your fitness journey with Fymble!",
          });

          router.push({
            pathname: "/client/home",
          });
        } else {
          // Normal flow - go to second-step for OTP verification
          showToast({
            type: "success",
            title: "Success",
            desc: "Registration Successful!",
          });
          router.push({
            pathname: "/register/second-step",
            params: {
              full_name: values.full_name,
              contact: values.contact,
            },
          });
        }
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Registration failed. Please try again.",
        });
        setIsLoading(false);
        setSubmitting(false);
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Registration failed. Please try again.",
      });
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ImageBackground
        source={require("../../assets/images/sign_up.webp")}
        style={styles.backgroundImage}
        contentFit="cover"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.headerContainer}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>WELCOME</Text>
              <Text style={styles.welcomeSubtitleOne}>to</Text>
              <Text style={styles.welcomeSubtitleTwo}>
                Fy<Text style={{ color: "#263148" }}>mble</Text>
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Almost there! Let’s get you started
              </Text>
            </View>
          </View>

          <Formik
            initialValues={{
              full_name: "",
              contact: mobileParam || "",
              gender: "",
              location: "",
              referral_id: "",
            }}
            validationSchema={createValidationSchema(hasMobileParam)}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({
              handleSubmit,
              isValid,
              isSubmitting,
              values,
              setFieldValue,
            }) => (
              <View style={styles.formContainer}>
                <Field
                  component={CustomInput}
                  name="full_name"
                  placeholder="Full name"
                  autoCapitalize="words"
                />

                {!hasMobileParam && (
                  <Field
                    component={CustomInput}
                    name="contact"
                    placeholder="Mobile number"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                )}

                <Field component={GenderSelector} name="gender" />

                <Field
                  component={LocationInput}
                  name="location"
                  placeholder="Location"
                  autoCapitalize="words"
                />

                <View style={styles.referralRow}>
                  <View style={styles.referralInput}>
                    <Field
                      component={CustomInput}
                      name="referral_id"
                      placeholder="Referral Id (optional)"
                      autoCapitalize="none"
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.applyButton,
                      (!values.referral_id?.trim() || isCheckingReferral) &&
                        styles.applyButtonDisabled,
                    ]}
                    disabled={!values.referral_id?.trim() || isCheckingReferral}
                    onPress={() =>
                      handleApplyReferral(values.referral_id, setFieldValue)
                    }
                  >
                    {isCheckingReferral ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.applyButtonText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    (!isValid || isLoading || isSubmitting) &&
                      styles.continueButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!isValid || isLoading || isSubmitting}
                  activeOpacity={0.7}
                >
                  {isLoading || isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.continueButtonText}>Continue</Text>
                      <Feather name="arrow-right" size={20} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Formik>
        </ScrollView>

        {/* Referral Success Modal */}
        <Modal
          visible={showReferralModal}
          transparent
          animationType="none"
          onRequestClose={closeReferralModal}
        >
          <View style={styles.modalOverlay}>
            {/* Confetti */}
            {Array.from({ length: 120 }).map((_, i) => {
              const side = i % 2 === 0 ? "left" : "right";
              const delay = Math.floor(i / 6) * 25;
              const color =
                CONFETTI_COLORS[
                  Math.floor(Math.random() * CONFETTI_COLORS.length)
                ];
              return (
                <ConfettiPiece
                  key={i}
                  delay={delay}
                  side={side}
                  color={color}
                />
              );
            })}

            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ scale: modalScale }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeReferralModal}
              >
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>

              <Feather name="check-circle" size={60} color="#000000" />
              <Text style={styles.modalCongratsText}>Congratulations!</Text>
              <Text style={styles.modalSuccessText}>
                You will get{" "}
                <Text style={styles.modalCashAmount}>100 Fymble Cash</Text>
              </Text>
              <Text style={styles.modalFromText}>
                by the referral from your friend
              </Text>
              <Text style={styles.modalFriendName}>{referralClientName}</Text>
              <Text style={styles.modalNote}>
                when you complete the registration process
              </Text>
              <Text style={styles.modalAppliedText}>Referral Applied</Text>
            </Animated.View>
          </View>
        </Modal>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 40,
    paddingBottom: 300,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 35,
    marginTop: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 45,
    backgroundColor: "#FFF0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeContainer: {
    width: "100%",
    paddingHorizontal: 10,
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 35,
    fontWeight: "400",
    color: "#263148",
    marginBottom: 4,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#000000",
    lineHeight: 22,
    textAlign: "center",
  },
  welcomeSubtitleOne: {
    fontSize: 20,
    color: "#263148",
    marginBottom: 0,
    textAlign: "center",
  },
  welcomeSubtitleTwo: {
    fontSize: 45,
    fontWeight: "600",
    color: "#FF5757",
    marginBottom: 4,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    borderColor: "#EEEEEE",
    fontSize: 16,
    color: "#767676",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputError: {
    borderColor: "#FF5757",
  },
  errorText: {
    color: "#FF5757",
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  genderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: -5,
  },
  genderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    borderColor: "#EEEEEE",
    marginHorizontal: 5,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonSelected: {
    borderColor: "#FF5757",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF5757",
  },
  genderText: {
    fontSize: 16,
    color: "#767676",
  },
  referralRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  referralInput: {
    flex: 1,
    marginRight: 10,
  },
  applyButton: {
    backgroundColor: "#FF5757",
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    height: 55,
    minWidth: 80,
  },
  applyButtonDisabled: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  continueButton: {
    backgroundColor: "#FF5757",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 55,
    borderRadius: 12,
    marginTop: 10,
    elevation: 2,
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  continueButtonDisabled: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 10,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  loginText: {
    color: "#767676",
    fontSize: 14,
  },
  loginLink: {
    color: "#FF5757",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    width: "85%",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FF5757",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 1,
  },
  modalCongratsText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
    marginTop: 15,
    marginBottom: 10,
  },
  modalSuccessText: {
    fontSize: 16,
    color: "#333333",
    textAlign: "center",
    marginVertical: 5,
  },
  modalCashAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF5757",
  },
  modalFromText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginTop: 2,
  },
  modalFriendName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
    marginTop: 10,
    marginBottom: 5,
  },
  modalNote: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 5,
    marginBottom: 15,
  },
  modalAppliedText: {
    fontSize: 14,
    color: "#000000",
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
  },
  highlight: {
    color: "#FF5757",
  },
  suggestionsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 5,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  suggestionsScroll: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  suggestionText: {
    fontSize: 16,
    color: "#333333",
  },
});

export default SignUp;
