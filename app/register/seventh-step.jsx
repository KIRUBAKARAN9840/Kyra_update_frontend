import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  BackHandler,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Color } from "../../GlobalStyles";
import { LinearGradient } from "expo-linear-gradient";
import MobileLogo from "../../components/ui/Register/MobileLogo";
import ContinueButton from "../../components/ui/Register/ContinueButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { goalAPI } from "../../services/clientApi";
import { showToast } from "../../utils/Toaster";

const SeventhStepRegistration = ({ route }) => {
  const params = useLocalSearchParams();
  const { fullName, gender } = params;
  const insets = useSafeAreaInsets();
  const [selectedGoal, setSelectedGoal] = useState(params.goals || "");

  const router = useRouter();

  // Initialize goal from params if coming back from later steps
  useEffect(() => {
    if (params.goals) {
      setSelectedGoal(params.goals);
    }
  }, [params.goals]);

  // Handle hardware back button - go back to home
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
        onBackPress
      );

      return () => backHandler.remove();
    }, [params, router])
  );

  const goalOptions = [
    {
      label: "Weight Gain",
      value: "weight_gain",
      title: "Weight Gain",
      subtitle:
        "Build muscle mass and increase overall body weight through structured nutrition and training",
      icon: "📈",
      color: "#4CAF50",
    },
    {
      label: "Weight Loss",
      value: "weight_loss",
      title: "Weight Loss",
      subtitle:
        "Reduce body fat and achieve a leaner physique through caloric deficit and targeted workouts",
      icon: "📉",
      color: "#FF9800",
    },
    {
      label: "Body Recomposition",
      value: "maintain",
      title: "Body Recomposition",
      subtitle:
        "Simultaneously build muscle and lose fat to achieve a toned and defined body composition",
      icon: "⚖️",
      color: "#2196F3",
    },
  ];

  const handleContinue = async () => {
    // Validate mandatory selections
    if (!selectedGoal) {
      Alert.alert(
        "Incomplete Selection",
        "Please select a goal before continuing.",
        [{ text: "OK" }]
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
        goal: selectedGoal,
      };

      const response = await goalAPI(payload);

      if (response?.status === 200) {
        router.push({
          pathname: "/register/fourth-step",
          params: {
            ...params,
            goals: selectedGoal,
          },
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to save goal",
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
          Select Your <Text style={styles.highlightText}>Goal</Text>
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
          <View style={styles.cardsContainer}>
            {goalOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.goalCard,
                  selectedGoal === option.value && styles.selectedCard,
                ]}
                onPress={() => setSelectedGoal(option.value)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.contentContainer,
                    selectedGoal === option.value &&
                      styles.selectedContentContainer,
                  ]}
                >
                  <View style={styles.iconContainer}>
                    <View
                      style={[
                        styles.iconWrapper,
                        { backgroundColor: option.color },
                      ]}
                    >
                      <Text style={styles.iconText}>{option.icon}</Text>
                    </View>
                  </View>

                  <View style={styles.textContainer}>
                    <Text style={styles.cardTitle}>{option.title}</Text>
                    <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
                  </View>

                  {selectedGoal === option.value && (
                    <View style={styles.checkmarkContainer}>
                      <View style={styles.checkmark}>
                        <Feather name="check" size={16} color="white" />
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <ContinueButton
            isValid={selectedGoal}
            handleSubmit={handleContinue}
            text="Continue"
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default SeventhStepRegistration;

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
    justifyContent: "center",
  },
  cardsContainer: {
    justifyContent: "center",
    paddingVertical: 20,
  },
  goalCard: {
    width: "100%",
    marginVertical: 20,
    borderRadius: 12,
    overflow: "visible",
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
    padding: 20,
    borderWidth: 2,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 90,
    // iOS Shadow properties
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android Shadow
    elevation: 2,
  },
  iconContainer: {
    marginRight: 15,
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "rgba(0, 0, 0, 0.6)",
    lineHeight: 16,
  },
  checkmarkContainer: {
    marginLeft: 10,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF5757",
    justifyContent: "center",
    alignItems: "center",
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
