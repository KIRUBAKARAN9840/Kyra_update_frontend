import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  BackHandler,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import YoutubeIframe from "react-native-youtube-iframe";
import { Image } from "react-native";
import {
  getFittbotExerciseDetailAPI,
  logWorkoutSetAPI,
  removeWorkoutSetAPI,
} from "../../../services/clientApi";
import { showToast } from "../../../utils/Toaster";

const { width, height } = Dimensions.get("window");
const isTablet = width >= 768;
const rw = (pct) => width * (pct / 100);
const rh = (pct) => height * (pct / 100);

const BG_TIME_KEY = "one_exercise_bg_timestamp";

// ---- Lightweight XP Popup with particles ----
const PARTICLE_COLORS = [
  "#FFD700",
  "#FF6347",
  "#00BFFF",
  "#32CD32",
  "#FF69B4",
  "#FFA500",
];
const PARTICLE_COUNT = 8;
const PARTICLE_ANGLES = Array.from(
  { length: PARTICLE_COUNT },
  (_, i) => (i * 360) / PARTICLE_COUNT,
);

const XPParticle = ({ angle, anim, color }) => {
  const rad = (angle * Math.PI) / 180;
  const dist = 55;
  const tx = Math.cos(rad) * dist;
  const ty = Math.sin(rad) * dist;

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
        opacity: anim.interpolate({
          inputRange: [0, 0.15, 0.6, 1],
          outputRange: [0, 1, 0.8, 0],
        }),
        transform: [
          {
            translateX: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, tx],
            }),
          },
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, ty],
            }),
          },
          {
            scale: anim.interpolate({
              inputRange: [0, 0.2, 0.7, 1],
              outputRange: [0.3, 1.3, 1, 0],
            }),
          },
        ],
      }}
    />
  );
};

