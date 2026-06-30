import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  Keyboard,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Modal,
  TextInput,
} from "react-native";
import {
  getWaterStatusAPI,
  addWaterAPI,
  setWaterTargetAPI,
  createReminderAPI,
  deleteRemindersAPI,
} from "../../../services/clientApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChatModal } from "./reminder";
import { showToast } from "../../../utils/Toaster";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import SkeletonHome from "./skeletonHome";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAX_WATER_GOAL_ML = 5000;

// Helper: create arc path for SVG circle progress
const createCircularArc = (percentage, radius = 28) => {
  const safe = Math.min(
    Math.max(isNaN(percentage) ? 0 : percentage, 0),
    0.9999999,
  );
  if (safe === 0) return "";
  const cx = 35,
    cy = 35;
  const startAngle = -90;
  const endAngle = startAngle + safe * 360;
  const sx = cx + radius * Math.cos((startAngle * Math.PI) / 180);
  const sy = cy + radius * Math.sin((startAngle * Math.PI) / 180);
  const ex = cx + radius * Math.cos((endAngle * Math.PI) / 180);
  const ey = cy + radius * Math.sin((endAngle * Math.PI) / 180);
  if (safe >= 1) {
    const mx = cx + radius;
    const my = cy;
    return `M ${sx} ${sy} A ${radius} ${radius} 0 0 1 ${mx} ${my} A ${radius} ${radius} 0 0 1 ${sx} ${sy}`;
  }
  const largeArc = safe > 0.5 ? 1 : 0;
  return `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArc} 1 ${ex} ${ey}`;
};

// Single streak circle
const StreakCircle = ({ day, percentage, color, isToday }) => {
  const pct = percentage / 100;
  const displayPct = `${Math.round(percentage)}%`;
  return (
    <View style={streakStyles.circleItem}>
      <Svg width="70" height="70" viewBox="0 0 70 70">
        <Circle
          cx="35"
          cy="35"
          r="28"
          stroke="#E5E5E5"
          strokeWidth="5"
          fill="none"
        />
        <Path
          d={createCircularArc(pct, 28)}
          stroke={color}
          strokeLinecap="round"
          strokeWidth="5"
          fill="none"
        />
        <SvgText
          x="35"
          y="40"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill={isToday ? "#2196F3" : "#333"}
        >
          {displayPct}
        </SvgText>
      </Svg>
      <Text style={[streakStyles.dayLabel, isToday && streakStyles.todayLabel]}>
        {day}
      </Text>
    </View>
  );
};

const StreakConnector = () => <View style={streakStyles.connector} />;

const streakStyles = StyleSheet.create({
  circleItem: { alignItems: "center" },
  connector: {
    width: 16,
    height: 5,
    borderRadius: 2,
    backgroundColor: "#E5E5E5",
    marginBottom: 18, // offset to align with circle center (label is ~18px below)
  },
  dayLabel: { fontSize: 11, color: "#888", marginTop: 2 },
  todayLabel: { color: "#2196F3", fontWeight: "700" },
});

