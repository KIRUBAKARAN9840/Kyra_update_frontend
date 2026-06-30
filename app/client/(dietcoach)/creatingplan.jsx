import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Alert,
  BackHandler,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import {
  pollDietPlanStatusAPI,
  getDietPlanAPI,
} from "../../../services/clientApi";

const ACCENT = "#00BC7D";
const { width } = Dimensions.get("window");

const STEPS = [
  {
    label: "Analyzing your profile...",
    icon: "brain",
    iconLib: "MaterialCommunityIcons",
  },
  {
    label: "Calculating your calorie needs...",
    icon: "settings-outline",
    iconLib: "Ionicons",
  },
  {
    label: "Balancing nutrients...",
    icon: "restaurant-outline",
    iconLib: "Ionicons",
  },
  {
    label: "Creating your personalized plan...",
    icon: "sparkles",
    iconLib: "Ionicons",
  },
];

const STEP_DURATION = 10000; // 10s per step, first 3 steps = 30s

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const StepCard = ({ step, index, currentStep }) => {
  const isActive = index === currentStep;
  const isDone = index < currentStep;
  const isPending = index > currentStep;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive || isDone) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive, isDone]);

  useEffect(() => {
    if (isActive) {
      const animateDots = () => {
        Animated.loop(
          Animated.sequence([
            Animated.stagger(150, [
              Animated.sequence([
                Animated.timing(dotAnim1, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.timing(dotAnim1, {
                  toValue: 0.3,
                  duration: 300,
                  useNativeDriver: true,
                }),
              ]),
              Animated.sequence([
                Animated.timing(dotAnim2, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.timing(dotAnim2, {
                  toValue: 0.3,
                  duration: 300,
                  useNativeDriver: true,
                }),
              ]),
              Animated.sequence([
                Animated.timing(dotAnim3, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.timing(dotAnim3, {
                  toValue: 0.3,
                  duration: 300,
                  useNativeDriver: true,
                }),
              ]),
            ]),
          ]),
        ).start();
      };
      animateDots();
    }
  }, [isActive]);

  useEffect(() => {
    if (isDone) {
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isDone]);

  const renderIcon = () => {
    if (isDone) {
      return (
        <Animated.View
          style={[
            styles.stepIconCircle,
            styles.stepIconDone,
            { transform: [{ scale: checkScale }] },
          ]}
        >
          <Ionicons name="checkmark" size={22} color="#fff" />
        </Animated.View>
      );
    }

    if (isActive) {
      return (
        <View style={[styles.stepIconCircle, styles.stepIconActive]}>
          {step.iconLib === "MaterialCommunityIcons" ? (
            <MaterialCommunityIcons name={step.icon} size={22} color="#fff" />
          ) : step.iconLib === "Feather" ? (
            <Feather name={step.icon} size={22} color="#fff" />
          ) : (
            <Ionicons name={step.icon} size={22} color="#fff" />
          )}
        </View>
      );
    }

    return (
      <View style={[styles.stepIconCircle, styles.stepIconPending]}>
        {step.iconLib === "MaterialCommunityIcons" ? (
          <MaterialCommunityIcons name={step.icon} size={22} color="#ccc" />
        ) : step.iconLib === "Feather" ? (
          <Feather name={step.icon} size={22} color="#ccc" />
        ) : (
          <Ionicons name={step.icon} size={22} color="#ccc" />
        )}
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.stepCard,
        isActive && styles.stepCardActive,
        isDone && styles.stepCardDone,
        isPending && styles.stepCardPending,
        {
          opacity: isPending ? 0.5 : fadeAnim,
          transform: [{ translateY: isPending ? 0 : slideAnim }],
        },
      ]}
    >
      {renderIcon()}
      <Text
        style={[
          styles.stepLabel,
          isActive && styles.stepLabelActive,
          isDone && styles.stepLabelDone,
          isPending && styles.stepLabelPending,
        ]}
      >
        {step.label}
      </Text>
      {isActive && (
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.loadingDot, { opacity: dotAnim1 }]} />
          <Animated.View style={[styles.loadingDot, { opacity: dotAnim2 }]} />
          <Animated.View style={[styles.loadingDot, { opacity: dotAnim3 }]} />
        </View>
      )}
    </Animated.View>
  );
};

