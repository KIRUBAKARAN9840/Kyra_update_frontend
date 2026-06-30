import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  BackHandler,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
  useFocusEffect,
} from "expo-router";
import { Color, linearGradientColors } from "../../GlobalStyles";
import { LinearGradient } from "expo-linear-gradient";
import MobileLogo from "../../components/ui/Register/MobileLogo";
import ContinueButton from "../../components/ui/Register/ContinueButton";
import { calculateScientificBMI } from "../../components/ui/Register/calculateScientificBMI";
import {
  registerUserCompleteRegistration,
  lifestyleAPI,
} from "../../services/clientApi";
import { capitalizer } from "../../utils/basicUtilFunctions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import ToastNotification from "../../components/ui/SuccessPopup";
import { registerForPushNotificationsAsync } from "../../components/usePushNotifications";
import { showToast } from "../../utils/Toaster";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SixthStepRegistration = ({ route }) => {
  const params = useLocalSearchParams();
  // console.log("Params at Sixth Step:", params);
  const {
    fullName,
    gender,
    height,
    heightUnit,
    weight,
    age,
    unit,
    contact,
    targetWeight,
    currentBodyShapeId,
    targetBodyShapeId,
    lifestyle,
  } = params;

  const [selectedLifestyle, setSelectedLifestyle] = useState(lifestyle || "");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState({
    message: "",
    type: "",
  });
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Handle hardware back button - go to home
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.push({
          pathname: "/client/home",
          params: { tab: params.tab || "My Progress" },
        });
        return true; // Prevent default back behavior
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => backHandler.remove();
    }, [params, router]),
  );

  const bmiData = calculateScientificBMI({
    weight,
    height,
    heightUnit,
    age,
    gender,
  });

  const lifestyleOptions = [
    {
      label: "Sedentary",
      value: "sedentary",
      title: "Sedentary",
      subtitle:
        "Minimal physical activity, mostly sitting during the day, little to no exercise",
      imagePath:
        gender?.toLocaleLowerCase() === "male"
          ? require("../../assets/images/lifestyle/sedantary_male.webp")
          : require("../../assets/images/lifestyle/sedantary_female.webp"),
    },
    {
      label: "Lightly Active",
      value: "lightly_active",
      title: "Lightly Active",
      subtitle:
        "Some light daily activity, occasional walking or leisurely exercises",
      imagePath:
        gender?.toLocaleLowerCase() === "male"
          ? require("../../assets/images/lifestyle/light_male.webp")
          : require("../../assets/images/lifestyle/light_female.webp"),
    },
    {
      label: "Moderately Active",
      value: "moderately_active",
      title: "Moderately Active",
      subtitle:
        "Moderate daily activity, exercise walking or light moderate exercse a few times each week",
      imagePath:
        gender?.toLocaleLowerCase() === "male"
          ? require("../../assets/images/lifestyle/moderate_male.webp")
          : require("../../assets/images/lifestyle/moderate_female.webp"),
    },
    {
      label: "Very Active",
      value: "very_active",
      title: "Very Active",
      subtitle:
        "High daily activity, includes intense workouts or physical labor most days of the week",
      imagePath:
        gender?.toLocaleLowerCase() === "male"
          ? require("../../assets/images/personal_template.webp")
          : require("../../assets/images/personal_template_female.webp"),
    },
    {
      label: "Fitness Oriented",
      value: "super_active",
      title: "Fitness Oriented",
      subtitle:
        "Focused on health, strength, and consistent exercise routine with performance-focused fitness",
      imagePath:
        gender?.toLocaleLowerCase() === "male"
          ? require("../../assets/images/lifestyle/fitness_male.webp")
          : require("../../assets/images/lifestyle/fitness_female.webp"),
    },
  ];

  const handleContinue = async () => {
    // Validate mandatory selections
    if (!selectedLifestyle) {
      Alert.alert(
        "Incomplete Selection",
        "Please select a lifestyle before continuing.",
        [{ text: "OK" }],
      );
      return;
    }

    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Client ID not found",
        });
        return;
      }

      const payload = {
        client_id: clientId,
        lifestyle: selectedLifestyle,
      };

      const response = await lifestyleAPI(payload);

      if (response?.status === 200) {
        setSuccessMsg({
          message:
            "Profile Completed! Let's start your fitness journey with Fymble!",
          type: "success",
        });
        setShowSuccess(true);
        setTimeout(() => {
          router.push({
            pathname: "/client/home",
            params: { tab: "My Progress" },
          });
        }, 2000);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to save lifestyle",
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
    <LinearGradient
      style={{ flex: 1, width: "100%", height: "100%" }}
      colors={["#FFFFFF", "#FFFFFF", "#FFFFFF"]}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.push({
              pathname: "/client/home",
              params: { tab: params.tab || "My Progress" },
            })
          }
        >
          <Feather name="arrow-left" size={24} color="#FF5757" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Select Your <Text style={styles.highlightText}>Lifestyle</Text>
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ToastNotification
        visible={showSuccess}
        message={successMsg?.message}
        onClose={() => setShowSuccess(false)}
        type={successMsg?.type}
      />
      <ScrollView
        contentContainerStyle={[styles.scrollContainer]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
          <View style={styles.cardsContainer}>
            {lifestyleOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.lifestyleCard,
                  selectedLifestyle === option.value && styles.selectedCard,
                ]}
                onPress={() => setSelectedLifestyle(option.value)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.contentContainer,
                    selectedLifestyle === option.value &&
                      styles.selectedContentContainer,
                  ]}
                >
                  <View style={styles.textContainer}>
                    <Text style={styles.cardTitle}>{option.title}</Text>
                    <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
                  </View>
                </View>

                {/* Image positioned outside like WorkoutCard */}
                <View style={styles.imageContainer}>
                  <Image
                    source={
                      option?.imagePath ||
                      require("../../assets/images/personal_template.webp")
                    }
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <ContinueButton
            isValid={selectedLifestyle}
            handleSubmit={handleContinue}
            text="Complete Setup"
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default SixthStepRegistration;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginHorizontal: 10,
  },
  highlightText: {
    color: "#FF5757",
  },
  headerSpacer: {
    width: 34,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    justifyContent: "flex-start",
  },
  cardsContainer: {
    justifyContent: "center",
    paddingVertical: 0,
    marginTop: 30,
  },
  lifestyleCard: {
    width: "100%",
    height: 80,
    borderRadius: 12,
    overflow: "visible",
    marginVertical: 18,
    position: "relative",
    marginBottom: 15, // Add space for overflowing image like WorkoutCard
  },
  selectedCard: {
    // Selection styling will be applied to contentContainer
  },
  selectedContentContainer: {
    borderColor: "#FF5757",
    backgroundColor: "#FFF5F5",
  },
  contentContainer: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 16,
    paddingVertical: 0,
    height: "100%",
    borderWidth: 2,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "flex-start",
    // iOS Shadow properties
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android Shadow
    elevation: 2,
  },
  imageContainer: {
    position: "absolute",
    right: 0,
    bottom: 0,
    zIndex: 10, // Same as WorkoutCard
  },
  cardImage: {
    width: 100,
    height: 90, // Same size as WorkoutCard default
  },
  textContainer: {
    maxWidth: "70%", // Same as WorkoutCard
    alignItems: "flex-start",
    justifyContent: "center",
    height: "100%",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#686868",
    marginBottom: 6,
    lineHeight: 16,
  },
  cardSubtitle: {
    fontSize: 10,
    color: "rgba(0, 0, 0, 0.5)",
    lineHeight: 13,
    flexWrap: "wrap",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  loginText: {
    color: "#888",
  },
  loginLink: {
    color: Color.rgPrimary,
    fontWeight: "bold",
  },
});
