import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaskedText } from "../../../components/ui/MaskedText";
import { generateDietPlanAPI } from "../../../services/clientApi";

const ACCENT = "#00BC7D";
const GRADIENT_1 = "#00BC7D";
const GRADIENT_2 = "#00BBA7";

const GOAL_MAP = {
  weight_loss: "fat loss",
  weight_gain: "muscle gain",
  maintain: "fat loss",
};

const Medical = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (loading) return true;
        router.back();
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => backHandler.remove();
    }, [router, loading]),
  );

  const buildPayload = (medicalText) => {
    const allergiesRaw = params.allergies || "";
    const allergiesList = allergiesRaw
      ? allergiesRaw.split(",").map((a) => a.trim()).filter(Boolean)
      : [];

    const choicesRaw = params.choices || "";
    const preferencesList = choicesRaw
      ? choicesRaw.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    const payload = {
      height: Number(params.height) || 170,
      weight: Number(params.weight) || 70,
      target_weight: Number(params.targetWeight) || 65,
      goal: GOAL_MAP[params.goal] || "fat loss",
      preferences: preferencesList,
      dietary_preference: (params.preference || "veg").toLowerCase(),
    };

    if (allergiesList.length > 0) {
      payload.allergies = allergiesList;
    }

    const otherParts = [];
    if (medicalText && medicalText !== "None") otherParts.push(medicalText);
    if (otherParts.length > 0) {
      payload.other = otherParts.join(". ");
    }

    return payload;
  };

  const handleSubmit = async (medicalText) => {
    Keyboard.dismiss();
    setLoading(true);

    try {
      const payload = buildPayload(medicalText);
      const res = await generateDietPlanAPI(payload);

      if (res?.httpStatus === 200 && res?.plan) {
        // Cached plan — go directly to generated screen
        router.push({
          pathname: "/client/(dietcoach)/generated",
          params: {
            plan: JSON.stringify(res.plan),
            plan_id: String(res.plan_id || ""),
          },
        });
      } else if (res?.httpStatus === 202 && res?.job_id) {
        // Generation queued — go to creating plan screen with job_id
        router.push({
          pathname: "/client/(dietcoach)/creatingplan",
          params: {
            job_id: res.job_id,
          },
        });
      } else if (res?.httpStatus === 429) {
        Alert.alert(
          "Limit Reached",
          res?.detail || "Daily plan generation limit reached. Try again tomorrow.",
        );
      } else if (res?.httpStatus === 422) {
        const details = res?.detail;
        const msg = Array.isArray(details)
          ? details.map((d) => d.msg).join("\n")
          : "Please check your inputs and try again.";
        Alert.alert("Validation Error", msg);
      } else if (res?.httpStatus === 401) {
        Alert.alert("Session Expired", "Please login again.");
      } else {
        Alert.alert(
          "Error",
          res?.detail || res?.message || "Something went wrong. Please try again.",
        );
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    handleSubmit(text.trim() || "None");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient colors={["#ECFDF5", "#FFFFFF", "#F0FDFA"]} locations={[0, 0.5, 1]} start={[0, 0]} end={[1, 1]} style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color={ACCENT} />
          </TouchableOpacity>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>Step 8 of 8</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Medical </Text>
          <MaskedText
            bg1={GRADIENT_1}
            bg2={GRADIENT_2}
            text="Conditions"
            textStyle={styles.titleTextBold}
          />
        </View>
        <Text style={styles.subtitleText}>
          Any health conditions or concerns we should know about?
        </Text>

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >


          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="E.g. Diabetes Type 2, Thyroid, PCOD, Knee injury, Blood pressure medication..."
              placeholderTextColor="#bbb"
              multiline
              textAlignVertical="top"
              value={text}
              onChangeText={setText}
              maxLength={500}
            />
          </View>

          <Text style={styles.charCount}>{text.length}/500</Text>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Feather name="shield" size={16} color={ACCENT} />
            <Text style={styles.infoText}>
              Your data is private and only used to personalize your diet plan.
              You can skip this step if you prefer.
            </Text>
          </View>
        </ScrollView>

        {/* Bottom */}
        <View
          style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}
        >
          <TouchableOpacity
            style={[styles.continueButtonWrapper, loading && { opacity: 0.6 }]}
            onPress={handleContinue}
            activeOpacity={0.85}
            disabled={loading}
          >
            <LinearGradient
              colors={[GRADIENT_1, GRADIENT_2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButton}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>
                    {text.trim().length === 0 ? "Skip" : "Continue"}
                  </Text>
                  <Feather name="arrow-right" size={16} color="white" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
};

export default Medical;

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
    marginTop: 0,
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
    marginBottom: 45,
    paddingHorizontal: 30,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
    marginBottom: 12,
    lineHeight: 19,
  },
  inputContainer: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
  },
  textInput: {
    minHeight: 160,
    padding: 16,
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    color: "#bbb",
    textAlign: "right",
    marginTop: 6,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FAF5",
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: "#D4EDDA",
  },
  infoText: {
    fontSize: 12,
    color: "#555",
    lineHeight: 18,
    flex: 1,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  continueButtonWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    width: "75%",
    alignSelf: "center",
  },
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
  skipButton: {
    alignSelf: "center",
    marginTop: 14,
  },
  skipText: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },
});