const XPPopup = ({ xp, onDone }) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(particleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -40,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => onDone());
      }, 800);
    });
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 4,
        alignSelf: "center",
        zIndex: 9999,
        overflow: "visible",
        transform: [{ scale }, { translateY }],
      }}
      pointerEvents="none"
    >
      <Animated.View
        style={{
          opacity,
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
        }}
      >
        <View
          style={{
            backgroundColor: "#FFD700",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 22,
            borderWidth: 2.5,
            borderColor: "#FFA500",
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#8B4513" }}>
            +{xp} XP
          </Text>
        </View>
        {/* Particles layer — centered on badge */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            overflow: "visible",
          }}
          pointerEvents="none"
        >
          {PARTICLE_ANGLES.map((angle, i) => (
            <XPParticle
              key={i}
              angle={angle}
              anim={particleAnim}
              color={PARTICLE_COLORS[i % PARTICLE_COLORS.length]}
            />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default function OneExercise() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { type, exerciseId, exerciseName, muscleGroup } =
    useLocalSearchParams();

  // ─── Timer state ───────────────────────────────────────────────
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const timerRef = useRef(null);
  const isRunningRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  // ─── Sets state ────────────────────────────────────────────────
  const [sets, setSets] = useState([]);

  // ─── Log modal ─────────────────────────────────────────────────
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [weight, setWeight] = useState("5");
  const [reps, setReps] = useState("10");

  // ─── Exercise detail from API ──────────────────────────────────
  const [exerciseDetail, setExerciseDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ─── XP popup ─────────────────────────────────────────────────
  const [xpPopup, setXpPopup] = useState(null);
  const [loggingSet, setLoggingSet] = useState(false);

  // ─── YT ────────────────────────────────────────────────────────
  const [playVideo, setPlayVideo] = useState(false);

  // ─── Fetch exercise detail ─────────────────────────────────────
  const fetchDetail = async (id) => {
    setDetailLoading(true);
    try {
      const response = await getFittbotExerciseDetailAPI(muscleGroup, id, type);
      if (response?.status === 200) {
        setExerciseDetail(response.data);
        // Pre-populate sets from today's logged data
        if (response.data?.logged?.length) {
          const preloaded = response.data.logged.map((s, idx) => ({
            id: s.set_id ?? `logged-${idx}`,
            setNumber: s.set_number,
            duration: s.duration ?? 0,
            reps: s.reps ?? 0,
            weight: s.weight ?? 0,
            calories: s.calories ?? 0,
          }));
          setSets(preloaded);
        }
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: "Error fetching exercise details",
        });
      }
    } catch {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (exerciseId && muscleGroup) fetchDetail(exerciseId);
  }, [exerciseId, muscleGroup]);

  // ─── Back destination ──────────────────────────────────────────
  const backDestination = "/client/(workout)/allexercises";

  const handleBack = () => {
    router.replace({
      pathname: backDestination,
      params: { type, muscleGroup },
    });
  };

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.replace({
          pathname: backDestination,
          params: { type, muscleGroup },
        });
        return true;
      };
      const handler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );
      return () => handler.remove();
    }, [type, muscleGroup]),
  );

  // ─── AppState: persist timer through screen off ─────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextState) => {
        if (
          appStateRef.current === "active" &&
          nextState.match(/inactive|background/) &&
          isRunningRef.current
        ) {
          await AsyncStorage.setItem(BG_TIME_KEY, Date.now().toString());
        } else if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === "active" &&
          isRunningRef.current
        ) {
          const saved = await AsyncStorage.getItem(BG_TIME_KEY);
          if (saved) {
            const elapsed = Math.floor(
              (Date.now() - parseInt(saved, 10)) / 1000,
            );
            setTimer((prev) => prev + elapsed);
          }
        }
        appStateRef.current = nextState;
      },
    );
    return () => subscription.remove();
  }, []);

  // ─── Timer tick ────────────────────────────────────────────────
  useEffect(() => {
    if (timerRunning && !timerPaused) {
      isRunningRef.current = true;
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      isRunningRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerRunning, timerPaused]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleStart = () => {
    setTimer(0);
    setTimerRunning(true);
    setTimerPaused(false);
  };

  const handlePause = () => {
    setTimerPaused((prev) => !prev);
  };

  const handleStop = () => {
    setTimerRunning(false);
    setTimerPaused(false);
    const exType = exerciseDetail?.type ?? type;
    if (exType === "cardio") {
      handleLogSet(true);
    } else {
      setLogModalVisible(true);
    }
  };

  const calculateCalories = (met, duration, bodyWeight) => {
    return Math.round(met * bodyWeight * (duration / 3600) * 100) / 100;
  };

  const handleLogSet = async (isCardioAutoLog = false) => {
    if (loggingSet) return;
    const exType = exerciseDetail?.type ?? type;

    if (!isCardioAutoLog) {
      const isStrength = exType === "strength";
      const isNonCardio = exType !== "cardio";

      const parsedReps = parseInt(String(reps).trim(), 10);
      const parsedWeight = parseFloat(String(weight).trim());

      if (isNonCardio) {
        if (!String(reps).trim() || isNaN(parsedReps) || parsedReps <= 0) {
          Alert.alert("Invalid Value", "Reps must be greater than 0.");
          return;
        }
      }
      if (isStrength) {
        if (
          !String(weight).trim() ||
          isNaN(parsedWeight) ||
          parsedWeight <= 0
        ) {
          Alert.alert("Invalid Value", "Weight must be greater than 0.");
          return;
        }
      }
    }

    setLoggingSet(true);

    const duration = timer;
    const calories = calculateCalories(8, duration, 70);

    const logReps = exType === "cardio" ? 0 : parseInt(reps, 10) || 0;
    const logWeight = exType === "strength" ? parseFloat(weight) || 0 : 0;

    const newSet = {
      id: Date.now().toString(),
      setNumber: sets.length + 1,
      duration,
      reps: logReps,
      weight: logWeight,
      calories,
    };
    setSets((prev) => [...prev, newSet]);
    setTimer(0);
    setLogModalVisible(false);

    const group = muscleGroup || "General";
    const payload = {
      workout_details: [
        {
          [group]: [
            {
              name: exerciseName || exerciseDetail?.name || "Exercise",
              sets: [
                {
                  setNumber: newSet.setNumber,
                  reps: logReps,
                  weight: logWeight,
                  calories,
                  duration,
                },
              ],
            },
          ],
        },
      ],
      workout_time: parseFloat((duration / 60).toFixed(2)),
    };

    try {
      const res = await logWorkoutSetAPI(payload);

      if (res?.set_id) {
        setSets((prev) =>
          prev.map((s) => (s.id === newSet.id ? { ...s, id: res.set_id } : s)),
        );
      }
      const xpEarned = res?.xp_earned ?? 0;
      if (xpEarned > 0) {
        setXpPopup({ key: Date.now(), xp: xpEarned });
      } else {
        setLoggingSet(false);
      }
    } catch {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to log set. Please try again.",
      });
      setLoggingSet(false);
    }
  };

  // ─── Skip: go back to allexercises ─────────────────────────────
  const handleSkip = () => {
    router.replace({
      pathname: backDestination,
      params: { type, muscleGroup },
    });
  };

  // ─── Next: call API with id+1 ──────────────────────────────────
  const handleNext = () => {
    const nextId = Number(exerciseDetail?.id ?? exerciseId) + 1;
    setExerciseDetail(null);
    setSets([]);
    setTimer(0);
    setTimerRunning(false);
    setTimerPaused(false);
    router.replace({
      pathname: "/client/(workout)/oneexercise",
      params: {
        type,
        exerciseId: nextId,
        muscleGroup,
      },
    });
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}.${s.toString().padStart(2, "0")}`;
  };

  if (detailLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.loaderContainer,
          { paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {exerciseDetail?.name ?? exerciseName ?? "Exercise"}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 50, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* YouTube Frame */}
        <View style={styles.ytContainer}>
          <YoutubeIframe
            videoId={exerciseDetail?.gif ?? ""}
            height={isTablet ? 220 : 200}
            width="100%"
            play={playVideo}
            forceAndroidAutoplay={true}
            mute={true}
            onChangeState={(event) => {
              if (event === "ended") setPlayVideo(false);
            }}
            webViewStyle={{ width: "100%", height: "100%" }}
            webViewProps={{ androidLayerType: "hardware" }}
            viewContainerStyle={{
              width: "100%",
              height: isTablet ? 220 : 200,
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: "#000",
            }}
            initialPlayerParams={{
              controls: true,
              modestbranding: true,
              preventFullScreen: false,
            }}
          />
        </View>

        {/* Exercise card — matches ExerciseCard.jsx expanded state */}
        <View style={styles.cardContainer}>
          <View style={styles.expandedBackground}>
            {/* Top row: mirrors ExerciseCard cardTouchable exactly */}
            <View style={styles.cardTopRow}>
              <View style={styles.ecCardHeader}>
                {/* Title + muscle group */}
                <View style={styles.ecTitleContainer}>
                  <View>
                    <Text style={styles.ecExerciseName} numberOfLines={1}>
                      {exerciseDetail?.name ?? exerciseName ?? "Exercise"}
                    </Text>
                    <Text style={styles.ecMuscleGroupText} numberOfLines={1}>
                      {muscleGroup ? `${muscleGroup} Exercises` : ""}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* expandedContent: setsDisplayContainer → setsHeaderContainer + set rows */}
            <View style={styles.ecExpandedContent}>
              <View style={styles.ecSetsDisplayContainer}>
                {/* setsHeaderContainer */}
                <View style={styles.ecSetsHeaderContainer}>
                  <View style={styles.ecSetsHeaderRow}>
                    <View style={styles.ecHeaderSetColumn}>
                      <Ionicons name="fitness" size={14} color="#007BFF" />
                      <Text style={styles.ecHeaderText}>Sets</Text>
                    </View>
                    <View style={styles.ecHeaderDataContainer}>
                      {(() => {
                        const exType = exerciseDetail?.type ?? type;
                        const cols = [
                          { icon: "time", label: "Time", isCC: false },
                          ...(exType !== "cardio"
                            ? [{ icon: "repeat", label: "Reps", isCC: false }]
                            : []),
                          { icon: "flame", label: "kcal", isCC: false },
                          ...(exType === "strength"
                            ? [
                                {
                                  icon: "weight-kilogram",
                                  label: "Weight",
                                  isCC: true,
                                },
                              ]
                            : []),
                        ];
                        return cols.map((col) => (
                          <View
                            key={col.label}
                            style={styles.ecHeaderIconContainer}
                          >
                            <View style={styles.ecHeaderIconAndTitle}>
                              {col.isCC ? (
                                <MaterialCommunityIcons
                                  name={col.icon}
                                  size={14}
                                  color="#007BFF"
                                />
                              ) : (
                                <Ionicons
                                  name={col.icon}
                                  size={14}
                                  color="#007BFF"
                                />
                              )}
                              <Text style={styles.ecHeaderText}>
                                {col.label}
                              </Text>
                            </View>
                          </View>
                        ));
                      })()}
                    </View>
                  </View>
                </View>

                {/* set rows */}
                {sets.length === 0 ? (
                  <View style={styles.ecNoSetsContainer}>
                    <Text style={styles.ecNoSetsText}>No sets recorded</Text>
                  </View>
                ) : (
                  sets.map((item, idx) => (
                    <View key={item.id} style={styles.ecNewSetItem}>
                      <TouchableOpacity
                        style={styles.ecDeleteSetButton}
                        onPress={() => {
                          Alert.alert(
                            "Delete Set",
                            "Are you sure you want to delete this set?",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete",
                                style: "destructive",
                                onPress: async () => {
                                  try {
                                    const res = await removeWorkoutSetAPI(
                                      item.id,
                                    );
                                    if (res?.status === 200) {
                                      setSets((prev) =>
                                        prev.filter((s) => s.id !== item.id),
                                      );
                                      showToast({
                                        type: "success",
                                        title: "Deleted",
                                        desc: "Set removed successfully",
                                      });
                                    } else {
                                      showToast({
                                        type: "error",
                                        title: "Error",
                                        desc:
                                          res?.message ||
                                          "Failed to delete set",
                                      });
                                    }
                                  } catch {
                                    showToast({
                                      type: "error",
                                      title: "Error",
                                      desc: "Failed to delete set. Please try again.",
                                    });
                                  }
                                },
                              },
                            ],
                          );
                        }}
                      >
                        <Ionicons name="trash" size={16} color="#FF6B6B" />
                      </TouchableOpacity>
                      <View style={styles.ecSetRowContent}>
                        <View style={styles.ecSetNumberContainer}>
                          <View style={styles.ecSetNumberCircle}>
                            <Text style={styles.ecSetNumber}>{idx + 1}</Text>
                          </View>
                        </View>
                        <View style={styles.ecSetDataContainer}>
                          {/* Time — always shown */}
                          <View style={styles.ecSetDataColumn}>
                            <Text style={styles.ecSetDataValue}>
                              {formatDuration(item.duration)}
                              <Text style={styles.ecSetDataLabel}>
                                &nbsp;min
                              </Text>
                            </Text>
                          </View>
                          {/* Reps — strength & body_weight */}
                          {(exerciseDetail?.type ?? type) !== "cardio" && (
                            <View style={styles.ecSetDataColumn}>
                              <Text style={styles.ecSetDataValue}>
                                {item.reps}
                              </Text>
                            </View>
                          )}
                          {/* Calories — always shown */}
                          <View style={styles.ecSetDataColumn}>
                            <Text style={styles.ecSetDataValue}>
                              {item.calories}
                            </Text>
                          </View>
                          {/* Weight — strength only */}
                          {(exerciseDetail?.type ?? type) === "strength" && (
                            <View style={styles.ecSetDataColumn}>
                              <Text
                                style={[
                                  styles.ecSetDataValue,
                                  { marginLeft: -15 },
                                ]}
                              >
                                {item.weight}
                                <Text style={styles.ecSetDataLabel}>kg</Text>
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  ))
                )}

                {/* Add Set */}
                {sets.length > 0 && (
                  <TouchableOpacity
                    style={styles.addSetBtn}
                    onPress={handleStart}
                  >
                    <Ionicons name="add-circle" size={16} color="#007BFF" />
                    <Text style={styles.addSetText}>Add Set</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Next exercise hint */}
        {sets.length > 0 && exerciseDetail?.next_exercise && (
          <Text style={styles.nextExerciseHint}>
            Next: {exerciseDetail.next_exercise}
          </Text>
        )}

        {/* Timer section */}
        <View style={styles.timerSection}>
          {/* XP Popup — above timer */}
          <View
            style={{
              position: "relative",
              alignItems: "center",
              height: 0,
              overflow: "visible",
              zIndex: 9999,
            }}
          >
            {xpPopup && (
              <XPPopup
                key={xpPopup.key}
                xp={xpPopup.xp}
                onDone={() => {
                  setXpPopup(null);
                  setLoggingSet(false);
                }}
              />
            )}
          </View>
          {/* Circular timer */}
          <View style={styles.timerCircleOuter}>
            <View style={styles.timerCircleInner}>
              {!timerRunning ? (
                <TouchableOpacity
                  style={styles.timerStartHitArea}
                  onPress={handleStart}
                >
                  <Text style={styles.timerDisplayStatic}>Start</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.timerDisplayWrap}>
                  <Text style={styles.timerDisplayRunning}>
                    {timer < 60
                      ? `${String(timer).padStart(2, "0")}s`
                      : formatTime(timer)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Pause / Stop buttons — only when running */}
          {timerRunning && (
            <View style={styles.timerBtnRow}>
              <TouchableOpacity style={styles.pauseBtn} onPress={handlePause}>
                <Ionicons
                  name={timerPaused ? "play" : "pause"}
                  size={18}
                  color="#555"
                />
                <Text style={styles.pauseBtnText}>
                  {timerPaused ? "Resume" : "Pause"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                <View style={styles.stopSquare} />
                <Text style={styles.stopBtnText}>Stop</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Skip / Next row — after at least one set */}
        {sets.length > 0 && (
          <View style={styles.actionRow}>
            {exerciseDetail?.has_next !== false && (
              <TouchableOpacity
                style={[styles.skipBtn, timerRunning && { opacity: 0.4 }]}
                onPress={handleSkip}
                disabled={timerRunning}
              >
                <Ionicons name="arrow-back" size={15} color="#555" />
                <Text style={styles.skipBtnText}>Back to Exercises</Text>
              </TouchableOpacity>
            )}
            {exerciseDetail?.has_next ? (
              <TouchableOpacity
                style={[styles.nextBtn, timerRunning && { opacity: 0.4 }]}
                onPress={handleNext}
                disabled={timerRunning}
              >
                <Text style={styles.nextBtnText}>Next Workout</Text>
                <Ionicons name="arrow-forward" size={15} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.allDoneContainer,
                  timerRunning && { opacity: 0.4 },
                ]}
                onPress={handleSkip}
                disabled={timerRunning}
              >
                <Ionicons name="checkmark-circle" size={18} color="#28A745" />
                <Text style={styles.allDoneText}>
                  All done! View all exercises
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Log Set Modal */}
      <Modal visible={logModalVisible} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setLogModalVisible(false);
          }}
        >
          <KeyboardAvoidingView behavior="padding" style={styles.modalKAV}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Keyboard.dismiss();
              }}
              style={styles.modalSheet}
            >
              <ScrollView
                contentContainerStyle={[
                  styles.modalSheetContent,
                  { paddingBottom: Math.max(insets.bottom + 16, 32) },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Close */}
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setLogModalVisible(false)}
                >
                  <Ionicons name="close" size={22} color="#333" />
                </TouchableOpacity>

                <Text style={styles.modalTitle}>Add details</Text>

                {/* Last time hint */}
                {/* <View style={styles.lastTimeHint}>
                  <Text style={styles.lastTimeText}>
                    Last time: {reps} reps at {weight}kg
                  </Text>
                  <Text style={styles.lastTimeSub}>Try + 1 rep today 🔥</Text>
                </View> */}

                {/* Weight row — strength only */}
                {(exerciseDetail?.type ?? type) === "strength" && (
                  <View style={styles.inputCard}>
                    <Text style={styles.inputCardLabel}>Weight (kg)</Text>
                    <View style={styles.stepperRow}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() =>
                          setWeight((w) =>
                            String(Math.max(0, (parseFloat(w) || 0) - 1)),
                          )
                        }
                      >
                        <Text style={styles.stepperSymbol}>−</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.stepperValue}
                        keyboardType="numeric"
                        value={weight}
                        onChangeText={(v) => setWeight(v)}
                      />
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() =>
                          setWeight((w) => String((parseFloat(w) || 0) + 1))
                        }
                      >
                        <Text style={styles.stepperSymbol}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.quickRow}>
                      {[2.5, 5, 7.5, 10].map((inc) => (
                        <TouchableOpacity
                          key={inc}
                          style={styles.quickChip}
                          onPress={() =>
                            setWeight((w) => String((parseFloat(w) || 0) + inc))
                          }
                        >
                          <Text style={styles.quickChipText}>+{inc}kg</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Reps row — strength & body_weight */}
                {(exerciseDetail?.type ?? type) !== "cardio" && (
                  <View style={styles.inputCard}>
                    <Text style={styles.inputCardLabel}>Reps</Text>
                    <View style={styles.stepperRow}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() =>
                          setReps((r) =>
                            String(Math.max(1, (parseInt(r, 10) || 0) - 1)),
                          )
                        }
                      >
                        <Text style={styles.stepperSymbol}>−</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.stepperValue}
                        keyboardType="numeric"
                        value={reps}
                        onChangeText={(v) => setReps(v)}
                      />
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() =>
                          setReps((r) => String((parseInt(r, 10) || 0) + 1))
                        }
                      >
                        <Text style={styles.stepperSymbol}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.quickRow}>
                      {[5, 8, 10, 12].map((val) => (
                        <TouchableOpacity
                          key={val}
                          style={styles.quickChip}
                          onPress={() => setReps(String(val))}
                        >
                          <Text style={styles.quickChipText}>{val} reps</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Log Set */}
                <TouchableOpacity
                  style={[styles.logSetBtn, loggingSet && { opacity: 0.6 }]}
                  onPress={() => handleLogSet(false)}
                  disabled={loggingSet}
                >
                  <Text style={styles.logSetText}>Log Set</Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  loaderContainer: { justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerButton: { padding: 4, width: 36 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },

  // Scroll
  scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },

  // YouTube
  ytContainer: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },

  // ── Exercise card: mirrors ExerciseCard.jsx expanded state ──────
  cardContainer: {
    borderRadius: rw(3),
    marginBottom: 15,
    overflow: "hidden",
  },
  expandedBackground: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: rw(3),
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.3)",
  },
  // Top row — mirrors ExerciseCard cardTouchable (fixed height)
  cardTopRow: {
    paddingHorizontal: rw(3),
    paddingVertical: rh(1),
    height: isTablet ? rh(12) : rh(8),
    justifyContent: "flex-start",
  },
  ecCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    position: "relative",
  },
  exerciseImageContainer: {
    width: isTablet ? 130 : 80,
    height: isTablet ? 145 : 80,
    borderRadius: rw(2),
    overflow: "hidden",
    position: "relative",
    marginRight: rw(3),
    marginTop: isTablet ? 20 : 10,
  },
  exerciseImage: {
    width: "100%",
    height: "100%",
    borderRadius: rw(2),
    backgroundColor: "#f0f0f0",
  },
  ecTitleContainer: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    paddingTop: isTablet ? 30 : 25,
    paddingRight: isTablet ? rw(2) : 0,
  },
  ecExerciseName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  ecMuscleGroupText: {
    fontSize: 11,
    color: "#656565",
    marginTop: 2,
  },
  // expandedContent
  ecExpandedContent: {
    paddingHorizontal: rw(0),
    paddingBottom: rw(2),
    paddingTop: rh(1),
    zIndex: 2,
  },
  ecSetsDisplayContainer: {
    borderRadius: rw(3),
    padding: rw(3),
    marginTop: rh(1),
    paddingHorizontal: rw(1),
  },
  ecSetsHeaderContainer: {
    marginBottom: rh(1),
  },
  ecSetsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rw(3),
    paddingVertical: rh(0.8),
    backgroundColor: "rgba(255,255,255,1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86bcf542",
    marginBottom: 0,
  },
  ecHeaderSetColumn: {
    width: rw(13),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ecHeaderDataContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: rw(6),
  },
  ecHeaderIconContainer: {
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: rw(1),
  },
  ecHeaderIconAndTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  ecHeaderText: {
    fontWeight: "600",
    color: "#333",
    marginLeft: 1.5,
    textAlign: "center",
    fontSize: 11,
  },
  ecNewSetItem: {
    position: "relative",
    paddingVertical: isTablet ? rh(1.8) : rh(1.2),
    paddingHorizontal: rw(0.5),
    marginBottom: isTablet ? rh(0.8) : rh(0.5),
    backgroundColor: "rgba(255,255,255,1)",
    borderRadius: rw(2),
    borderWidth: 1,
    borderColor: "#86bcf542",
  },
  ecDeleteSetButton: {
    position: "absolute",
    top: rh(1.2),
    right: rw(1.5),
    padding: rw(0.5),
    zIndex: 10,
  },
  ecSetRowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: rw(6),
  },
  ecSetNumberContainer: {
    width: rw(13),
    alignItems: "center",
  },
  ecSetNumberCircle: {
    width: isTablet ? rw(5) : rw(4),
    height: isTablet ? rw(5) : rw(4),
    borderRadius: isTablet ? rw(5) : rw(4),
    backgroundColor: "#007BFF",
    justifyContent: "center",
    alignItems: "center",
  },
  ecSetNumber: {
    color: "white",
    fontSize: 9,
    fontWeight: "bold",
  },
  ecSetDataContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 5,
  },
  ecSetDataColumn: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: rw(1),
  },
  ecSetDataValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  ecSetDataLabel: {
    fontSize: 9,
    color: "#666",
    marginTop: 2,
    textAlign: "center",
  },
  ecNoSetsContainer: {
    alignItems: "center",
    paddingVertical: rh(1),
    borderRadius: rw(3),
    marginTop: rh(1),
  },
  ecNoSetsText: {
    color: "#666",
    fontSize: 14,
    fontStyle: "italic",
  },
  addSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F0F4FF",
    paddingBottom: 0,
  },
  addSetText: { color: "#007BFF", fontWeight: "600", fontSize: 13 },

  nextExerciseHint: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginTop: -8,
  },

  // Timer section
  timerSection: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 20,
  },
  timerCircleOuter: {
    width: 105,
    height: 107,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "#FF5757",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  timerCircleInner: {
    justifyContent: "center",
    alignItems: "center",
  },
  timerStartHitArea: {
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  timerDisplayStatic: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FF5757",
  },
  timerDisplayWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  timerDisplayRunning: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF5757",
    fontVariant: ["tabular-nums"],
  },
  timerBtnRow: {
    flexDirection: "row",
    gap: 26,
  },
  pauseBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F2F2F2",
    gap: 6,
  },
  pauseBtnText: { color: "#555", fontSize: 14, fontWeight: "600" },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#FFF0F0",
    gap: 6,
  },
  stopBtnText: { color: "#FF3B30", fontSize: 14, fontWeight: "600" },
  stopSquare: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: "#FF3B30",
  },

  // Skip / Next row
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  skipBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DDD",
    gap: 6,
  },
  skipBtnText: { color: "#555", fontWeight: "600", fontSize: 14 },
  allDoneContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#F0FFF4",
    borderWidth: 1.5,
    borderColor: "#28A745",
    gap: 8,
  },
  allDoneText: { color: "#28A745", fontWeight: "700", fontSize: 14 },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#007BFF",
    gap: 6,
  },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalKAV: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.88,
  },
  modalSheetContent: {
    padding: 24,
  },
  modalClose: { alignSelf: "flex-end", padding: 4, marginBottom: 4 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  lastTimeHint: {
    backgroundColor: "#FFF5F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE0D0",
  },
  lastTimeText: { fontSize: 13, color: "#333", fontWeight: "500" },
  lastTimeSub: { fontSize: 12, color: "#FF5722", marginTop: 2 },
  inputCard: {
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  inputCardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 10,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F0FE",
    justifyContent: "center",
    alignItems: "center",
  },
  stepperSymbol: { fontSize: 20, color: "#007BFF", fontWeight: "600" },
  stepperValue: {
    width: 70,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    borderBottomWidth: 1.5,
    borderBottomColor: "#DDD",
    paddingBottom: 2,
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    justifyContent: "center",
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#C8DCFF",
  },
  quickChipText: { fontSize: 13, color: "#007BFF", fontWeight: "500" },
  autoAdvanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  autoAdvanceLabel: { fontSize: 14, color: "#333" },
  toggleOn: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#007BFF",
    justifyContent: "center",
    paddingHorizontal: 3,
    alignItems: "flex-end",
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
  },
  logSetBtn: {
    backgroundColor: "#007BFF",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  logSetText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
