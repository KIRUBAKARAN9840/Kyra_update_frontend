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
  FlatList,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Field, Formik } from "formik";
import * as Yup from "yup";
import { Feather } from "@expo/vector-icons";
import { Color } from "../../../GlobalStyles";
import MobileLogo from "./MobileLogo";
import ContinueButton from "./ContinueButton";
import CardTitle from "./CardTitle";
import {
  registerUserAPI,
  checkReferral as checkReferralAPI,
} from "../../../services/clientApi";
import { showToast } from "../../../utils/Toaster";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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

// Major Indian Cities
const INDIAN_CITIES = [
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
  "Faridabad",
  "Meerut",
  "Rajkot",
  "Kalyan-Dombivali",
  "Vasai-Virar",
  "Varanasi",
  "Srinagar",
  "Aurangabad",
  "Dhanbad",
  "Amritsar",
  "Navi Mumbai",
  "Allahabad",
  "Ranchi",
  "Howrah",
  "Coimbatore",
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
  "Bareilly",
  "Moradabad",
  "Mysore",
  "Gurgaon",
  "Aligarh",
  "Jalandhar",
  "Tiruchirappalli",
  "Bhubaneswar",
  "Salem",
  "Mira-Bhayandar",
  "Warangal",
  "Thiruvananthapuram",
  "Guntur",
  "Bhiwandi",
  "Saharanpur",
  "Gorakhpur",
  "Bikaner",
  "Amravati",
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
  "Sangli-Miraj-Kupwad",
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
  "Davanagere",
  "Kozhikode",
  "Kurnool",
  "Rajpur Sonarpur",
  "Rajahmundry",
  "Bokaro",
  "South Dumdum",
  "Bellary",
  "Patiala",
  "Gopalpur",
  "Agartala",
  "Bhagalpur",
  "Muzaffarnagar",
  "Bhatpara",
  "Panihati",
  "Latur",
  "Dhule",
  "Tiruppur",
  "Rohtak",
  "Korba",
  "Bhilwara",
  "Berhampur",
  "Muzaffarpur",
  "Ahmednagar",
  "Mathura",
  "Kollam",
  "Avadi",
  "Kadapa",
  "Kamarhati",
  "Sambalpur",
  "Bilaspur",
  "Shahjahanpur",
  "Satara",
  "Bijapur",
  "Rampur",
  "Shivamogga",
  "Chandrapur",
  "Junagadh",
  "Thrissur",
  "Alwar",
  "Bardhaman",
  "Kulti",
  "Kakinada",
  "Nizamabad",
  "Parbhani",
  "Tumkur",
  "Khammam",
  "Ozhukarai",
  "Bihar Sharif",
  "Panipat",
  "Darbhanga",
  "Bally",
  "Aizawl",
  "Dewas",
  "Ichalkaranji",
  "Karnal",
  "Bathinda",
  "Jalna",
  "Eluru",
  "Kirari Suleman Nagar",
  "Barasat",
  "Purnia",
  "Satna",
  "Mau",
  "Sonipat",
  "Farrukhabad",
  "Sagar",
  "Rourkela",
  "Durg",
  "Imphal",
  "Ratlam",
  "Hapur",
  "Arrah",
  "Karimnagar",
  "Anantapur",
  "Etawah",
  "Ambernath",
  "North Dumdum",
  "Bharatpur",
  "Begusarai",
  "New Delhi",
  "Gandhidham",
  "Baranagar",
  "Tiruvottiyur",
  "Puducherry",
  "Sikar",
  "Thoothukudi",
  "Rewa",
  "Mirzapur",
  "Raichur",
  "Pali",
  "Ramagundam",
  "Haridwar",
  "Vijayanagaram",
  "Katihar",
  "Naihati",
  "Sambhal",
  "Nadiad",
  "Yamunanagar",
  "English Bazar",
  "Eluru",
  "Munger",
  "Panchkula",
  "Raayachuru",
  "Panvel",
  "Deoghar",
  "Ongole",
  "Nandyal",
  "Morena",
  "Bhiwani",
  "Porbandar",
  "Palakkad",
  "Anand",
  "Puruliya",
  "Baharampur",
  "Barmer",
  "Unnao",
  "Tadipatri",
  "Kishanganj",
  "Karaikudi",
  "Hazaribagh",
  "Bhimavaram",
  "Kumbakonam",
  "Tenkasi",
  "Vizianagaram",
  "Kancheepuram",
  "Vellore",
  "Cuddalore",
  "Dindigul",
  "Thanjavur",
].sort();

