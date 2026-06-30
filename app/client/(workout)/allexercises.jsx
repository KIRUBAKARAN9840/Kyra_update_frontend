import { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  LayoutAnimation,
} from "react-native";

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFittbotExercisesAPI } from "../../../services/clientApi";
import { showToast } from "../../../utils/Toaster";

const { width, height } = Dimensions.get("window");
const isTablet = width >= 768;
const rw = (pct) => width * (pct / 100);
const rh = (pct) => height * (pct / 100);

const formatDuration = (secs) => {
  if (!secs) return "0.00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}.${s.toString().padStart(2, "0")}`;
};

// ─── Workout Report Banner ──────────────────────────────────────────
const WorkoutReportBanner = ({ report }) => {
  if (!report) return null;

  const {
    total_time_mins,
    total_calories_burnt,
    exercises_completed,
    exercises_total,
    total_volume,
    volume_change_pct,
  } = report;

  const changePositive = volume_change_pct >= 0;

  return (
    <View style={styles.reportCard}>
      <Text style={styles.reportTitle}>Workout Stats</Text>

      {/* 3 stat columns */}
      <View style={styles.reportStatsRow}>
        {/* Session Time */}
        <View style={styles.reportStatItem}>
          <Image
            source={require("../../../assets/images/clockbig.png")}
            style={styles.reportIcon}
          />
          <Text style={styles.reportStatLabel}>Session Time</Text>
          <Text style={styles.reportStatValue}>
            {total_time_mins != null ? `${total_time_mins} min` : "—"}
          </Text>
        </View>

        {/* Calories Burnt */}
        <View style={styles.reportStatItem}>
          <Image
            source={require("../../../assets/images/caloriesbig.png")}
            style={[styles.reportIcon, { width: 48 }]}
          />
          <Text style={styles.reportStatLabel}>Calories Burnt</Text>
          <Text style={styles.reportStatValue}>
            {total_calories_burnt != null
              ? `${total_calories_burnt} Kcal`
              : "—"}
          </Text>
        </View>

        {/* Exercises Completed */}
        <View style={styles.reportStatItem}>
          <Image
            source={require("../../../assets/images/weightbig.png")}
            style={styles.reportIcon}
          />
          <Text style={styles.reportStatLabel}>Exercises</Text>
          <Text style={styles.reportStatValue}>
            {exercises_completed != null && exercises_total != null
              ? `${exercises_completed}/${exercises_total}`
              : "—"}
          </Text>
        </View>
      </View>

      {/* Volume + change */}
      <View style={styles.reportVolumeRow}>
        <Text style={styles.reportVolumeText}>
          💪 You lifted{" "}
          <Text style={styles.reportVolumeBold}>
            {total_volume != null ? `${total_volume} kg` : "—"}
          </Text>{" "}
          today
        </Text>
        {volume_change_pct != null && (
          <Text
            style={[
              styles.reportChangePct,
              { color: changePositive ? "#28A745" : "#DC3545" },
            ]}
          >
            {changePositive ? "↗" : "↘"} {changePositive ? "+" : ""}
            {volume_change_pct}% {changePositive ? "stronger" : "less"} than
            last session
          </Text>
        )}
      </View>
    </View>
  );
};

// ─── Streak Card ────────────────────────────────────────────────────
const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

