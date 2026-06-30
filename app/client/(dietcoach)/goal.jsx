import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaskedText } from "../../../components/ui/MaskedText";
import { ClientWeightUpdateNew } from "../../../services/clientApi";

const ACCENT = "#00BC7D";
const GRADIENT_1 = "#00BC7D";
const GRADIENT_2 = "#00BBA7";

const GOAL_THEMES = {
  weight_loss: { bg1: "#FF2056", bg2: "#FF6900", bgOpacity: "1A" },
  weight_gain: { bg1: "#2B7FFF", bg2: "#00B8DB", bgOpacity: "1A" },
  maintain: { bg1: GRADIENT_1, bg2: GRADIENT_2, bgOpacity: "1A" },
};

const GOAL_IMAGES = {
  weight_loss: require("../../../assets/images/diet_coach/lose.webp"),
  weight_gain: require("../../../assets/images/diet_coach/gain.webp"),
  maintain: require("../../../assets/images/diet_coach/maintain.webp"),
};

const Goal = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [selectedGoal, setSelectedGoal] = useState(params.goal || "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => backHandler.remove();
    }, [router]),
  );

  const goalOptions = [
    {
      value: "weight_loss",
      title: "Lose Weight",
      subtitle: "Burn fat and get leaner",
      icon: "trending-down",
    },
    {
      value: "weight_gain",
      title: "Gain Weight",
      subtitle: "Build muscle and mass",
      icon: "trending-up",
    },
    {
      value: "maintain",
      title: "Maintain Weight",
      subtitle: "Stay healthy and balanced",
      icon: "target",
    },
  ];

  const handleContinue = async () => {
    if (!selectedGoal) {
      Alert.alert(
        "Incomplete Selection",
        "Please select a goal before continuing.",
        [{ text: "OK" }],
      );
      return;
    }

    const actualWeight = Number(params.weight);
    const targetWeight = Number(params.targetWeight);
    const payload = {};
    if (actualWeight && !Number.isNaN(actualWeight)) {
      payload.actual_weight = actualWeight;
    }
    if (targetWeight && !Number.isNaN(targetWeight)) {
      payload.target_weight = targetWeight;
    }

    if (Object.keys(payload).length > 0) {
      setSaving(true);
      try {
        await ClientWeightUpdateNew(payload);
      } catch (_) {
        // Non-blocking: weights are also persisted at final submit via diet plan API
      } finally {
        setSaving(false);
      }
    }

    router.push({
      pathname: "/client/(dietcoach)/allergies",
      params: {
        ...params,
        goal: selectedGoal,
      },
    });
  };

  const getTheme = (value) => GOAL_THEMES[value] || GOAL_THEMES.maintain;

  return (
    <LinearGradient colors={["#ECFDF5", "#FFFFFF", "#F0FDFA"]} locations={[0, 0.5, 1]} start={[0, 0]} end={[1, 1]} style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={24} color={ACCENT} />
        </TouchableOpacity>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step 4 of 8</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>What's your </Text>
        <MaskedText
          bg1={GRADIENT_1}
          bg2={GRADIENT_2}
          text="goal"
          textStyle={styles.titleTextBold}
        />
        <Text style={styles.titleText}>?</Text>
      </View>
      <Text style={styles.subtitleText}>Choose what you want to achieve</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
          <View style={styles.cardsContainer}>
            {goalOptions.map((option) => {
              const theme = getTheme(option.value);
              const isSelected = selectedGoal === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={styles.goalCard}
                  onPress={() => setSelectedGoal(option.value)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.contentContainer,
                      isSelected && {
                        borderColor: theme.bg1,
                        backgroundColor: `${theme.bg1}${theme.bgOpacity}`,
                      },
                    ]}
                  >
                    <View style={styles.iconContainer}>
                      <View
                        style={[
                          styles.iconWrapper,
                          {
                            backgroundColor: isSelected
                              ? `${theme.bg1}20`
                              : "#F0F0F0",
                          },
                        ]}
                      >
                        {isSelected ? (
                          <Image
                            source={GOAL_IMAGES[option.value]}
                            style={styles.goalIcon}
                            resizeMode="contain"
                          />
                        ) : (
                          <Feather name={option.icon} size={22} color="#666" />
                        )}
                      </View>
                    </View>

                    <View style={styles.textContainer}>
                      <Text style={styles.cardTitle}>{option.title}</Text>
                      <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
                    </View>

                    {isSelected && (
                      <View style={styles.checkmarkContainer}>
                        <LinearGradient
                          colors={[theme.bg1, theme.bg2]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.checkmark}
                        >
                          <Feather name="check" size={16} color="white" />
                        </LinearGradient>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.continueButtonWrapper,
              !selectedGoal && styles.disabledButton,
            ]}
            onPress={handleContinue}
            activeOpacity={0.85}
            disabled={!selectedGoal || saving}
          >
            <LinearGradient
              colors={
                selectedGoal ? [GRADIENT_1, GRADIENT_2] : ["#EEEEEE", "#EEEEEE"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButton}
            >
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text
                    style={[
                      styles.continueButtonText,
                      !selectedGoal && styles.disabledButtonText,
                    ]}
                  >
                    Continue
                  </Text>
                  <Feather
                    name="arrow-right"
                    size={16}
                    color={selectedGoal ? "white" : "#454545"}
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default Goal;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  stepIndicator: {
    flex: 1,
    alignItems: "center",
  },
  stepText: {
    fontSize: 14,
    color: "#6A7282",
    fontWeight: "500",
  },
  headerSpacer: {
    width: 34,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  titleText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  titleTextBold: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitleText: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 5,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
  },
  cardsContainer: {
    justifyContent: "center",
    paddingVertical: 20,
  },
  goalCard: {
    width: "100%",
    marginVertical: 10,
    borderRadius: 12,
    overflow: "visible",
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
    overflow: "hidden",
  },
  goalIcon: {
    width: 30,
    height: 30,
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
    marginBottom: 4,
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
    justifyContent: "center",
    alignItems: "center",
  },
  continueButtonWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    width: "75%",
    alignSelf: "center",
    marginTop: 10,
  },
  disabledButton: {},
  continueButton: {
    flexDirection: "row",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 6,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButtonText: {
    color: "#454545",
  },
});
