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
import { generateFollowupAPI } from "../../../services/clientApi";

const ACCENT = "#00BC7D";
const GRADIENT_1 = "#00BC7D";
const GRADIENT_2 = "#00BBA7";

const Followup = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const stepLabel = params.next_step_label || "follow_up_1";
  const stepNumber = Number(params.next_step) || 1;
  const weekLabel = `Week ${stepNumber + 1}`;

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

  const handleGenerate = async () => {
    Keyboard.dismiss();
    setLoading(true);

    try {
      const payload = {};
      const parts = [];
      if (weight.trim()) parts.push(`Current weight: ${weight.trim()} kg`);
      if (feedback.trim()) parts.push(feedback.trim());
      if (parts.length > 0) payload.feedback = parts.join(". ");

      const res = await generateFollowupAPI(payload);

      if (res?.httpStatus === 200 && res?.plan) {
        router.push({
          pathname: "/client/(dietcoach)/generated",
          params: {
            plan: JSON.stringify(res.plan),
            plan_id: String(res.plan_id || ""),
          },
        });
      } else if (res?.httpStatus === 202 && res?.job_id) {
        router.push({
          pathname: "/client/(dietcoach)/creatingplan",
          params: {
            job_id: res.job_id,
          },
        });
      } else if (res?.httpStatus === 409) {
        Alert.alert("Not Available", res?.detail || "Follow-up not available right now.");
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
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient colors={["#ECFDF5", "#FFFFFF", "#F0FDFA"]} locations={[0, 0.5, 1]} start={[0, 0]} end={[1, 1]} style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => { if (!loading) router.back(); }}
          >
            <Feather name="arrow-left" size={24} color={ACCENT} />
          </TouchableOpacity>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>{weekLabel} Follow-up</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Follow-up </Text>
          <MaskedText
            bg1={GRADIENT_1}
            bg2={GRADIENT_2}
            text="Check-in"
            textStyle={styles.titleTextBold}
          />
        </View>
        <Text style={styles.subtitleText}>
          Let us know how your last plan went so we can improve your next one.
        </Text>

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Current Weight */}
          <Text style={styles.inputLabel}>Current Weight (kg)</Text>
          <View style={styles.weightInputContainer}>
            <TextInput
              style={styles.weightInput}
              placeholder="E.g. 68"
              placeholderTextColor="#bbb"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
              maxLength={5}
            />
            <Text style={styles.weightUnit}>kg</Text>
          </View>

          {/* Feedback */}
          <Text style={[styles.inputLabel, { marginTop: 24 }]}>
            How was your last diet plan? (optional)
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="E.g. I lost 2kg but got bored of the breakfast options. More variety would help..."
              placeholderTextColor="#bbb"
              multiline
              textAlignVertical="top"
              value={feedback}
              onChangeText={setFeedback}
              maxLength={1000}
            />
          </View>
          <Text style={styles.charCount}>{feedback.length}/1000</Text>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Feather name="trending-up" size={16} color={ACCENT} />
            <Text style={styles.infoText}>
              Your feedback helps our AI create a better, more personalized plan
              tailored to your progress and preferences.
            </Text>
          </View>
        </ScrollView>

        {/* Bottom */}
        <View
          style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}
        >
          <TouchableOpacity
            style={[styles.continueButtonWrapper, loading && { opacity: 0.6 }]}
            onPress={handleGenerate}
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
                    Generate {weekLabel} Plan
                  </Text>
                  <Feather name="arrow-right" size={16} color="white" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              setWeight("");
              setFeedback("");
              handleGenerate();
            }}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Text style={styles.skipText}>Skip & generate</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
};

export default Followup;

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
    marginBottom: 15,
    paddingHorizontal: 30,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  inputLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
    marginBottom: 10,
    lineHeight: 19,
  },
  // Weight input
  weightInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 16,
  },
  weightInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  weightUnit: {
    fontSize: 16,
    color: "#999",
    fontWeight: "500",
  },
  // Feedback input
  inputContainer: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
  },
  textInput: {
    minHeight: 130,
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