const StreakCard = ({ streak }) => {
  if (!streak || streak.length === 0) return null;

  const getDayInitial = (dateString) => {
    const d = new Date(dateString);
    return DAY_INITIALS[d.getDay()];
  };

  const getDayNumber = (dateString) => {
    return new Date(dateString).getDate();
  };

  return (
    <View style={styles.streakCard}>
      <Text style={styles.streakTitle}>7 Days Workout Streak</Text>
      <View style={styles.streakRow}>
        {streak.map((day, idx) => (
          <View key={idx} style={styles.streakDayContainer}>
            <Text style={styles.streakDayInitial}>
              {getDayInitial(day.date)}
            </Text>
            <View
              style={[
                styles.streakCircle,
                { backgroundColor: day.logged ? "#4CAF50" : "#9E9E9E" },
              ]}
            >
              <Text style={styles.streakDayNumber}>
                {getDayNumber(day.date)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Recommendation Card ─────────────────────────────────────────────
const RecommendationCard = ({
  suggestedTomorrow,
  suggestedDayAfter,
  onPress,
}) => {
  if (!suggestedTomorrow && !suggestedDayAfter) return null;

  const Item = ({ label, item }) => {
    if (!item) return null;
    return (
      <TouchableOpacity style={styles.recItem} activeOpacity={0.8}>
        <Image
          source={{ uri: item.image }}
          style={styles.recImage}
          resizeMode="contain"
        />
        <View style={styles.recTextGroup}>
          <Text style={styles.recLabel}>
            Recommended:{" "}
            <Text style={styles.recMuscle}>{item.muscle_group} Workout</Text>
          </Text>
          <Text style={styles.recWhen}>{label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.recCard}>
      <Text style={styles.recTitle}>What's next?</Text>
      <Item label="Tomorrow" item={suggestedTomorrow} />
      {suggestedDayAfter && <View style={styles.recDivider} />}
      <Item label="Day After Tomorrow" item={suggestedDayAfter} />
    </View>
  );
};

// ─── Logged sets card (same design as oneexercise.jsx) ─────────────
const LoggedExerciseCard = ({ item, muscleGroup, onPress }) => {
  const exType = item.type;

  const cols = [
    { icon: "time", label: "Time", isCC: false },
    ...(exType !== "cardio"
      ? [{ icon: "repeat", label: "Reps", isCC: false }]
      : []),
    { icon: "flame", label: "kcal", isCC: false },
    ...(exType === "strength"
      ? [{ icon: "weight-kilogram", label: "Weight", isCC: true }]
      : []),
  ];

  return (
    <TouchableOpacity
      style={styles.expandedBackground}
      onPress={() => onPress(item)}
      activeOpacity={0.9}
    >
      {/* Top row */}
      <View style={styles.cardTopRow}>
        <View style={styles.ecCardHeader}>
          <View style={styles.exerciseImageContainer}>
            <Image
              source={{ uri: item.image }}
              style={styles.exerciseImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.ecTitleContainer}>
            <Text style={styles.ecExerciseName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.ecMuscleGroupText} numberOfLines={1}>
              {muscleGroup ? `${muscleGroup} Exercises` : ""}
            </Text>
          </View>
        </View>
      </View>

      {/* Sets section */}
      <View style={styles.ecExpandedContent}>
        <View style={styles.ecSetsDisplayContainer}>
          {/* Header row */}
          <View style={styles.ecSetsHeaderContainer}>
            <View style={styles.ecSetsHeaderRow}>
              <View style={styles.ecHeaderSetColumn}>
                <Ionicons name="fitness" size={14} color="#007BFF" />
                <Text style={styles.ecHeaderText}>Sets</Text>
              </View>
              <View style={styles.ecHeaderDataContainer}>
                {cols.map((col) => (
                  <View key={col.label} style={styles.ecHeaderIconContainer}>
                    <View style={styles.ecHeaderIconAndTitle}>
                      {col.isCC ? (
                        <MaterialCommunityIcons
                          name={col.icon}
                          size={14}
                          color="#007BFF"
                        />
                      ) : (
                        <Ionicons name={col.icon} size={14} color="#007BFF" />
                      )}
                      <Text style={styles.ecHeaderText}>{col.label}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Set rows */}
          {item.logged.map((set, idx) => (
            <View key={idx} style={styles.ecNewSetItem}>
              <View style={styles.ecSetRowContent}>
                <View style={styles.ecSetNumberContainer}>
                  <View style={styles.ecSetNumberCircle}>
                    <Text style={styles.ecSetNumber}>{idx + 1}</Text>
                  </View>
                </View>
                <View style={styles.ecSetDataContainer}>
                  {/* Time */}
                  <View style={styles.ecSetDataColumn}>
                    <Text style={styles.ecSetDataValue}>
                      {formatDuration(set.duration)}
                      <Text style={styles.ecSetDataLabel}>&nbsp;min</Text>
                    </Text>
                  </View>
                  {/* Reps — strength & body_weight */}
                  {exType !== "cardio" && (
                    <View style={styles.ecSetDataColumn}>
                      <Text style={styles.ecSetDataValue}>{set.reps}</Text>
                    </View>
                  )}
                  {/* Calories */}
                  <View style={styles.ecSetDataColumn}>
                    <Text style={styles.ecSetDataValue}>{set.calories}</Text>
                  </View>
                  {/* Weight — strength only */}
                  {exType === "strength" && (
                    <View style={styles.ecSetDataColumn}>
                      <Text
                        style={[styles.ecSetDataValue, { marginLeft: -15 }]}
                      >
                        {set.weight}
                        <Text style={styles.ecSetDataLabel}>kg</Text>
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Simple card (no logs) ──────────────────────────────────────────
const SimpleExerciseCard = ({ item, muscleGroup, onPress, onImagePress }) => (
  <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
    <TouchableOpacity
      onPress={() => onImagePress(item.image)}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.exerciseImageSmall}
        resizeMode="cover"
      />
    </TouchableOpacity>
    <View style={styles.cardInfo}>
      <Text style={styles.exerciseName}>{item.name}</Text>
      <Text style={styles.exerciseCategory}>{muscleGroup} Exercises</Text>
    </View>
    <TouchableOpacity style={styles.playButton} onPress={() => onPress(item)}>
      <Ionicons name="play-circle-outline" size={38} color="#FF5757" />
    </TouchableOpacity>
  </TouchableOpacity>
);

export default function AllExercises() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { type, muscleGroup } = useLocalSearchParams();
  const [exercises, setExercises] = useState([]);
  const [report, setReport] = useState(null);
  const [streak, setStreak] = useState([]);
  const [suggestedTomorrow, setSuggestedTomorrow] = useState(null);
  const [suggestedDayAfter, setSuggestedDayAfter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [headerOpen, setHeaderOpen] = useState(false);

  const toggleHeader = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHeaderOpen((v) => !v);
  };

  const backDestination =
    type === "gym"
      ? "/client/(workout)/fittbotWorkoutPage"
      : "/client/(workout)/homeWorkoutPage";

  const handleBack = () => {
    router.replace(backDestination);
  };

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.replace(backDestination);
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );
      return () => backHandler.remove();
    }, [backDestination]),
  );

  useEffect(() => {
    if (!muscleGroup) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const response = await getFittbotExercisesAPI(muscleGroup, type);
        if (response?.status === 200) {
          setExercises(response?.data ?? []);
          setReport(response?.report ?? null);
          setStreak(response?.streak ?? []);
          setSuggestedTomorrow(response?.suggested_tomorrow ?? null);
          setSuggestedDayAfter(response?.suggested_day_after ?? null);
        } else {
          showToast({
            type: "error",
            title: "Error",
            desc: "Error fetching exercises",
          });
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
    fetch();
  }, [muscleGroup]);

  const handleExercisePress = (item) => {
    router.push({
      pathname: "/client/(workout)/oneexercise",
      params: {
        type,
        exerciseId: item.id,
        exerciseName: item.name,
        muscleGroup,
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPreviewImage(null)}
        >
          <Image
            source={{ uri: previewImage }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {muscleGroup ? `${muscleGroup} Exercises` : "Exercises"}
        </Text>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) =>
            item.logged && item.logged.length > 0 ? (
              <LoggedExerciseCard
                item={item}
                muscleGroup={muscleGroup}
                onPress={handleExercisePress}
              />
            ) : (
              <SimpleExerciseCard
                item={item}
                muscleGroup={muscleGroup}
                onPress={handleExercisePress}
                onImagePress={setPreviewImage}
              />
            )
          }
          ListHeaderComponent={
            <View>
              {(report ||
                streak?.length > 0 ||
                suggestedTomorrow ||
                suggestedDayAfter) && (
                <View style={styles.dropdownWrapper}>
                  <TouchableOpacity
                    style={styles.dropdownToggle}
                    onPress={toggleHeader}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownToggleLeft}>
                      <Ionicons name="stats-chart" size={16} color="#007BFF" />
                      <Text style={styles.dropdownToggleText}>
                        View Workout Summary
                      </Text>
                    </View>
                    <Ionicons
                      name={headerOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#007BFF"
                    />
                  </TouchableOpacity>

                  {headerOpen && (
                    <View style={styles.dropdownContent}>
                      <WorkoutReportBanner report={report} />
                      <RecommendationCard
                        suggestedTomorrow={suggestedTomorrow}
                        suggestedDayAfter={suggestedDayAfter}
                        onPress={(mg) =>
                          router.replace({
                            pathname: backDestination,
                            params: { type, muscleGroup: mg },
                          })
                        }
                      />
                      <StreakCard streak={streak} />
                    </View>
                  )}
                </View>
              )}
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom + 50, 32) },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No exercises found</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
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
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, gap: 12, paddingBottom: 32 },

  // ── Collapsible dropdown ─────────────────────────────────────────
  dropdownWrapper: {
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: "hidden",
  },
  dropdownToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: "#F0F6FF",
    borderRadius: 14,
  },
  dropdownToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dropdownToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007BFF",
  },
  dropdownContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },

  // ── Simple card ──────────────────────────────────────────────────
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseImageSmall: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },
  cardInfo: { flex: 1, marginLeft: 14 },
  exerciseName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  exerciseCategory: { fontSize: 13, color: "#888" },
  playButton: { padding: 4 },

  // ── Logged card (mirrors oneexercise.jsx) ────────────────────────
  expandedBackground: {
    backgroundColor: "#FFFFFF",
    borderRadius: rw(3),
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
  },
  cardTopRow: {
    paddingHorizontal: rw(3),
    paddingVertical: rh(1),
    height: isTablet ? rh(14) : rh(10),
    justifyContent: "flex-start",
  },
  ecCardHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    position: "relative",
  },
  exerciseImageContainer: {
    width: isTablet ? 130 : 80,
    height: isTablet ? 145 : 80,
    borderRadius: rw(2),
    overflow: "hidden",
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
  },
  ecExerciseName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  ecMuscleGroupText: { fontSize: 11, color: "#656565", marginTop: 2 },
  ecExpandedContent: {
    paddingHorizontal: rw(0),
    paddingBottom: rw(2),
    paddingTop: rh(1),
  },
  ecSetsDisplayContainer: {
    borderRadius: rw(3),
    padding: rw(3),
    marginTop: rh(1),
    paddingHorizontal: rw(1),
  },
  ecSetsHeaderContainer: { marginBottom: rh(1) },
  ecSetsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rw(3),
    paddingVertical: rh(0.8),
    backgroundColor: "rgba(255,255,255,1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86bcf542",
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
  ecSetRowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: rw(6),
  },
  ecSetNumberContainer: { width: rw(13), alignItems: "center" },
  ecSetNumberCircle: {
    width: isTablet ? rw(5) : rw(4),
    height: isTablet ? rw(5) : rw(4),
    borderRadius: isTablet ? rw(5) : rw(4),
    backgroundColor: "#007BFF",
    justifyContent: "center",
    alignItems: "center",
  },
  ecSetNumber: { color: "white", fontSize: 9, fontWeight: "bold" },
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

  // ── Footer ───────────────────────────────────────────────────────
  saveWorkoutButton: {
    marginTop: 8,
    marginHorizontal: 4,
    backgroundColor: "#007BFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveWorkoutText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // ── Image preview modal ──────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: { width: "90%", height: "70%", borderRadius: 16 },

  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#888",
    fontSize: 14,
  },

  // ── Report banner ─────────────────────────────────────────────────
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  reportStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  reportStatItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  reportIcon: {
    width: 56,
    height: 56,
    resizeMode: "contain",
  },
  reportStatLabel: {
    fontSize: 11,
    color: "#919191",
    textAlign: "center",
  },
  reportStatValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  reportVolumeRow: {
    backgroundColor: "#F0FFF4",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  reportVolumeText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
  reportVolumeBold: {
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  reportChangePct: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  // ── Streak card ───────────────────────────────────────────────────
  streakCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  streakTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    marginLeft: 4,
  },
  streakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakDayContainer: {
    alignItems: "center",
    flex: 1,
  },
  streakDayInitial: {
    fontSize: 12,
    fontWeight: "500",
    color: "#555",
    marginBottom: 6,
  },
  streakCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  streakDayNumber: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  // ── Recommendation card ───────────────────────────────────────────
  recCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  recItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF5FF",
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  recImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#dde8f8",
  },
  recTextGroup: {
    flex: 1,
  },
  recLabel: {
    fontSize: 14,
    color: "#1A1A1A",
  },
  recMuscle: {
    fontWeight: "bold",
  },
  recWhen: {
    fontSize: 13,
    color: "#28A745",
    fontWeight: "600",
    marginTop: 2,
  },
  recDivider: {
    height: 10,
  },
});