const INITIAL_DELAY = 30000; // 30s before first poll
const POLL_INTERVAL = 15000; // 15s between polls
const MAX_POLL_TIME = 300000; // 5 minutes max

const CreatingPlan = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);
  const rotateAnim1 = useRef(new Animated.Value(0)).current;
  const rotateAnim2 = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;
  const pollTimerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const isMountedRef = useRef(true);

  // Block back navigation
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true; // block back
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => backHandler.remove();
    }, []),
  );

  // Two arcs rotating in opposite directions
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim1, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim2, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.08,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Step progression: first 3 steps over 30s, 4th stays active until plan arrives
  useEffect(() => {
    const timers = [];
    // Only auto-advance through the first 3 steps (indices 1, 2, 3)
    // Step 3 (index 3) = "Creating your personalized plan..." stays active
    for (let i = 1; i <= 3; i++) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) setCurrentStep(i);
      }, i * STEP_DURATION);
      timers.push(timer);
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  // Polling logic
  useEffect(() => {
    isMountedRef.current = true;
    startTimeRef.current = Date.now();
    const jobId = params.job_id;

    if (!jobId) {
      setError("No job ID found. Please try again.");
      return;
    }

    const fetchPlan = async (jid) => {
      try {
        const planRes = await getDietPlanAPI(jid);
        if (!isMountedRef.current) return;

        if (planRes?.status === 200 && planRes?.plan) {
          // Mark last step as done, then navigate after a short delay
          setCurrentStep(STEPS.length);
          setTimeout(() => {
            if (isMountedRef.current) {
              router.replace({
                pathname: "/client/(dietcoach)/generated",
                params: {
                  plan: JSON.stringify(planRes.plan),
                  plan_id: String(planRes.plan_id || ""),
                },
              });
            }
          }, 800);
        } else if (planRes?.status === 409) {
          // Not ready yet, resume polling
          schedulePoll(jid);
        } else {
          setError(planRes?.detail || "Failed to fetch plan.");
        }
      } catch {
        if (isMountedRef.current) setError("Failed to fetch plan.");
      }
    };

    const poll = async (jid) => {
      if (!isMountedRef.current) return;

      if (Date.now() - startTimeRef.current > MAX_POLL_TIME) {
        setError("Taking longer than expected. Please try again later.");
        return;
      }

      try {
        const res = await pollDietPlanStatusAPI(jid);
        if (!isMountedRef.current) return;

        if (res?.state === "complete") {
          fetchPlan(jid);
        } else if (res?.state === "failed") {
          setError(res?.error || "Plan generation failed. Please try again.");
        } else if (res?.state === "queued" || res?.state === "processing") {
          schedulePoll(jid);
        } else if (res?.status === 404 || res?.status === 403) {
          setError(res?.detail || "Job not found. Please try again.");
        } else {
          schedulePoll(jid);
        }
      } catch {
        if (isMountedRef.current) schedulePoll(jid);
      }
    };

    const schedulePoll = (jid) => {
      pollTimerRef.current = setTimeout(() => poll(jid), POLL_INTERVAL);
    };

    // Wait 30s before first poll
    pollTimerRef.current = setTimeout(() => poll(jobId), INITIAL_DELAY);

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [params.job_id]);

  const spin1 = rotateAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const spin2 = rotateAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: ["360deg", "0deg"],
  });

  const OUTER_SIZE = 110;
  const INNER_SIZE = 90;
  const STROKE_WIDTH = 3.5;
  const OUTER_RADIUS = (OUTER_SIZE - STROKE_WIDTH) / 2;
  const INNER_RADIUS = (INNER_SIZE - STROKE_WIDTH) / 2;
  const OUTER_CIRC = 2 * Math.PI * OUTER_RADIUS;
  const INNER_CIRC = 2 * Math.PI * INNER_RADIUS;
  const OUTER_ARC = OUTER_CIRC * 0.28;
  const INNER_ARC = INNER_CIRC * 0.25;

  return (
    <LinearGradient
      colors={["#ECFDF5", "#FFFFFF", "#F0FDFA"]}
      locations={[0, 0.5, 1]}
      start={[0, 0]}
      end={[1, 1]}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      {/* Top icon with rotating arc */}
      <View style={styles.topSection}>
        <View style={styles.iconOuterContainer}>
          {/* Outer arc - clockwise */}
          <Animated.View
            style={[styles.arcLayer, { transform: [{ rotate: spin1 }] }]}
          >
            <Svg width={OUTER_SIZE} height={OUTER_SIZE}>
              <Circle
                cx={OUTER_SIZE / 2}
                cy={OUTER_SIZE / 2}
                r={OUTER_RADIUS}
                stroke="#FFFFFF"
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
              />
              <Circle
                cx={OUTER_SIZE / 2}
                cy={OUTER_SIZE / 2}
                r={OUTER_RADIUS}
                stroke={ACCENT}
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={`${OUTER_ARC} ${OUTER_CIRC - OUTER_ARC}`}
              />
            </Svg>
          </Animated.View>
          {/* Inner arc - counter-clockwise */}
          <Animated.View
            style={[styles.arcLayer, { transform: [{ rotate: spin2 }] }]}
          >
            <Svg width={INNER_SIZE} height={INNER_SIZE}>
              <Circle
                cx={INNER_SIZE / 2}
                cy={INNER_SIZE / 2}
                r={INNER_RADIUS}
                stroke="#FFFFFF"
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
              />
              <Circle
                cx={INNER_SIZE / 2}
                cy={INNER_SIZE / 2}
                r={INNER_RADIUS}
                stroke={ACCENT}
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={`${INNER_ARC} ${INNER_CIRC - INNER_ARC}`}
              />
            </Svg>
          </Animated.View>
          <Animated.View
            style={[
              styles.iconInnerCircle,
              { transform: [{ scale: iconPulse }] },
            ]}
          >
            <Ionicons name="sparkles" size={28} color="#fff" />
          </Animated.View>
        </View>

        <Text style={styles.title}>
          {error ? "Oops!" : "Creating your plan"}
        </Text>
        <Text style={styles.subtitle}>
          {error ? error : "This may take up to 2 minutes..."}
        </Text>
      </View>

      {error ? (
        <View style={styles.stepsContainer}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Go Back & Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.stepsContainer}>
          {STEPS.map((step, index) => (
            <StepCard
              key={index}
              step={step}
              index={index}
              currentStep={currentStep}
            />
          ))}
        </View>
      )}
    </LinearGradient>
  );
};

export default CreatingPlan;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
  },
  topSection: {
    alignItems: "center",
    marginTop: 50,
    marginBottom: 40,
  },
  iconOuterContainer: {
    width: 110,
    height: 110,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  arcLayer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  iconInnerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ACCENT,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
  },
  stepsContainer: {
    width: width - 40,
    gap: 12,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  stepCardActive: {
    borderColor: ACCENT + "40",
    backgroundColor: ACCENT + "0D",
  },
  stepCardDone: {
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  stepCardPending: {
    borderColor: "#f0f0f0",
    backgroundColor: "#fafafa",
  },
  stepIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  stepIconActive: {
    backgroundColor: ACCENT,
  },
  stepIconDone: {
    backgroundColor: ACCENT,
  },
  stepIconPending: {
    backgroundColor: "#f0f0f0",
  },
  stepLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  stepLabelActive: {
    color: ACCENT,
  },
  stepLabelDone: {
    color: ACCENT,
  },
  stepLabelPending: {
    color: "#ccc",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 4,
    marginLeft: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  retryButton: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignSelf: "center",
  },
  retryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
