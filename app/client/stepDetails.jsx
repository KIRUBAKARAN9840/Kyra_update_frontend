import React, { useCallback, useState, useEffect } from "react";
import {
  BackHandler,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, Path, Line, Text as SvgText } from "react-native-svg";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useHealthConnect from "../../hooks/useHealthConnect";
import useAppleHealth from "../../hooks/useAppleHealth";
import { giveStepsConsentAPI } from "../../services/clientApi";

const { width } = Dimensions.get("window");

const StepDetails = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [dailyGoal, setDailyGoal] = useState(10000);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoal, setTempGoal] = useState("10000");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState([]);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [userConsent, setUserConsent] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);
  const [iosConsentShown, setIosConsentShown] = useState(false);

  // Android: Health Connect
  const androidHC = useHealthConnect();

  // iOS: Apple Health
  const appleHealth = useAppleHealth();

  // Unified values based on platform
  const stepsData =
    Platform.OS === "ios" ? appleHealth.stepsToday : androidHC.stepsData;
  const hasPermission =
    Platform.OS === "ios" ? appleHealth.hasPermission : androidHC.hasPermission;
  const weeklyStepsData = androidHC.weeklyStepsData;
  const hourlyStepsData = androidHC.hourlyStepsData;
  const isLoading =
    Platform.OS === "ios" ? appleHealth.isLoading : androidHC.isLoading;
  const isCheckingPermission =
    Platform.OS === "ios"
      ? appleHealth.isCheckingPermission
      : androidHC.isCheckingPermission;

  // Android-specific
  const isAndroidAvailable = androidHC.isAvailable;
  const needsDataSource = androidHC.needsDataSource;
  const setupHealthConnect = androidHC.setupHealthConnect;
  const checkPermission = androidHC.checkPermission;
  const initHC = androidHC.initHC;
  const openGoogleFit = androidHC.openGoogleFit;
  const fetchTodaySteps = androidHC.fetchTodaySteps;

  // iOS-specific
  const setupAppleHealth = appleHealth.setupAppleHealth;

  // Determine setup state
  const needsSetup =
    Platform.OS === "android" && (!isAndroidAvailable || !hasPermission);
  const showDataSourceSetup =
    Platform.OS === "android" &&
    isAndroidAvailable &&
    hasPermission &&
    needsDataSource;
  const isReady =
    Platform.OS === "android" && hasPermission && !needsDataSource;
  // Show setup screen whenever permission is not granted on iOS.
  const iosNeedsSetup = Platform.OS === "ios" && !hasPermission;

  const handleSetup = () => {
    setShowSetupModal(true);
  };

  const handleStartSetup = async () => {
    if (!userConsent) return;
    try {
      if (Platform.OS === "ios") {
        // On iOS: fire-and-forget the consent API so we don't block the native
        // HealthKit permission sheet on a network round-trip.
        setShowSetupModal(false);
        setUserConsent(false);
        const clientId = await AsyncStorage.getItem("client_id");
        if (clientId)
          giveStepsConsentAPI({ client_id: clientId }).catch(() => {});
        // Wait for modal fade-out before triggering HealthKit dialog
        await new Promise((resolve) => setTimeout(resolve, 400));
        await setupAppleHealth();
        return;
      }

      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        Alert.alert("Error", "Unable to save consent. Please try again.");
        return;
      }
      const response = await giveStepsConsentAPI({ client_id: clientId });
      if (!response) {
        Alert.alert("Error", "Failed to save consent. Please try again.");
        return;
      }
      if (!isAndroidAvailable) {
        setShowSetupModal(false);
        setUserConsent(false);
        const result = await setupHealthConnect();
        if (result === "install") setShowRefresh(true);
      } else {
        setShowSetupModal(false);
        setUserConsent(false);
        const result = await setupHealthConnect();
        if (result === true) {
          setShowRefresh(false);
        } else {
          setShowRefresh(true);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save consent. Please try again.");
    }
  };

  const handleRefresh = async () => {
    await initHC();
    const granted = await checkPermission();
    if (granted) setShowRefresh(false);
  };

  const handleGoogleFitSetup = async () => {
    await openGoogleFit();
    setShowRefresh(true);
  };

  const handleDataSourceRefresh = async () => {
    await fetchTodaySteps();
    setShowRefresh(false);
  };

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.replace("/client/home");
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );
      return () => backHandler.remove();
    }, []),
  );

  useEffect(() => {
    loadDailyGoal();
    generateWeekDates();
    if (Platform.OS === "ios") {
      AsyncStorage.getItem("ios_consent_shown").then((val) => {
        if (val === "true") setIosConsentShown(true);
      });
    }
  }, []);

  const loadDailyGoal = async () => {
    try {
      const savedGoal = await AsyncStorage.getItem("dailyStepGoal");
      if (savedGoal && !isNaN(parseInt(savedGoal))) {
        const goalValue = parseInt(savedGoal);
        setDailyGoal(goalValue);
        setTempGoal(savedGoal);
      } else {
        setDailyGoal(10000); // Fallback to default
        setTempGoal("10000");
      }
    } catch (error) {
      console.error("Error loading daily goal:", error);
      setDailyGoal(10000); // Fallback to default on error
      setTempGoal("10000");
    }
  };

  const saveDailyGoal = async () => {
    try {
      const newGoal = parseInt(tempGoal);
      if (newGoal && newGoal > 0 && !isNaN(newGoal)) {
        await AsyncStorage.setItem("dailyStepGoal", tempGoal);
        setDailyGoal(newGoal);
        setShowGoalModal(false);
      } else {
        // Invalid input - keep existing goal
        setShowGoalModal(false);
      }
    } catch (error) {
      console.error("Error saving daily goal:", error);
      setShowGoalModal(false);
    }
  };

  const generateWeekDates = () => {
    const today = new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date);
    }
    setWeekDates(dates);
    setSelectedDate(today);
  };

  const createCircularArc = (percentage, radius = 80) => {
    const startAngle = -90;
    const endAngle = startAngle + percentage * 360;

    const centerX = 100;
    const centerY = 100;
    const startX = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
    const startY = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
    const endX = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
    const endY = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

    const largeArcFlag = percentage > 0.5 ? 1 : 0;

    if (percentage === 0) return "";
    if (percentage >= 1) {
      const midX = centerX + radius;
      const midY = centerY;
      return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${midX} ${midY} A ${radius} ${radius} 0 0 1 ${startX} ${startY}`;
    }

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  const stepPercentage = Math.min((stepsData || 0) / (dailyGoal || 10000), 1);
  const stepsLeft = Math.max((dailyGoal || 10000) - (stepsData || 0), 0);
  const distance = ((stepsData || 0) * 0.0008).toFixed(1);
  const caloriesBurned = Math.round((stepsData || 0) * 0.04); // Approximate

  const getCurrentDate = () => {
    const now = new Date();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
  };

  const formatDate = (date) => {
    return date.getDate();
  };

  const getDayName = (date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const renderDayWiseGraph = () => {
    if (!weeklyStepsData || weeklyStepsData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      );
    }

    const maxSteps = Math.max(...weeklyStepsData, dailyGoal || 10000, 1);
    const graphHeight = 120;
    const barWidth = (width - 80) / 7;

    return (
      <View style={styles.graphContainer}>
        <View style={styles.graphContent}>
          {weeklyStepsData.map((steps, index) => {
            const barHeight = (steps / maxSteps) * graphHeight;
            const date = weekDates[index];
            const isSelected =
              date && selectedDate.toDateString() === date.toDateString();

            return (
              <TouchableOpacity
                key={index}
                style={styles.barContainer}
                onPress={() => date && setSelectedDate(date)}
              >
                <View style={styles.barWrapper}>
                  {steps > 0 && <Text style={styles.barValue}>{steps}</Text>}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(barHeight, 4),
                        backgroundColor: isSelected ? "#F93C7D" : "#E0E0E0",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>
                  {date ? formatDate(date).toString().padStart(2, "0") : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderHourlyGraph = () => {
    if (!hourlyStepsData || hourlyStepsData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      );
    }

    const maxSteps = Math.max(...hourlyStepsData, 1);
    const graphHeight = 100;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.graphScrollView}
        contentContainerStyle={styles.graphScrollContent}
      >
        {hourlyStepsData.map((steps, hour) => {
          const barHeight = (steps / maxSteps) * graphHeight;

          return (
            <View key={hour} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                {steps > 0 && <Text style={styles.barValue}>{steps}</Text>}
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barHeight, 4),
                      backgroundColor: "#F93C7D",
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>
                {hour.toString().padStart(2, "0")}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.replace("/client/home")}
        >
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Step Counter</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Permission check loading */}
      {isCheckingPermission ? (
        <View style={styles.setupContainer}>
          <ActivityIndicator size="large" color="#F93C7D" />
        </View>
      ) : Platform.OS === "ios" && iosNeedsSetup ? (
        /* First and only time — show onboarding screen */
        <View style={styles.setupContainer}>
          <Image
            source={require("../../assets/images/steps.png")}
            style={styles.setupIcon}
          />
          <Text style={styles.setupTitle}>Set Up Step Tracking</Text>
          <Text style={styles.setupSubText}>
            Connect Apple Health to track your daily steps
          </Text>
          <View style={styles.stepsOverview}>
            <View style={styles.stepsOverviewItem}>
              <View style={styles.stepsOverviewBadge}>
                <Text style={styles.stepsOverviewNum}>1</Text>
              </View>
              <Text style={styles.stepsOverviewText}>Open Apple Health</Text>
            </View>
            <View style={styles.stepsOverviewDivider} />
            <View style={styles.stepsOverviewItem}>
              <View style={styles.stepsOverviewBadge}>
                <Text style={styles.stepsOverviewNum}>2</Text>
              </View>
              <Text style={styles.stepsOverviewText}>
                Grant step permission
              </Text>
            </View>
            <View style={styles.stepsOverviewDivider} />
            <View style={styles.stepsOverviewItem}>
              <View style={styles.stepsOverviewBadge}>
                <Text style={styles.stepsOverviewNum}>3</Text>
              </View>
              <Text style={styles.stepsOverviewText}>View your steps</Text>
            </View>
          </View>
          <View style={styles.setupHealthSourceContainer}>
            <Text style={styles.setupHealthSourceText}>
              This app uses Apple HealthKit to read your step count. Your data
              is only used to display your daily activity and is not shared with
              third parties.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.setupButton}
            onPress={async () => {
              if (iosConsentShown) {
                // Consent already given once — skip modal, go straight to HealthKit
                await new Promise((resolve) => setTimeout(resolve, 100));
                await setupAppleHealth();
              } else {
                // First time — show the consent modal
                await AsyncStorage.setItem("ios_consent_shown", "true");
                setIosConsentShown(true);
                setShowSetupModal(true);
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.setupButtonText}>Connect Apple Health</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : showDataSourceSetup ? (
        /* Android: Health Connect available + permission granted, but no data source */
        <View style={styles.setupContainer}>
          {!showRefresh ? (
            <>
              <Image
                source={require("../../assets/images/steps.png")}
                style={styles.setupIcon}
              />
              <Text style={styles.setupTitle}>Connect a Data Source</Text>
              <Text style={styles.setupSubText}>
                Install & sync Google Fit with Health Connect to track your
                steps
              </Text>
              <TouchableOpacity
                style={styles.setupButton}
                onPress={handleGoogleFitSetup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.setupButtonText}>
                    Install / Sync Google Fit
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Image
                source={require("../../assets/images/steps.png")}
                style={styles.setupIcon}
              />
              <Text style={styles.setupTitle}>Almost there!</Text>
              <Text style={styles.setupSubText}>
                Once Google Fit is synced with Health Connect, tap Refresh to
                load your steps.
              </Text>
              <TouchableOpacity
                style={styles.setupButton}
                onPress={handleDataSourceRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.setupButtonText}>Refresh</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : needsSetup ? (
        /* Android: Health Connect not installed or permission not granted */
        <View style={styles.setupContainer}>
          {!showRefresh ? (
            <>
              <Image
                source={require("../../assets/images/steps.png")}
                style={styles.setupIcon}
              />
              <Text style={styles.setupTitle}>Set Up Step Tracking</Text>
              <Text style={styles.setupSubText}>
                Connect Health Connect to track your daily steps
              </Text>

              {/* Inline steps summary */}
              <View style={styles.stepsOverview}>
                <View style={styles.stepsOverviewItem}>
                  <View style={styles.stepsOverviewBadge}>
                    <Text style={styles.stepsOverviewNum}>1</Text>
                  </View>
                  <Text style={styles.stepsOverviewText}>
                    Install Health Connect
                  </Text>
                </View>
                <View style={styles.stepsOverviewDivider} />
                <View style={styles.stepsOverviewItem}>
                  <View style={styles.stepsOverviewBadge}>
                    <Text style={styles.stepsOverviewNum}>2</Text>
                  </View>
                  <Text style={styles.stepsOverviewText}>
                    Grant step permission
                  </Text>
                </View>
                <View style={styles.stepsOverviewDivider} />
                <View style={styles.stepsOverviewItem}>
                  <View style={styles.stepsOverviewBadge}>
                    <Text style={styles.stepsOverviewNum}>3</Text>
                  </View>
                  <Text style={styles.stepsOverviewText}>Sync Google Fit</Text>
                </View>
              </View>

              <View style={styles.setupHealthSourceContainer}>
                <Ionicons name="heart" size={14} color="#4285F4" />
                <Text style={styles.setupHealthSourceText}>
                  This app uses Health Connect to read your step count. Your
                  data is only used to display your daily activity and is not
                  shared with third parties.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.setupButton}
                onPress={handleSetup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.setupButtonText}>
                    {!isAndroidAvailable ? "Install Health Connect" : "Set Up"}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Image
                source={require("../../assets/images/steps.png")}
                style={styles.setupIcon}
              />
              <Text style={styles.setupTitle}>Almost there!</Text>
              <Text style={styles.setupSubText}>
                {!isAndroidAvailable
                  ? "Install Health Connect from Play Store, then tap Refresh"
                  : "Grant permission in Health Connect, then tap Refresh"}
              </Text>
              <TouchableOpacity
                style={styles.setupButton}
                onPress={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.setupButtonText}>Refresh</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        /* All set up (Android ready or iOS with permission) — show the full step details */
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Progress Circle */}
          <View style={styles.progressCard}>
            <View style={styles.circleContainer}>
              <Svg width="200" height="200" viewBox="0 0 200 200">
                <Circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke="#E5E5E5"
                  strokeWidth="12"
                  fill="none"
                />
                <Path
                  d={createCircularArc(
                    stepPercentage >= 1 ? 0.999999 : stepPercentage,
                    80,
                  )}
                  stroke="#F93C7D"
                  strokeLinecap="round"
                  strokeWidth="12"
                  fill="none"
                />
              </Svg>

              <View style={styles.circleContent}>
                <Image
                  source={require("../../assets/images/steps.png")}
                  style={styles.stepsIcon}
                />
                <Text style={styles.stepsCount}>{stepsData}</Text>
                <Text style={styles.stepsLabel}>Steps</Text>
                <Text style={styles.stepsLeft}>{stepsLeft} steps left</Text>
              </View>
            </View>

            {/* Daily Goal */}
            <View style={styles.goalContainer}>
              <View style={styles.goalRow}>
                <View style={styles.goalBox}>
                  <Text style={styles.goalLabel}>Daily Goal</Text>
                  <Text style={styles.goalValue}>{dailyGoal} steps</Text>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setShowGoalModal(true)}
                >
                  <Image
                    source={require("../../assets/images/edit_steps.png")}
                    style={styles.editIcon}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statIconText}>📍</Text>
              <View>
                <Text style={styles.statValue}>{distance} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIconText}>🔥</Text>
              <View>
                <Text style={styles.statValue}>{caloriesBurned} kcal</Text>
                <Text style={styles.statLabel}>Calories</Text>
              </View>
            </View>
          </View>

          {/* Date */}
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{getCurrentDate()}</Text>
          </View>

          {/* Hourly + Weekly graphs — Android only (Apple Health only provides today's total) */}
          {Platform.OS !== "ios" && (
            <>
              {/* Hourly Graph */}
              <View style={styles.graphSection}>
                <View style={styles.graphHeader}>
                  <Text style={styles.graphTitle}>Hourly wise step count</Text>
                </View>
                {renderHourlyGraph()}
              </View>

              {/* Week Calendar */}
              <View style={styles.calendarContainer}>
                {weekDates.map((date, index) => {
                  const selected =
                    selectedDate.toDateString() === date.toDateString();
                  const today = isToday(date);

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dateButton,
                        selected && styles.dateButtonSelected,
                        today && styles.dateButtonToday,
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text
                        style={[
                          styles.dateNumber,
                          today && !selected && styles.dateNumberToday,
                          selected && styles.dateNumberSelected,
                        ]}
                      >
                        {date ? formatDate(date) : ""}
                      </Text>
                      <Text
                        style={[
                          styles.dayName,
                          today && !selected && styles.dayNameToday,
                          selected && styles.dayNameSelected,
                        ]}
                      >
                        {date ? getDayName(date) : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Daily Graph */}
              <View style={styles.graphSection}>
                <View style={styles.graphHeader}>
                  <Text style={styles.graphTitle}>Day wise step count</Text>
                </View>
                {renderDayWiseGraph()}
              </View>
            </>
          )}

          {/* HealthKit / Health Connect Attribution */}
          {Platform.OS === "ios" ? (
            <View style={styles.healthSourceContainer}>
              <Ionicons name="heart" size={16} color="#FF2D55" />
              <Text style={styles.healthSourceText}>
                Step data provided by Apple Health (HealthKit). This app reads
                your step count from Apple Health to display your daily
                activity. No health data is shared with third parties.
              </Text>
            </View>
          ) : (
            <View style={styles.healthSourceContainer}>
              <Ionicons name="heart" size={16} color="#4285F4" />
              <Text style={styles.healthSourceText}>
                Step data provided by Health Connect. This app reads your step
                count to display your daily activity. No health data is shared
                with third parties.
              </Text>
            </View>
          )}

          {/* Health Disclaimer */}
          <View style={styles.healthDisclaimerContainer}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color="#888"
            />
            <Text style={styles.healthDisclaimerText}>
              This app is not a medical device and does not diagnose, treat,
              cure, or prevent any medical condition. Consult a healthcare
              professional for medical advice.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Goal Edit Modal */}
      <Modal
        visible={showGoalModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Daily Goal</Text>
            <TextInput
              style={styles.input}
              value={tempGoal}
              onChangeText={setTempGoal}
              keyboardType="number-pad"
              placeholder="Enter daily step goal"
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={saveDailyGoal}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Health / Apple Health Setup Modal */}
      <Modal
        visible={showSetupModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSetupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {Platform.OS === "ios"
                  ? "Apple HealthKit Integration"
                  : "Setup Health Connect"}
              </Text>
              <Text style={styles.setupModalSubtitle}>
                {Platform.OS === "ios"
                  ? "This app uses Apple HealthKit to read your step count data. Your data stays on your device and is only used to display your daily activity."
                  : "Follow these steps to track your daily steps"}
              </Text>

              <View style={styles.disclaimerContainer}>
                <Text style={styles.disclaimerText}>
                  ⓘ This app is not a medical device and does not diagnose,
                  treat, cure, or prevent any medical condition. Please consult
                  a healthcare professional for medical advice.
                </Text>
              </View>

              {Platform.OS === "ios" ? (
                <>
                  <View style={styles.stepContainer}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Allow Access</Text>
                      <Text style={styles.stepDescription}>
                        Tap "Start Setup" — Apple Health permission dialog will
                        appear
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepContainer}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>
                        Grant Step Permission
                      </Text>
                      <Text style={styles.stepDescription}>
                        Enable "Steps" read access in the Health permission
                        screen
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepContainer}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>View Your Steps</Text>
                      <Text style={styles.stepDescription}>
                        Your step data from Apple Health will appear
                        automatically
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.stepContainer}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>
                        Install Health Connect
                      </Text>
                      <Text style={styles.stepDescription}>
                        Download Health Connect from Google Play Store
                      </Text>
                    </View>
                  </View>

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
                </>
              )}

              <View style={styles.privacyNotice}>
                <Text style={styles.privacyText}>
                  Your step data is only used to display your steps count within
                  the app. We do not sell or share your health data with third
                  parties.
                </Text>
              </View>

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
                  {Platform.OS === "ios"
                    ? "I understand and agree to allow this app to access my step data from Apple Health (HealthKit) for fitness tracking purposes only."
                    : "I understand and agree to allow this app to access my step data from Health Connect for fitness tracking purposes only."}
                </Text>
              </TouchableOpacity>

              <View style={styles.setupModalButtons}>
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
                  style={styles.setupCancelButton}
                  onPress={() => {
                    setShowSetupModal(false);
                    setUserConsent(false);
                  }}
                >
                  <Text style={styles.setupCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerButton: {
    padding: 4,
    width: 36,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  circleContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  circleContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  stepsIcon: {
    width: 30,
    height: 36,
    marginBottom: 4,
    tintColor: "#F93C7D",
  },
  stepsCount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  stepsLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 3,
  },
  stepsLeft: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  goalContainer: {
    alignItems: "center",
    marginTop: 0,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  goalLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
  },
  goalValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F93C7D",
  },
  editButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  editIcon: {
    width: 20,
    height: 20,
    tintColor: "#F93C7D",
  },
  goalValueSmall: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F93C7D",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  statIconText: {
    fontSize: 16,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  dateContainer: {
    marginBottom: 16,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
  },
  calendarContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  dateButton: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    minWidth: 40,
  },
  dateButtonSelected: {
    backgroundColor: "#F93C7D",
  },
  dateButtonToday: {
    borderWidth: 2,
    borderColor: "#F93C7D",
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  dateNumberSelected: {
    color: "#FFFFFF",
  },
  dateNumberToday: {
    color: "#F93C7D",
  },
  dayName: {
    fontSize: 10,
    color: "#666",
  },
  dayNameSelected: {
    color: "#FFFFFF",
  },
  dayNameToday: {
    color: "#F93C7D",
  },
  graphSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  graphHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  graphTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  graphContainer: {
    height: 150,
    justifyContent: "flex-end",
  },
  graphContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 140,
  },
  barContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barWrapper: {
    height: 120,
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 4,
  },
  bar: {
    width: 24,
    borderRadius: 4,
    minHeight: 4,
  },
  barValue: {
    fontSize: 9,
    color: "#333",
    fontWeight: "600",
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  graphScrollView: {
    height: 150,
  },
  graphScrollContent: {
    paddingHorizontal: 8,
    alignItems: "flex-end",
  },
  noDataContainer: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataText: {
    fontSize: 12,
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "90%",
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
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: "#1A1A1A",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#F93C7D",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
  },
  cancelButtonText: {
    color: "#666",
  },
  setupHealthSourceContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    backgroundColor: "#F8F8F8",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#E5E5E5",
    width: "100%",
  },
  setupHealthSourceText: {
    fontSize: 11,
    color: "#555",
    marginLeft: 8,
    lineHeight: 16,
    flex: 1,
  },
  healthSourceContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#F8F8F8",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#E5E5E5",
  },
  healthSourceText: {
    fontSize: 11,
    color: "#555",
    marginLeft: 8,
    lineHeight: 16,
    flex: 1,
  },
  healthDisclaimerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  healthDisclaimerText: {
    fontSize: 10,
    color: "#888",
    marginLeft: 6,
    lineHeight: 14,
    flex: 1,
  },
  // Setup / Coming Soon screen
  setupContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  setupIcon: {
    width: 60,
    height: 70,
    tintColor: "#F93C7D",
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 10,
    textAlign: "center",
  },
  setupSubText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  setupButton: {
    backgroundColor: "#F93C7D",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 180,
  },
  setupButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  stepsOverview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F8",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 28,
    width: "100%",
  },
  stepsOverviewItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  stepsOverviewBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F93C7D",
    justifyContent: "center",
    alignItems: "center",
  },
  stepsOverviewNum: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  stepsOverviewText: {
    fontSize: 11,
    color: "#444",
    textAlign: "center",
    fontWeight: "500",
    minHeight: 30,
  },
  stepsOverviewDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#F0D0DA",
  },
  comingSoonTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 10,
    textAlign: "center",
  },
  comingSoonSubText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  // Setup modal styles
  setupModalSubtitle: {
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
  setupModalButtons: {
    marginTop: 10,
    gap: 12,
  },
  startButton: {
    backgroundColor: "#F93C7D",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  startButtonDisabled: {
    backgroundColor: "#E5E5E5",
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  startButtonTextDisabled: {
    color: "#999",
  },
  setupCancelButton: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  setupCancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default StepDetails;