// Validation Schema
const validationSchema = Yup.object().shape({
  full_name: Yup.string()
    .min(2, "Name is too short")
    .max(50, "Name is too long")
    .required("Full Name is required"),

  // age: Yup.number()
  //   .positive('Age must be a positive number')
  //   .integer('Age must be an integer')
  //   .min(18, 'You must be at least 18 years old')
  //   .max(120, 'Please enter a valid age')
  //   .required('Age is required'),

  contact: Yup.string()
    .matches(/^[0-9]{10}$/, "Mobile number must be 10 digits")
    .required("Mobile Number is required"),

  email: Yup.string()
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please enter a valid email address"
    )
    .email("Invalid email address")
    .required("Email is required"),

  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),

  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Confirm Password is required"),

  location: Yup.string()
    .min(2, "Location is too short")
    .max(100, "Location is too long")
    .required("Location is required"),

  pincode: Yup.string()
    .matches(/^[0-9]{6}$/, "Pincode must be 6 digits")
    .required("Pincode is required"),

  referral_id: Yup.string()
    .min(2, "Referral ID is too short")
    .max(20, "Referral ID is too long"),
});

// Update your existing validation schema to add more robust password requirements
const passwordValidationSchema = Yup.object().shape({
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must include uppercase, lowercase, number, and special character"
    )
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Confirm Password is required"),
});

// Custom Input Component
const CustomInput = ({
  field: { name, onBlur, onChange, value, type },
  form: { errors, touched, handleBlur },
  innerRef,
  ...props
}) => {
  return (
    <View style={styles.inputContainer}>
      <View
        style={[
          styles.inputWrapper,
          errors[name] && touched[name] && styles.inputError,
        ]}
      >
        <Feather
          name={getIconName(name)}
          size={20}
          color={errors[name] && touched[name] ? Color.rgError : Color.rgIcon}
          style={styles.icon}
        />
        <TextInput
          ref={innerRef}
          style={styles.input}
          onChangeText={onChange(name)}
          onBlur={handleBlur(name)}
          value={value}
          type={type}
          placeholderTextColor="#767676"
          {...props}
        />
        {errors[name] && touched[name] && (
          <Feather name="alert-circle" size={20} color="red" />
        )}
      </View>
      {errors[name] && touched[name] && (
        <Text style={styles.errorText}>{errors[name]}</Text>
      )}
    </View>
  );
};

