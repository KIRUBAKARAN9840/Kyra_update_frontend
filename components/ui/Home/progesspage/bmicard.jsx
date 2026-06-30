import MaskedView from "@react-native-masked-view/masked-view";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useHealthConnect from "../../../../hooks/useHealthConnect";
import useAppleHealth from "../../../../hooks/useAppleHealth";
import {
  isGymPremium,
  isPureFreemium,
  isPurePremium,
} from "../../../../config/access";
import PremiumBadge from "../../Payment/premiumbadge";
import { useRouter } from "expo-router";
import { giveStepsConsentAPI } from "../../../../services/clientApi";

const HomeBMICard = ({
  bmi = 18.0,
  steps: propSteps = 2001,
  goal: propGoal,
  distance: propDistance = 1.5,
  plan,
}) => {
  const router = useRouter();

  // Android - Health Connect
  const {
    isAvailable: isAndroidAvailable,
    hasPermission: hasAndroidPermission,
    stepsData: androidStepsData,
    isLoading: isAndroidLoading,
    error: androidError,
    needsDataSource: androidNeedsDataSource,
    setupHealthConnect,
    checkPermission,
    initHC,
    openGoogleFit,
    fetchTodaySteps,
  } = useHealthConnect();

  // iOS - Apple Health
  // COMMENTED OUT: Not fully implemented yet
  // const {
  //   isAvailable: isIosAvailable,
  //   hasPermission: hasIosPermission,
  //   stepsToday: iosStepsData,
  //   isLoading: isIosLoading,
  //   error: iosError,
  //   setupAppleHealth,
  // } = useAppleHealth();

  const [showSetup, setShowSetup] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);
  const [showDataSourceSetup, setShowDataSourceSetup] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [userConsent, setUserConsent] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(10000);

  // Load daily goal from AsyncStorage
  useEffect(() => {
    const loadDailyGoal = async () => {
      try {
        const savedGoal = await AsyncStorage.getItem("dailyStepGoal");
        if (savedGoal && !isNaN(parseInt(savedGoal))) {
          setDailyGoal(parseInt(savedGoal));
        } else {
          setDailyGoal(10000); // Fallback to default
        }
      } catch (error) {
        console.error("Error loading daily goal:", error);
        setDailyGoal(10000); // Fallback to default on error
      }
    };
    loadDailyGoal();
  }, []);

  // Set goal with fallback
  const goal = dailyGoal || propGoal || 10000;

  // Use platform-specific steps data if available and permission granted with fallback
  const steps =
    Platform.OS === "android" && hasAndroidPermission
      ? androidStepsData || 0
      : propSteps || 0;
  // : Platform.OS === "ios" && hasIosPermission
  // ? iosStepsData

  // Calculate distance from steps (average: 1 step = 0.0008 km) with fallback
  const distance =
    Platform.OS === "android" && hasAndroidPermission
      ? ((steps || 0) * 0.0008).toFixed(1)
      : propDistance || 0;
  // (Platform.OS === "android" && hasAndroidPermission) ||
  // (Platform.OS === "ios" && hasIosPermission)

  const isAvailable = Platform.OS === "android" ? isAndroidAvailable : false;
  const hasPermission =
    Platform.OS === "android" ? hasAndroidPermission : false;
  const isLoading = Platform.OS === "android" ? isAndroidLoading : false;
  // const isAvailable =
  //   Platform.OS === "android" ? isAndroidAvailable : isIosAvailable;
  // const hasPermission =
  //   Platform.OS === "android" ? hasAndroidPermission : hasIosPermission;
  // const isLoading = Platform.OS === "android" ? isAndroidLoading : isIosLoading;

  useEffect(() => {
    if (Platform.OS === "android") {
      // Show setup if HC is not available OR if available but no permission
      const needsSetup = !isAndroidAvailable || !hasAndroidPermission;
      setShowSetup(needsSetup);

      // Show data source setup if HC is available, has permission, but no data
      if (
        isAndroidAvailable &&
        hasAndroidPermission &&
        androidNeedsDataSource
      ) {
        setShowDataSourceSetup(true);
        setShowSetup(false);
      } else {
        setShowDataSourceSetup(false);
      }

      if (needsSetup) {
        setShowRefresh(false);
      }
    } else if (Platform.OS === "ios") {
      // iOS: Show setup for "Coming Soon"
      setShowSetup(true);
      setShowRefresh(false);
      setShowDataSourceSetup(false);
    }
    // } else if (Platform.OS === "ios") {
    //   setShowSetup(!isIosAvailable || !hasIosPermission);
    //   setShowRefresh(false);
    //   setShowDataSourceSetup(false);
    // }
  }, [
    hasAndroidPermission,
    isAndroidAvailable,
    androidNeedsDataSource,
    // hasIosPermission,
    // isIosAvailable,
  ]);

  const handleSetup = async () => {
    if (Platform.OS === "android") {
      // Always show the modal first with disclaimers
      setShowSetupModal(true);
    } else if (Platform.OS === "ios") {
      // iOS: Coming Soon - do nothing
      return;
      // const granted = await setupAppleHealth();
      // if (granted) {
      //   setShowSetup(false);
      //   setShowRefresh(false);
      // }
    }
  };

  const handleStartSetup = async () => {
    // Check if user has given consent
    if (!userConsent) {
      return; // Don't proceed without consent
    }

    try {
      // Get client ID from AsyncStorage
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        console.error("Client ID not found");
        Alert.alert("Error", "Unable to save consent. Please try again.");
        return;
      }

      // Call API to save steps consent
      const payload = {
        client_id: clientId,
      };

      const response = await giveStepsConsentAPI(payload);

      if (response?.status !== 200) {
        Alert.alert("Error", "Failed to save consent. Please try again.");
        return;
      }

      // Close modal and start the setup process
      setShowSetupModal(false);
      setUserConsent(false); // Reset consent for next time

      // Check if HC is available
      if (!isAndroidAvailable) {
        // HC not installed - open Play Store
        const result = await setupHealthConnect();
        if (result === "install") {
          setShowRefresh(true);
        }
      } else {
        // HC available - request permissions
        const result = await setupHealthConnect();
        if (result === true) {
          // Permission granted directly
          setShowSetup(false);
          setShowRefresh(false);
        } else {
          // Permission denied - show refresh button
          setShowRefresh(true);
        }
      }
    } catch (error) {
      console.error("Error saving steps consent:", error);
      Alert.alert("Error", "Failed to save consent. Please try again.");
    }
  };

  const handleRefresh = async () => {
    if (Platform.OS === "android") {
      // First re-check if HC is now available
      await initHC();
      // Then check permissions
      const granted = await checkPermission();
      if (granted) {
        setShowSetup(false);
        setShowRefresh(false);
      }
    }
  };

  const handleGoogleFitSetup = async () => {
    await openGoogleFit();
    setShowRefresh(true);
  };

  const handleDataSourceRefresh = async () => {
    await fetchTodaySteps();
    setShowRefresh(false);
  };
  const createCircularArc = (percentage, radius = 45) => {
    const startAngle = -90;
    const endAngle = startAngle + percentage * 360;

    const centerX = 50;
    const centerY = 50;
    const startX = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
    const startY = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
    const endX = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
    const endY = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

    const largeArcFlag = percentage > 0.5 ? 1 : 0;

    if (percentage === 0) return "";
    if (percentage >= 1) {
      // For 100%, create a full circle using two arcs
      const midX = centerX + radius;
      const midY = centerY;
      return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${midX} ${midY} A ${radius} ${radius} 0 0 1 ${startX} ${startY}`;
    }

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  const stepPercentage = Math.min((steps || 0) / (goal || 10000), 1);

  const handleCardPress = () => {
    if (isPureFreemium(plan)) {
      if (Platform.OS === "android") {
        router.push("/client/subscription");
      } else {
        return;
      }
    } else if (
      Platform.OS === "android" &&
      hasPermission &&
      !showSetup &&
      !showDataSourceSetup
    ) {
      // Navigate to step details page only on Android when steps are available
      router.push("/client/stepDetails");
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { height: isGymPremium(plan) ? 130 : 175 }]}
      onPress={handleCardPress}
      disabled={
        !isPureFreemium(plan) &&
        (Platform.OS !== "android" ||
          !hasPermission ||
          showSetup ||
          showDataSourceSetup)
      }
    >
      <LinearGradient
        colors={["#FFFFFF", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardHeader}
      >
        <MaskedView maskElement={<Text style={styles.cardTitle}>Steps</Text>}>
          <LinearGradient
            colors={["#1A1A1A", "#1A1A1A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 20 }}
          >
            <Text style={[styles.cardTitle, { opacity: 0 }]}>Steps</Text>
          </LinearGradient>
        </MaskedView>
      </LinearGradient>

      <View style={styles.cardContent}>
        {isPureFreemium(plan) ? (
          <View style={styles.liveContainer}>
            <View style={styles.circleContainer}>
              <Svg width="70" height="70" viewBox="0 0 100 100">
                {/* Background circle */}
                <Circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#E5E5E5"
                  strokeWidth="8"
                  fill="none"
                />
              </Svg>

              {/* Steps icon only */}
              <View style={styles.circleContent}>
                <Image
                  source={require("../../../../assets/images/steps.png")}
                  style={styles.stepsIcon}
                />
              </View>
            </View>
            <View style={styles.premiumBadgeContainer}>
              <PremiumBadge size={12} get={true} />
              <Text style={styles.unlockText}>& unlock this feature</Text>
            </View>
          </View>
        ) : showDataSourceSetup ? (
          <View
            style={[
              styles.setupSection,
              isGymPremium(plan) && { minHeight: 80 },
            ]}
          >
            {!showRefresh ? (
              <>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.setupButton}
                    onPress={handleGoogleFitSetup}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FF5757" />
                    ) : (
                      <Text style={styles.setupButtonText}>
                        Install/Sync Google Fit
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.instructionText}>
                  Install & sync Google Fit with Health Connect to track steps
                </Text>
              </>
            ) : (
              <>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleDataSourceRefresh}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FF5757" />
                    ) : (
                      <Text style={styles.setupButtonText}>Refresh</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {!isGymPremium(plan) && (
                  <Text style={styles.trackingText}>
                    Keep Track of Daily Step count
                  </Text>
                )}
              </>
            )}
          </View>
        ) : showSetup ? (
          <View
            style={[
              styles.setupSection,
              isGymPremium(plan) && { minHeight: 80 },
            ]}
          >
            {!showRefresh ? (
              <>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.setupButton}
                    onPress={handleSetup}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FF5757" />
                    ) : (
                      <>
                        <Text style={styles.setupButtonText}>
                          {Platform.OS === "ios"
                            ? "Coming Soon"
                            : Platform.OS === "android" && !isAndroidAvailable
                              ? "Install"
                              : "Set Up"}
                        </Text>
                        {Platform.OS === "android" && (
                          <Text style={styles.setupSubText}>
                            Health Connect
                          </Text>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                {!isGymPremium(plan) && (
                  <Text style={styles.trackingText}>
                    Keep Track of Daily Step count
                  </Text>
                )}
              </>
            ) : Platform.OS === "android" ? (
              <>
                <Text style={styles.instructionText}>
                  {!isAndroidAvailable
                    ? "Install Health Connect from Play Store, then tap Refresh"
                    : "Grant permission in Health Connect, then tap Refresh"}
                </Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleRefresh}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FF5757" />
                    ) : (
                      <Text style={styles.setupButtonText}>Refresh</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        ) : isPurePremium(plan) ? (
          <>
            <View style={styles.contentWrapper}>
              <View style={styles.progressSection}>
                <View style={styles.circleContainer}>
                  <Svg width="70" height="70" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <Circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="#E5E5E5"
                      strokeWidth="8"
                      fill="none"
                    />

                    {/* Progress arc */}
                    <Path
                      d={createCircularArc(
                        stepPercentage >= 1 ? 0.999999 : stepPercentage,
                        45,
                      )}
                      stroke="#F93C7D"
                      strokeLinecap="round"
                      strokeWidth="8"
                      fill="none"
                    />
                  </Svg>

                  {/* Steps icon and count */}
                  <View style={styles.circleContent}>
                    <Image
                      source={require("../../../../assets/images/steps.png")}
                      style={styles.stepsIcon}
                    />
                    <Text style={styles.stepsCount}>{steps}</Text>
                  </View>
                </View>
              </View>

              {/* Info Panel */}
              <View style={styles.infoPanel}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Goal:</Text>
                  <Text style={styles.infoValue}>{goal}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Dist:</Text>
                  <Text style={styles.infoValue}>
                    {distance} <Text style={styles.unitText}>km</Text>
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>BMI:</Text>
                  <Text style={styles.infoValue}>{bmi}</Text>
                </View>
              </View>
            </View>
            {isGymPremium(plan) ? null : (
              <View style={styles.trackingTextContainer}>
                <Text style={styles.trackingText}>
                  Keep Track of Daily Step count
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.trackingTextContainer}>
            <Text style={styles.trackingText}>
              Keep Track of Daily Step count
            </Text>
          </View>
        )}
      </View>

      {/* Setup Instructions Modal */}
      <Modal
        visible={showSetupModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSetupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Setup Health Connect</Text>
              <Text style={styles.modalSubtitle}>
                Follow these steps to track your daily steps
              </Text>

              {/* Health Disclaimer */}
              <View style={styles.disclaimerContainer}>
                <Text style={styles.disclaimerText}>
                  ⓘ This app is not a medical device and does not diagnose,
                  treat, cure, or prevent any medical condition. Please consult
                  a healthcare professional for medical advice, diagnosis, or
                  treatment.
                </Text>
              </View>

              {/* Step 1 */}
              <View style={styles.stepContainer}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Install Health Connect</Text>
                  <Text style={styles.stepDescription}>
                    Download Health Connect from Google Play Store
                  </Text>
                </View>
              </View>

              {/* Step 2 */}
              <View style={styles.stepContainer}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Allow Access</Text>
                  <Text style={styles.stepDescription}>
                    Grant permission to read your step data
                  </Text>
                </View>
              </View>

              {/* Step 3 */}
              <View style={styles.stepContainer}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>
                    Install Google Fit & Sync
                  </Text>
                  <Text style={styles.stepDescription}>
                    Install Google Fit and sync with Health Connect to track
                    steps
                  </Text>
                </View>
              </View>

              {/* Privacy Notice */}
              <View style={styles.privacyNotice}>
                <Text style={styles.privacyText}>
                  Your step data is only used to display your steps count within
                  the app. We do not sell or share your health data with third
                  parties.
                </Text>
              </View>

              {/* Consent Checkbox */}
              <TouchableOpacity
                style={styles.consentContainer}
                onPress={() => setUserConsent(!userConsent)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    userConsent && styles.checkboxChecked,
                  ]}
                >
                  {userConsent && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.consentText}>
                  I understand and agree to allow this app to access my step
                  data from Health Connect for fitness tracking purposes only.
                </Text>
              </TouchableOpacity>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.startButton,
                    !userConsent && styles.startButtonDisabled,
                  ]}
                  onPress={handleStartSetup}
                  disabled={!userConsent}
                >
                  <Text
                    style={[
                      styles.startButtonText,
                      !userConsent && styles.startButtonTextDisabled,
                    ]}
                  >
                    Start Setup
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowSetupModal(false);
                    setUserConsent(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: Platform.OS === "ios" ? "visible" : "hidden",
    position: "relative",
    height: 130,
  },
  cardHeader: {
    padding: 7,
    alignItems: "center",
    borderBottomWidth: Platform.OS === "ios" ? 1 : 0,
    borderBottomColor: "#ddd",
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "normal",
  },
  cardContent: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  comingSoonContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  comingSoonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  premiumContainer: {
    alignItems: "center",
    marginTop: 5,
  },
  liveContainer: {
    alignItems: "center",
  },
  premiumBadgeContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },
  unlockText: {
    fontSize: 12,
    color: "#333",
    marginTop: 5,
  },
  contentWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  progressSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  circleContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  circleContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stepsIcon: {
    width: 20,
    height: 23,
    marginBottom: 2,
    tintColor: "#F93C7D",
  },
  stepsCount: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  infoPanel: {
    flex: 1,
    paddingLeft: 6,
    justifyContent: "center",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    backgroundColor: "rgba(245, 245, 245, 0.8)",
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 8,
    minWidth: 70,
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
    minWidth: 25,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 5,
  },
  unitText: {
    fontSize: 9,
    color: "#999",
    fontWeight: "normal",
  },
  trackingTextContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  trackingText: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
    marginTop: 6,
  },
  setupSection: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
  },
  setupButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    borderColor: "#FF5757",
    borderWidth: 1,
  },
  setupButtonText: {
    color: "#FF5757",
    fontSize: 11,
    fontWeight: "bold",
  },
  setupSubText: {
    color: "#FF5757",
    fontSize: 9,
    fontWeight: "500",
    marginTop: 2,
  },
  instructionText: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  refreshButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    borderColor: "#FF5757",
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  disclaimerContainer: {
    backgroundColor: "#FFF9E6",
    borderLeftWidth: 4,
    borderLeftColor: "#FFB800",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 11,
    color: "#664D00",
    lineHeight: 16,
    textAlign: "left",
  },
  privacyNotice: {
    backgroundColor: "#F0F9FF",
    borderLeftWidth: 4,
    borderLeftColor: "#0EA5E9",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 11,
    color: "#0C4A6E",
    lineHeight: 16,
    textAlign: "left",
  },
  consentContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#F93C7D",
    borderColor: "#F93C7D",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    color: "#333",
    lineHeight: 18,
  },
  startButtonDisabled: {
    backgroundColor: "#E5E5E5",
    shadowOpacity: 0,
  },
  startButtonTextDisabled: {
    color: "#999",
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F93C7D",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  modalButtons: {
    marginTop: 10,
    gap: 12,
  },
  startButton: {
    backgroundColor: "#F93C7D",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#F93C7D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HomeBMICard;