// ---- PROGRESS BAR WITH SCALE ----
const WaterProgressBar = ({ current, target }) => {
  const BAR_H = 14;
  const PADDING = 20; // px each side
  const barWidth = SCREEN_WIDTH - PADDING * 2;

  const progress = Math.min(current / (target || 1), 1);

  // Scale labels: 0ml, then evenly spaced up to target
  // Use nice divisions: 4 divisions = 5 labels
  const divisions = 4;
  const scaleLabels = Array.from({ length: divisions + 1 }, (_, i) => {
    const ml = Math.round((target / divisions) * i);
    return ml >= 1000
      ? `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)}L`
      : `${ml}ml`;
  });

  // Status text above progress
  const pct = progress * 100;
  let statusText = "Start Hydrating";
  let statusColor = "#888";
  if (pct >= 100) {
    statusText = "Fully Hydrated! 🎉";
    statusColor = "#2196F3";
  } else if (pct >= 75) {
    statusText = "Almost Hydrated";
    statusColor = "#26C6DA";
  } else if (pct >= 50) {
    statusText = "Halfway There";
    statusColor = "#FFC107";
  } else if (pct > 0) {
    statusText = "Keep Drinking";
    statusColor = "#FF9F43";
  }

  return (
    <View style={{ paddingHorizontal: PADDING, marginTop: 0 }}>
      <Text
        style={{
          color: statusColor,
          fontSize: 13,
          fontWeight: "600",
          textAlign: "center",
          marginBottom: 10,
        }}
      >
        {statusText}
      </Text>

      {/* Bar */}
      <View
        style={{
          height: BAR_H,
          borderRadius: BAR_H / 2,
          backgroundColor: "#E5F0FF",
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={
            pct < 50
              ? ["#FF4444", "#FF6B6B"]
              : pct < 75
                ? ["#FF9F43", "#FFC107"]
                : ["#26C6DA", "#1565C0"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            borderRadius: BAR_H / 2,
          }}
        />
      </View>

      {/* Tick marks */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        {scaleLabels.map((label, i) => (
          <View key={i} style={{ alignItems: "center" }}>
            <View
              style={{ width: 1, height: 10, backgroundColor: "#BBBBBB" }}
            />
            <Text style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

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
        alignSelf: "center",
        top: -36,
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

// ---- MAIN COMPONENT ----
const WaterTracker = () => {
  const [loading, setLoading] = useState(true);
  const [currentWaterIntake, setCurrentWaterIntake] = useState(0);
  const [targetWater, setTargetWater] = useState(3500);
  const [modalVisible, setModalVisible] = useState(false);
  const [newGoalML, setNewGoalML] = useState("");
  const [inputError, setInputError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [lastDrinkTime, setLastDrinkTime] = useState(null);
  const [streakData, setStreakData] = useState([]);
  const [achievementModalVisible, setAchievementModalVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [activeReminder, setActiveReminder] = useState(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [xpPopup, setXpPopup] = useState(null); // { key, xp }
  const [addingWater, setAddingWater] = useState(false);
  const fillAnimation = useRef(new Animated.Value(0)).current;

  // Bell shake animation (alarm-style)
  const bellShakeAnim = useRef(new Animated.Value(0)).current;
  const bellShakeRef = useRef(null);

  // "Set water reminder" label animation
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const labelTranslateX = useRef(new Animated.Value(30)).current;
  const labelAnimRef = useRef(null);

  const presetValues = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];

  const handleAddWater = async () => {
    if (addingWater) return;
    if (currentWaterIntake >= targetWater) {
      showToast({
        type: "error",
        title: "Goal Already Achieved",
        desc: "You've already reached your daily water goal!",
      });
      return;
    }

    setAddingWater(true);

    // Optimistic update
    const added = Math.min(250, targetWater - currentWaterIntake);
    const newIntake = currentWaterIntake + added;
    setCurrentWaterIntake(newIntake);
    setLastDrinkTime("Just now");
    if (newIntake >= targetWater) {
      setAchievementModalVisible(true);
      setTimeout(() => setAchievementModalVisible(false), 3000);
    }

    try {
      const response = await addWaterAPI();
      if (response?.status === 200) {
        const xpEarned = response?.xp_earned ?? 0;
        if (xpEarned > 0) {
          setXpPopup({ key: Date.now(), xp: xpEarned });
        } else {
          setAddingWater(false);
        }

        loadData();
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.message || "Something went wrong",
        });
        setCurrentWaterIntake(currentWaterIntake);
        setAddingWater(false);
      }
    } catch {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong",
      });
      setCurrentWaterIntake(currentWaterIntake);
      setAddingWater(false);
    }
  };

  const loadData = async () => {
    try {
      const response = await getWaterStatusAPI();

      if (response?.status === 200) {
        const { water_intake, last_drink_time, streak, reminder } =
          response.data;

        setCurrentWaterIntake(water_intake.actual * 1000);
        setTargetWater(water_intake.target * 1000);
        setLastDrinkTime(last_drink_time);
        setStreakData(streak ?? []);
        setActiveReminder(reminder ?? null);
      }
    } catch {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Bell shake + label animations with proper unmount cleanup
  useEffect(() => {
    let mounted = true;

    // Repeating bell shake
    const shake = () => {
      if (!mounted) return;
      bellShakeAnim.setValue(0);
      bellShakeRef.current = Animated.sequence([
        Animated.timing(bellShakeAnim, {
          toValue: 1,
          duration: 80,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(bellShakeAnim, {
          toValue: -1,
          duration: 80,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(bellShakeAnim, {
          toValue: 1,
          duration: 80,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(bellShakeAnim, {
          toValue: -1,
          duration: 80,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(bellShakeAnim, {
          toValue: 1,
          duration: 60,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(bellShakeAnim, {
          toValue: -1,
          duration: 60,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(bellShakeAnim, {
          toValue: 0,
          duration: 60,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(800),
      ]);
      bellShakeRef.current.start(({ finished }) => {
        if (finished && mounted) shake();
      });
    };
    shake();

    // One-time label slide
    labelAnimRef.current = Animated.sequence([
      Animated.parallel([
        Animated.timing(labelTranslateX, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(labelOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(2500),
      Animated.parallel([
        Animated.timing(labelTranslateX, {
          toValue: 30,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(labelOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]);
    labelAnimRef.current.start();

    return () => {
      mounted = false;
      bellShakeRef.current?.stop();
      labelAnimRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (currentWaterIntake !== null && targetWater) {
      const pct = Math.min(currentWaterIntake / targetWater, 1);
      Animated.timing(fillAnimation, {
        toValue: pct,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [currentWaterIntake, targetWater]);

  const updateWaterGoal = async () => {
    if (!newGoalML || isNaN(parseInt(newGoalML))) {
      setInputError("Please enter a valid number");
      return;
    }
    const value = parseInt(newGoalML);
    if (value > MAX_WATER_GOAL_ML) {
      setInputError(`Maximum goal is ${MAX_WATER_GOAL_ML}ml`);
      return;
    }
    if (value <= 0) {
      setInputError("Goal must be greater than 0");
      return;
    }
    setSubmitting(true);
    try {
      const floatValue = parseFloat((value / 1000).toFixed(2));
      const response = await setWaterTargetAPI(floatValue);
      if (response?.status === 200) {
        setTargetWater(value);
        setModalVisible(false);
      } else {
        setInputError(response?.message || "Failed to update goal.");
        return;
      }
    } catch {
      alert("Failed to update goal.");
    } finally {
      setSubmitting(false);
      setNewGoalML("");
      setInputError("");
      setSelectedPreset(null);
    }
  };

  const validateGoalInput = (text) => {
    setNewGoalML(text);
    if (!text) {
      setInputError("");
      return;
    }
    const value = parseInt(text);
    if (isNaN(value)) setInputError("Please enter a valid number");
    else if (value > MAX_WATER_GOAL_ML)
      setInputError(`Maximum goal is ${MAX_WATER_GOAL_ML}ml`);
    else if (value <= 0) setInputError("Goal must be greater than 0");
    else setInputError("");
  };

  const isGoalInputValid =
    newGoalML &&
    !isNaN(parseInt(newGoalML)) &&
    parseInt(newGoalML) <= MAX_WATER_GOAL_ML &&
    parseInt(newGoalML) > 0;

  const handleAddReminder = async (newReminder) => {
    try {
      const payload = {
        ...newReminder,
        is_recurring: newReminder.is_recurring === "daily",
      };
      const response = await createReminderAPI(payload);
      if (response?.status === 200) {
        setReminderModalVisible(false);
        await loadData();
        showToast({
          type: "success",
          title: "Reminder Set",
          desc: "Water reminder created!",
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.message || "Failed to create reminder",
        });
      }
    } catch {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong",
      });
    }
  };

  const handleDeleteReminder = async (id) => {
    try {
      const response = await deleteRemindersAPI(id);
      if (response?.status === 200) {
        setActiveReminder(null);
        showToast({
          type: "success",
          title: "Deleted",
          desc: "Water reminder removed",
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to delete reminder",
        });
      }
    } catch {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong",
      });
    }
  };

  const lastDrinkText = lastDrinkTime ?? null;

  if (loading) return <SkeletonHome type="water" header={false} />;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Water Glass Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require("../../../assets/images/water/water.webp")}
            style={styles.waterImage}
            contentFit="contain"
          />
        </View>

        {/* Progress Bar + Scale */}
        <WaterProgressBar current={currentWaterIntake} target={targetWater} />

        {/* Add 250ml Button */}
        <View
          style={{
            position: "relative",
            alignItems: "center",
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
                setAddingWater(false);
              }}
            />
          )}
          <TouchableOpacity
            onPress={handleAddWater}
            activeOpacity={0.85}
            disabled={addingWater}
            style={[styles.addButtonWrapper, addingWater && { opacity: 0.6 }]}
          >
            <LinearGradient
              colors={["#26C6DA", "#1565C0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButton}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add 250 ml</Text>
              <View style={styles.glassTag}>
                <Image
                  source={require("../../../assets/images/water/full_glass.png")}
                  width={16}
                  height={16}
                />
                <Text style={styles.glassTagText}>1 Glass</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Last drink */}
        {lastDrinkText && (
          <View style={styles.lastDrinkRow}>
            <Ionicons name="time-outline" size={14} color="#888" />
            <Text style={styles.lastDrinkText}>
              Last Drink:{" "}
              <Text style={{ color: "#1565C0", fontWeight: "600" }}>
                {lastDrinkText}
              </Text>
            </Text>
          </View>
        )}

        {/* Goal Row */}
        <View style={styles.goalRow}>
          <View style={styles.goalCard}>
            <Text style={styles.goalValue}>{targetWater} ml</Text>
            <Text style={styles.goalLabel}>Daily Goal</Text>
          </View>
          <TouchableOpacity
            style={styles.setGoalCard}
            onPress={() => setModalVisible(true)}
          >
            <Feather name="edit" size={16} color="#1A95F1" />
            <Text style={styles.setGoalText}>Set Daily Goal</Text>
          </TouchableOpacity>
        </View>

        {/* Streak Section */}
        <View style={styles.streakSection}>
          <View style={styles.streakHeader}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakTitle}>Last 7 Days Streak</Text>
            <View style={styles.bellWithLabel}>
              <Animated.View
                style={[
                  styles.reminderLabel,
                  {
                    opacity: labelOpacity,
                    transform: [{ translateX: labelTranslateX }],
                  },
                ]}
                pointerEvents="none"
              >
                <Text style={styles.reminderLabelText}>Set water reminder</Text>
              </Animated.View>
              <TouchableOpacity
                style={styles.streakBellBtn}
                activeOpacity={0.85}
                onPress={() => setReminderModalVisible(true)}
              >
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: bellShakeAnim.interpolate({
                          inputRange: [-1, 0, 1],
                          outputRange: ["-18deg", "0deg", "18deg"],
                        }),
                      },
                    ],
                  }}
                >
                  <Ionicons name="notifications" size={26} color="#1A95F1" />
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.streakScroll}
          >
            {streakData.map((item, i) => (
              <React.Fragment key={i}>
                <StreakCircle
                  day={item.day}
                  percentage={item.percentage}
                  isToday={item.day === "Today"}
                  color={
                    item.day === "Today"
                      ? "#2196F3"
                      : item.percentage >= 100
                        ? "#26C6DA"
                        : item.percentage > 0
                          ? "#FF9F43"
                          : "#ccc"
                  }
                />
                {i < streakData.length - 1 && <StreakConnector />}
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
        {/* Active Water Reminder */}
        {activeReminder?.is_enabled && (
          <View style={styles.reminderCard}>
            <View style={styles.reminderCardLeft}>
              <Ionicons name="notifications" size={18} color="#1A95F1" />
              <View style={{ flex: 1 }}>
                <Text style={styles.reminderCardTitle}>Water Reminder</Text>
                <Text style={styles.reminderCardDetail}>
                  Every{" "}
                  {activeReminder.water_timing === 0.5
                    ? "30 mins"
                    : `${activeReminder.water_timing} hr${activeReminder.water_timing > 1 ? "s" : ""}`}
                  {" · "}
                  {activeReminder.intimation_start_time} –{" "}
                  {activeReminder.intimation_end_time}
                </Text>
                <Text style={styles.reminderCardFreq}>
                  {activeReminder.is_recurring ? "Every day" : "Today only"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setDeleteConfirmVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#FF5757" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Water Reminder Modal */}
      <ChatModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
        onAdd={handleAddReminder}
        initialReminderType="water"
      />

      {/* Goal Setting Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setNewGoalML("");
          setInputError("");
          setSelectedPreset(null);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontSize: 20, marginRight: 8 }}>🥤</Text>
                    <Text style={styles.modalTitle}>Set Daily Water Goal</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setModalVisible(false);
                      setNewGoalML("");
                      setInputError("");
                      setSelectedPreset(null);
                    }}
                  >
                    <Ionicons name="close" size={18} color="#666" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitle}>
                  Enter target amount in milliliters (ml)
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.modalInput,
                      inputError ? styles.inputError : null,
                    ]}
                    keyboardType="numeric"
                    placeholder=""
                    value={newGoalML}
                    onChangeText={(t) => {
                      validateGoalInput(t);
                      setSelectedPreset(null);
                    }}
                  />
                  <Text style={styles.inputUnit}>ml</Text>
                </View>
                <Text style={styles.modalLimit}>
                  Maximum: {MAX_WATER_GOAL_ML}ml
                </Text>
                {inputError ? (
                  <Text style={styles.errorText}>{inputError}</Text>
                ) : null}
                <View style={styles.presetSection}>
                  <Text style={styles.presetLabel}>Quick Select:</Text>
                  <View style={styles.presetGrid}>
                    {presetValues.map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.presetButton,
                          (selectedPreset === val ||
                            parseInt(newGoalML) === val) &&
                            styles.presetButtonActive,
                        ]}
                        onPress={() => {
                          setSelectedPreset(val);
                          validateGoalInput(val.toString());
                        }}
                      >
                        {selectedPreset === val ||
                        parseInt(newGoalML) === val ? (
                          <LinearGradient
                            colors={["#26C6DA", "#1565C0"]}
                            style={styles.presetBtnGradient}
                          >
                            <Text style={styles.presetTextActive}>
                              {val} ml
                            </Text>
                          </LinearGradient>
                        ) : (
                          <Text style={styles.presetText}>{val} ml</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (!isGoalInputValid || submitting) &&
                      styles.submitBtnDisabled,
                  ]}
                  onPress={updateWaterGoal}
                  disabled={!isGoalInputValid || submitting}
                >
                  {isGoalInputValid && !submitting ? (
                    <LinearGradient
                      colors={["#26C6DA", "#1565C0"]}
                      style={styles.submitBtnGradient}
                    >
                      <Text style={styles.submitBtnText}>Set Goal</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.submitBtnTextDisabled}>
                      {submitting ? "Updating..." : "Set Goal"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Reminder Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={deleteConfirmVisible}
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeleteConfirmVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { padding: 24, maxWidth: 320 }]}>
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <Ionicons name="trash-outline" size={32} color="#FF5757" />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#1A1A1A",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                Delete Reminder?
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#666",
                  textAlign: "center",
                  marginBottom: 20,
                }}
              >
                Are you sure you want to delete this water reminder?
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#E0E0E0",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onPress={() => setDeleteConfirmVisible(false)}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: "#666" }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: "#FF5757",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onPress={() => {
                    setDeleteConfirmVisible(false);
                    handleDeleteReminder(activeReminder?.id);
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Achievement Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={achievementModalVisible}
        onRequestClose={() => setAchievementModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.achievementOverlay}
          activeOpacity={1}
          onPress={() => setAchievementModalVisible(false)}
        >
          <View style={styles.achievementContent}>
            <Text style={{ fontSize: 48 }}>💧</Text>
            <Text style={styles.achievementTitle}>Hydration Achieved!</Text>
            <Text style={styles.achievementSub}>
              Today you've drunk{" "}
              <Text style={{ color: "#1565C0", fontWeight: "700" }}>
                {targetWater}
              </Text>{" "}
              ml of water.
            </Text>
            <Text style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
              Stay hydrated and feel amazing!
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingBottom: 40 },

  imageContainer: { alignItems: "center", marginTop: 20, marginBottom: 4 },
  waterImage: { width: 290, height: 245 },

  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
    marginBottom: 0,
    paddingHorizontal: 20,
  },
  goalCard: {
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  goalValue: { fontSize: 16, fontWeight: "800", color: "#1A95F1" },
  goalLabel: { fontSize: 11, color: "#888", marginTop: 2 },
  setGoalCard: {
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  setGoalText: { fontSize: 11, color: "#000000", fontWeight: "600" },

  addButtonWrapper: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 14,
    overflow: "hidden",
    width: "70%",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
  },
  addButtonText: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "700" },
  glassTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  glassTagText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  lastDrinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 2,
  },
  lastDrinkText: { fontSize: 12, color: "#888" },

  streakSection: { marginTop: 22, paddingHorizontal: 20 },
  streakHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 4,
  },
  streakFire: { fontSize: 18 },
  streakTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  streakScroll: { paddingBottom: 6, alignItems: "center" },
  bellWithLabel: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
  },
  reminderLabel: {
    backgroundColor: "#1A95F1",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
  },
  reminderLabelText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  streakBellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF6FF",
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  modalSubtitle: { fontSize: 12, color: "#666", marginBottom: 12 },
  inputContainer: { position: "relative", marginBottom: 8 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    paddingRight: 40,
    fontSize: 16,
    backgroundColor: "#F8F9FA",
  },
  inputUnit: {
    position: "absolute",
    right: 15,
    top: 12,
    color: "#999",
    fontSize: 16,
  },
  modalLimit: { fontSize: 10, color: "#1565C0", marginBottom: 10 },
  inputError: { borderColor: "#FF5757" },
  errorText: { color: "#FF5757", fontSize: 12, marginTop: 4, marginBottom: 12 },
  presetSection: { marginBottom: 20 },
  presetLabel: {
    fontSize: 13,
    color: "#333",
    marginBottom: 10,
    fontWeight: "500",
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  presetButton: {
    width: "45%",
    height: 35,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  presetButtonActive: { backgroundColor: "transparent" },
  presetBtnGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  presetText: { color: "#666", fontSize: 12, fontWeight: "500" },
  presetTextActive: { color: "#fff", fontSize: 12, fontWeight: "600" },
  submitBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E0E0E0",
  },
  submitBtnDisabled: { backgroundColor: "#E0E0E0" },
  submitBtnGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  submitBtnTextDisabled: { color: "#999", fontSize: 16, fontWeight: "600" },

  achievementOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  achievementContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    width: "85%",
    alignItems: "center",
    elevation: 5,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1565C0",
    marginTop: 10,
    marginBottom: 8,
  },
  achievementSub: { fontSize: 13, color: "#333", textAlign: "center" },

  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#EEF6FF",
    borderWidth: 1,
    borderColor: "#C5DFFF",
  },
  reminderCardLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  reminderCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1565C0",
    marginBottom: 2,
  },
  reminderCardDetail: {
    fontSize: 12,
    color: "#444",
    marginBottom: 2,
  },
  reminderCardFreq: {
    fontSize: 11,
    color: "#1A95F1",
    fontWeight: "600",
  },
});

export default WaterTracker;