// City Autocomplete Component
const CityAutocomplete = ({
  field: { name, onBlur, onChange, value },
  form: { errors, touched, handleBlur, setFieldValue },
  ...props
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleTextChange = (text) => {
    onChange(name)(text);

    if (text.length > 0) {
      const filtered = INDIAN_CITIES.filter((city) =>
        city.toLowerCase().startsWith(text.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectCity = (city) => {
    setFieldValue(name, city);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <View style={styles.inputContainer}>
      <View
        style={[
          styles.inputWrapper,
          errors[name] && touched[name] && styles.inputError,
        ]}
      >
        <Feather
          name="map-pin"
          size={20}
          color={errors[name] && touched[name] ? Color.rgError : Color.rgIcon}
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          onChangeText={handleTextChange}
          onBlur={() => {
            handleBlur(name);
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          value={value}
          placeholderTextColor="#767676"
          {...props}
        />
        {errors[name] && touched[name] && (
          <Feather name="alert-circle" size={20} color="red" />
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((city, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => selectCity(city)}
            >
              <Feather name="map-pin" size={16} color={Color.rgIcon} />
              <Text style={styles.suggestionText}>{city}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {errors[name] && touched[name] && (
        <Text style={styles.errorText}>{errors[name]}</Text>
      )}
    </View>
  );
};

// Custom Password Input Component
const PasswordInput = ({
  field: { name, onBlur, onChange, value },
  form: { errors, touched, handleBlur },
  ...props
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Password strength indicator
  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(value);

  return (
    <View style={styles.inputContainer}>
      <View
        style={[
          styles.inputWrapper,
          errors[name] && touched[name] && styles.inputError,
        ]}
      >
        <Feather
          name="lock"
          size={20}
          color={errors[name] && touched[name] ? Color.rgError : Color.rgIcon}
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          onChangeText={onChange(name)}
          onBlur={handleBlur(name)}
          value={value}
          secureTextEntry={!isPasswordVisible}
          placeholderTextColor="#767676"
          {...props}
        />

        {/* Password Visibility Toggle */}
        <TouchableOpacity
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          style={styles.eyeIcon}
        >
          <Feather
            name={isPasswordVisible ? "eye-off" : "eye"}
            size={20}
            color="#4A4A4A"
          />
        </TouchableOpacity>
      </View>

      {/* Password Strength Indicator */}
      <View style={styles.strengthIndicator}>
        {[1, 2, 3, 4, 5].map((_, index) => (
          <View
            key={index}
            style={[
              styles.strengthBar,
              index < passwordStrength && {
                backgroundColor:
                  passwordStrength <= 2
                    ? "red"
                    : passwordStrength <= 4
                    ? "orange"
                    : "green",
              },
            ]}
          />
        ))}
      </View>

      {/* Error Message */}
      {errors[name] && touched[name] && (
        <Text style={styles.errorText}>{errors[name]}</Text>
      )}
    </View>
  );
};

// Row Layout Component for two inputs
const InputRow = ({ children }) => {
  return <View style={styles.inputRow}>{children}</View>;
};

// Icon selection helper
const getIconName = (fieldName) => {
  switch (fieldName) {
    case "full_name":
      return "user";
    case "age":
      return "calendar";
    case "contact":
      return "phone";
    case "email":
      return "mail";
    case "password":
      return "lock";
    case "confirmPassword":
      return "lock";
    case "location":
      return "map-pin";
    case "pincode":
      return "hash";
    case "referral_id":
      return "gift";
    default:
      return "check";
  }
};

const FirstStepRegistration = () => {
  const router = useRouter();
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReferralValid, setIsReferralValid] = useState(false);
  const [referralClientName, setReferralClientName] = useState("");
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [isCheckingReferral, setIsCheckingReferral] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const insets = useSafeAreaInsets();
  const firstInputRef = useRef(null);
  const modalScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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

  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    try {
      setIsLoading(true);
      setApiError(null);

      let data = {
        full_name: values.full_name,
        contact: values.contact,
        email: values.email,
        password: values.password,
        location: values.location,
        pincode: values.pincode,
        referral_id: isReferralValid ? values.referral_id : null,
      };

      const response = await registerUserAPI(data);

      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Registration",
          desc: response?.message,
          visibilityTime: 5000,
        });

        setTimeout(() => {
          if (
            response.otp_verified === true &&
            response.registeration_completed === true
          ) {
            router.push({
              pathname: "/",
              // params: {
              //   userId: response.data?.userId,
              //   full_name: values.full_name,
              //   age: values.age,
              //   email: values.email,
              //   contact: values.contact,
              // },
            });
          } else if (
            response.otp_verified === true &&
            response.registeration_completed !== true
          ) {
            router.push({
              pathname: "/register/age-selector",
              params: {
                full_name: values.full_name,
                email: values.email,
                contact: values.contact,
              },
            });
          } else {
            router.push({
              pathname: "/register/second-step",
              params: {
                full_name: values.full_name,
                email: values.email,
                contact: values.contact,
              },
            });
          }
        }, 1000);
      } else {
        if (response?.errors) {
          Object.keys(response.errors).forEach((field) => {
            setFieldError(field, response.errors[field]);
          });
        }

        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail,
        });

        setApiError(
          response?.detail || "Registration failed. Please try again."
        );
      }
    } catch (error) {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: insets.bottom }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.headerContainer}>
          <MobileLogo />
        </View>

        <Formik
          initialValues={{
            full_name: "",
            contact: "",
            email: "",
            password: "",
            confirmPassword: "",
            location: "",
            pincode: "",
            referral_id: "",
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({
            handleSubmit,
            isValid,
            dirty,
            isSubmitting,
            values,
            setFieldValue,
          }) => (
            <View style={styles.formContainer}>
              {/* <CardTitle title={"Personal Information"} /> */}

              {/* {apiError && (
                <View style={styles.apiErrorContainer}>
                  <Feather name="alert-circle" size={16} color={Color.rgError} />
                  <Text style={styles.apiErrorText}>{apiError}</Text>
                </View>
              )} */}

              <InputRow>
                <View style={styles.halfInput}>
                  <Field
                    component={CustomInput}
                    name="full_name"
                    placeholder="Full Name"
                    autoCapitalize="words"
                    innerRef={firstInputRef}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Field
                    component={CustomInput}
                    name="contact"
                    placeholder="Mobile"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </InputRow>

              <Field
                component={CustomInput}
                name="email"
                placeholder="Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Field
                component={PasswordInput}
                name="password"
                placeholder="Password"
              />
              <Field
                component={PasswordInput}
                name="confirmPassword"
                placeholder="Confirm Password"
              />

              <InputRow>
                <View style={styles.halfInput}>
                  <Field
                    component={CityAutocomplete}
                    name="location"
                    placeholder="City"
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Field
                    component={CustomInput}
                    name="pincode"
                    placeholder="Pincode"
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>
              </InputRow>

              <View style={styles.referralRow}>
                <View style={styles.referralInput}>
                  <Field
                    component={CustomInput}
                    name="referral_id"
                    placeholder="Referral ID (Optional)"
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
                style={styles.disclaimerContainer}
                activeOpacity={0.7}
                onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
              >
                <View
                  style={[
                    styles.checkbox,
                    disclaimerAccepted && styles.checkboxChecked,
                  ]}
                >
                  {disclaimerAccepted && (
                    <Feather name="check" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.disclaimerText}>
                  I understand that this app is not a Healthcare or Medical
                  service provider. For Medical advice, diagnosis, or treatment,
                  please consult a Healthcare professional.
                </Text>
              </TouchableOpacity>

              <ContinueButton
                isValid={isValid && !isLoading && disclaimerAccepted}
                handleSubmit={handleSubmit}
                text={isLoading ? "Registering..." : "Continue"}
              />

              {isLoading && (
                <ActivityIndicator
                  size="small"
                  color={Color.rgPrimary}
                  style={styles.loader}
                />
              )}
            </View>
          )}
        </Formik>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/")}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
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
              <ConfettiPiece key={i} delay={delay} side={side} color={color} />
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 50,
    paddingBottom: 150,
  },
  headerContainer: {
    alignItems: "center",
  },
  title: {
    color: Color.rgTextSecondary,
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    color: Color.rgDisable,
    fontSize: 16,
  },
  formContainer: {
    // backgroundColor: Color.rgBgForm,
    borderRadius: 15,
    // padding: 20,
    width: "100%",
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  halfInput: {
    flex: 0.48,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "transparent",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputError: {
    borderColor: "red",
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#000000",
    height: 45,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  nextButton: {
    flexDirection: "row",
    backgroundColor: "#FF5757",
    // padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: Color.rgDisable,
  },
  nextButtonText: {
    color: Color.rgTextSecondary,
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 10,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  loginText: {
    color: "#767676",
  },
  loginLink: {
    color: Color.rgPrimary,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  apiErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff000055" || "#FFEBEE",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  apiErrorText: {
    color: Color.rgError || "red",
    fontSize: 14,
    marginLeft: 8,
  },
  loader: {
    marginTop: 10,
  },
  suggestionsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    maxHeight: 250,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  suggestionText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#333333",
  },
  referralRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  referralInput: {
    flex: 1,
    marginRight: 10,
  },
  applyButton: {
    backgroundColor: Color.rgPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    height: 45,
    marginTop: 0,
  },
  applyButtonDisabled: {
    backgroundColor: Color.rgDisable || "#CCCCCC",
    opacity: 0.6,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
  disclaimerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 15,
    paddingHorizontal: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#CCCCCC",
    marginRight: 10,
    marginTop: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: Color.rgPrimary,
    borderColor: Color.rgPrimary,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: "#666666",
    lineHeight: 18,
  },
});

export default FirstStepRegistration;
