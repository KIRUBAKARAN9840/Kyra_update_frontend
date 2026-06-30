import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { BackHandler } from "react-native";
import { getFittbotWorkoutHistoryAPI } from "../../../services/clientApi";
import { showToast } from "../../../utils/Toaster";

const { width } = Dimensions.get("window");

// ─── Calendar Constants ────────────────────────────────────────
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const todayDate = new Date();
todayDate.setHours(0, 0, 0, 0);

const toKey = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
};
const todayKey = toKey(todayDate);

const buildMonthGrid = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
};

function toAPIDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Calendar Modal ────────────────────────────────────────────
function CalendarModal({ visible, onClose, selectedDate, onSelectDate }) {
  const [calYear, setCalYear] = useState(todayDate.getFullYear());
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());

  const minYear =
    todayDate.getMonth() - 3 < 0
      ? todayDate.getFullYear() - 1
      : todayDate.getFullYear();
  const minMonth =
    todayDate.getMonth() - 3 < 0
      ? todayDate.getMonth() - 3 + 12
      : todayDate.getMonth() - 3;

  const isAtMin = calYear === minYear && calMonth === minMonth;
  const isAtMax =
    calYear === todayDate.getFullYear() && calMonth === todayDate.getMonth();

  const goPrev = () => {
    if (isAtMin) return;
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  const goNext = () => {
    if (isAtMax) return;
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  const cells = buildMonthGrid(calYear, calMonth);
  const isSelectedCell = (date) =>
    date && selectedDate && toKey(date) === toKey(selectedDate);
  const isTodayCell = (date) => date && toKey(date) === todayKey;
  const isDisabled = (date) => {
    if (!date) return true;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d > todayDate;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={calStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={calStyles.container}>
              <View style={calStyles.handleBar} />
              <View style={calStyles.header}>
                <Text style={calStyles.headerTitle}>Select Date</Text>
                <TouchableOpacity onPress={onClose} style={calStyles.closeBtn}>
                  <Ionicons name="close" size={22} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={calStyles.calHeader}>
                <TouchableOpacity
                  onPress={goPrev}
                  disabled={isAtMin}
                  style={calStyles.navBtn}
                >
                  <Ionicons
                    name="chevron-back"
                    size={24}
                    color={isAtMin ? "#CCC" : "#007AFF"}
                  />
                </TouchableOpacity>
                <Text style={calStyles.monthLabel}>
                  {MONTH_NAMES[calMonth]} {calYear}
                </Text>
                <TouchableOpacity
                  onPress={goNext}
                  disabled={isAtMax}
                  style={calStyles.navBtn}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={isAtMax ? "#CCC" : "#007AFF"}
                  />
                </TouchableOpacity>
              </View>
              <View style={calStyles.dayRow}>
                {DAY_LABELS.map((d) => (
                  <Text key={d} style={calStyles.dayLabel}>
                    {d}
                  </Text>
                ))}
              </View>
              <View style={calStyles.grid}>
                {cells.map((date, i) => {
                  if (!date)
                    return <View key={`empty-${i}`} style={calStyles.cell} />;
                  const sel = isSelectedCell(date);
                  const tod = isTodayCell(date);
                  const disabled = isDisabled(date);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={calStyles.cell}
                      onPress={() => {
                        if (!disabled) {
                          onSelectDate(new Date(date));
                          onClose();
                        }
                      }}
                      disabled={disabled}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          calStyles.dateCircle,
                          sel && calStyles.dateCircleSelected,
                          !sel && tod && calStyles.dateCircleToday,
                        ]}
                      >
                        <Text
                          style={[
                            calStyles.dateText,
                            sel && calStyles.dateTextSelected,
                            !sel && tod && calStyles.dateTextToday,
                            disabled && calStyles.dateTextDisabled,
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Stats Card (same as addworkout.jsx / WorkoutReportBanner) ─
const StatsCard = ({ report }) => {
  if (!report) return null;
  return (
    <View style={styles.reportCard}>
      <Text style={styles.reportTitle}>Workout Stats</Text>
      <View style={styles.reportStatsRow}>
        <View style={styles.reportStatItem}>
          <Image
            source={require("../../../assets/images/clockbig.png")}
            style={styles.reportIcon}
          />
          <Text style={styles.reportStatLabel}>Session Time</Text>
          <Text style={styles.reportStatValue}>
            {report.total_time_mins != null
              ? `${report.total_time_mins} min`
              : "—"}
          </Text>
        </View>
        <View style={styles.reportStatItem}>
          <Image
            source={require("../../../assets/images/caloriesbig.png")}
            style={[styles.reportIcon, { width: 48 }]}
          />
          <Text style={styles.reportStatLabel}>Calories Burnt</Text>
          <Text style={styles.reportStatValue}>
            {report.total_calories_burnt != null
              ? `${report.total_calories_burnt} Kcal`
              : "—"}
          </Text>
        </View>
        <View style={styles.reportStatItem}>
          <Image
            source={require("../../../assets/images/weightbig.png")}
            style={styles.reportIcon}
          />
          <Text style={styles.reportStatLabel}>Exercises</Text>
          <Text style={styles.reportStatValue}>
            {report.exercises_completed ?? "—"}
          </Text>
        </View>
        <View style={styles.reportStatItem}>
          <Image
            source={require("../../../assets/images/kgs.png")}
            style={styles.reportIcon}
          />
          <Text style={styles.reportStatLabel}>Volume</Text>
          <Text style={styles.reportStatValue}>
            {report.total_volume != null ? `${report.total_volume} kg` : "—"}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─── Helpers for exercise table ────────────────────────────────
const SET_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57"];
const getSetColor = (i) => SET_COLORS[i % SET_COLORS.length];

const formatDuration = (secs) => {
  if (!secs) return "0";
  // duration from API is in seconds
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
};

const getExerciseType = (exercise) => {
  if (!exercise.sets?.length) return "regular";
  const { reps, weight } = exercise.sets[0];
  if (!reps && !weight) return "cardio";
  if (reps && !weight) return "bodyweight";
  return "regular";
};

const SetsHeader = ({ exercise }) => {
  const type = getExerciseType(exercise);
  const cols =
    type === "cardio"
      ? [
          { icon: "time", name: "Duration", color: "#4ECDC4" },
          { icon: "flame", name: "Cal", color: "#FF6B6B" },
        ]
      : type === "bodyweight"
        ? [
            { icon: "time", name: "Duration", color: "#4ECDC4" },
            { icon: "repeat", name: "Reps", color: "#45B7D1" },
            { icon: "flame", name: "Cal", color: "#FF6B6B" },
          ]
        : [
            { icon: "time", name: "Duration", color: "#4ECDC4" },
            { icon: "repeat", name: "Reps", color: "#45B7D1" },
            { icon: "flame", name: "Cal", color: "#FF6B6B" },
            {
              icon: "weight-kilogram",
              name: "Weight",
              color: "#9B59B6",
              isFA: true,
            },
          ];

  return (
    <View style={styles.setsHeaderRow}>
      <View style={styles.headerSetCol}>
        <Ionicons name="fitness" size={14} color="#FF6B6B" />
        <Text style={styles.headerText}>Sets</Text>
      </View>
      <View style={styles.headerDataContainer}>
        {cols.map((c, i) => (
          <View key={i} style={styles.headerColItem}>
            {c.isFA ? (
              <MaterialCommunityIcons name={c.icon} size={13} color={c.color} />
            ) : (
              <Ionicons name={c.icon} size={13} color={c.color} />
            )}
            <Text style={styles.headerText}>{c.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const SetRow = ({ set, index, exercise }) => {
  const type = getExerciseType(exercise);
  return (
    <View style={styles.setRow}>
      <View style={styles.setNumberContainer}>
        <View
          style={[
            styles.setNumberCircle,
            { backgroundColor: getSetColor(index) },
          ]}
        >
          <Text style={styles.setNumber}>{index + 1}</Text>
        </View>
      </View>
      <View style={styles.setDataContainer}>
        <Text style={styles.setDataValue}>{formatDuration(set.duration)}</Text>
        {type !== "cardio" && (
          <Text style={styles.setDataValue}>{set.reps}</Text>
        )}
        <Text style={styles.setDataValue}>
          {set.calories.toFixed(2)}
          <Text style={styles.setDataUnit}>kcal</Text>
        </Text>
        {type === "regular" && (
          <Text style={styles.setDataValue}>
            {set.weight}
            <Text style={styles.setDataUnit}>kg</Text>
          </Text>
        )}
      </View>
    </View>
  );
};

// ─── Main Component ────────────────────────────────────────────
const WorkoutReportPage = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [selectedTab, setSelectedTab] = useState(null);
  const [expandedExercise, setExpandedExercise] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.replace("/client/workouttracker");
        return true;
      };
      const handler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );
      return () => handler.remove();
    }, []),
  );

  const fetchHistory = useCallback(async (date) => {
    setLoading(true);
    setReportData(null);
    setMuscleGroups([]);
    setSelectedTab(null);
    setExpandedExercise(null);
    try {
      const res = await getFittbotWorkoutHistoryAPI(toAPIDate(date));
      if (res?.status === 200) {
        setReportData(res.report ?? null);
        const data = res.data ?? [];
        setMuscleGroups(data);
        if (data.length > 0) setSelectedTab(data[0].muscle_group);
      } else {
        setReportData(null);
        setMuscleGroups([]);
      }
    } catch (e) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to load workout report",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(selectedDate);
  }, [selectedDate]);

  const formatDisplayDate = (date) => {
    const d = new Date(date);
    const isToday = d.toDateString() === todayDate.toDateString();
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
    const label = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    return isToday ? `Today, ${months[d.getMonth()]} ${d.getDate()}` : label;
  };

  const navigateDate = (dir) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + dir);
    next.setHours(0, 0, 0, 0);
    if (next > todayDate) return;
    setSelectedDate(next);
  };

  const tabs = muscleGroups.map((g) => g.muscle_group);

  // Group exercises by name so multiple entries for same exercise merge into one card
  const currentExercises = (() => {
    const raw =
      muscleGroups.find((g) => g.muscle_group === selectedTab)?.exercises ?? [];
    const map = new Map();
    raw.forEach((ex) => {
      if (map.has(ex.name)) {
        map.get(ex.name).sets.push(...(ex.sets ?? []));
      } else {
        map.set(ex.name, { ...ex, sets: [...(ex.sets ?? [])] });
      }
    });
    return Array.from(map.values());
  })();

  const toggleExercise = (key) =>
    setExpandedExercise((prev) => (prev === key ? null : key));

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => router.replace("/client/workouttracker")}
      >
        <Ionicons name="arrow-back" size={20} color="#333" />
        <Text style={styles.headerTitle}>Workout Report</Text>
      </TouchableOpacity>

      {/* Date Picker Row */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => navigateDate(-1)}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.datePill}
          onPress={() => setCalendarVisible(true)}
        >
          <Ionicons name="calendar-outline" size={16} color="#007AFF" />
          <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigateDate(1)}
          disabled={selectedDate.toDateString() === todayDate.toDateString()}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={
              selectedDate.toDateString() === todayDate.toDateString()
                ? "#CCC"
                : "#333"
            }
          />
        </TouchableOpacity>
      </View>

      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={selectedDate}
        onSelectDate={(d) => {
          setSelectedDate(d);
        }}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Stats Card */}
          {muscleGroups.length ? (
            <StatsCard report={reportData} />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No workout data for this date
              </Text>
            </View>
          )}

          {/* Workout Details Section */}
          {muscleGroups.length > 0 && (
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Workout Details</Text>

              {/* Muscle Group Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsContainer}
                contentContainerStyle={styles.tabsContent}
              >
                {tabs.map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tabBtn,
                      selectedTab === tab && styles.activeTabBtn,
                    ]}
                    onPress={() => {
                      setSelectedTab(tab);
                      setExpandedExercise(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        selectedTab === tab && styles.activeTabText,
                      ]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Exercises */}
              <View style={styles.exerciseList}>
                {currentExercises.length > 0 ? (
                  currentExercises.map((exercise, idx) => {
                    const key = `${selectedTab}_${idx}`;
                    const isExpanded = expandedExercise === key;
                    const totalCals =
                      exercise.sets?.reduce((s, set) => s + set.calories, 0) ??
                      0;
                    const totalReps =
                      exercise.sets?.reduce((s, set) => s + set.reps, 0) ?? 0;
                    const totalWeight =
                      exercise.sets?.reduce((s, set) => s + set.weight, 0) ?? 0;

                    return (
                      <View key={idx} style={styles.exerciseItem}>
                        <TouchableOpacity
                          style={styles.exerciseHeader}
                          onPress={() => toggleExercise(key)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.exerciseNameWrap}>
                            <Text style={styles.exerciseName} numberOfLines={2}>
                              {exercise.name}
                            </Text>
                            <Text style={styles.exerciseMeta}>
                              {exercise.sets?.length} sets
                              {totalReps > 0 ? ` • ${totalReps} reps` : ""}
                              {totalWeight > 0 ? ` • ${totalWeight} kg` : ""}
                            </Text>
                          </View>
                          <View style={styles.exerciseRight}>
                            <Text style={styles.exerciseCals}>
                              {totalCals.toFixed(2)} kcal
                            </Text>
                            <Ionicons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={18}
                              color="#888"
                            />
                          </View>
                        </TouchableOpacity>

                        {isExpanded && exercise.sets && (
                          <View style={styles.setsContainer}>
                            <SetsHeader exercise={exercise} />
                            {exercise.sets.map((set, setIdx) => (
                              <SetRow
                                key={setIdx}
                                set={set}
                                index={setIdx}
                                exercise={exercise}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.noDataText}>
                    No exercises for this muscle group
                  </Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default WorkoutReportPage;

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 15,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Stats Card
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  reportStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  reportStatItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  reportIcon: {
    width: 44,
    height: 44,
    resizeMode: "contain",
  },
  reportStatLabel: {
    fontSize: 10,
    color: "#919191",
    textAlign: "center",
  },
  reportStatValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
  },

  // Details section
  detailsSection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  tabsContainer: {
    marginBottom: 14,
  },
  tabsContent: {
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#F8F8F8",
  },
  activeTabBtn: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
  },
  activeTabText: {
    color: "#fff",
  },

  // Exercise list
  exerciseList: {
    gap: 10,
  },
  exerciseItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    overflow: "hidden",
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FAFAFA",
  },
  exerciseNameWrap: {
    flex: 1,
    marginRight: 8,
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
    marginBottom: 2,
  },
  exerciseMeta: {
    fontSize: 11,
    color: "#888",
  },
  exerciseRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  exerciseCals: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF6B6B",
  },

  // Sets table
  setsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  setsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 6,
  },
  headerSetCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 48,
  },
  headerText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#555",
  },
  headerDataContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  headerColItem: {
    alignItems: "center",
    gap: 2,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F9F9F9",
  },
  setNumberContainer: {
    width: 48,
  },
  setNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  setNumber: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  setDataContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  setDataValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  setDataUnit: {
    fontSize: 10,
    color: "#888",
    fontWeight: "400",
  },
  noDataText: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    paddingVertical: 16,
  },
});

// ─── Calendar Styles ───────────────────────────────────────────
const calStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: "#DDD",
    borderRadius: 2,
    alignSelf: "center",
    marginVertical: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  closeBtn: {
    padding: 4,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  dayRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayLabel: {
    width: (width - 32) / 7,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: (width - 32) / 7,
    alignItems: "center",
    paddingVertical: 4,
  },
  dateCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  dateCircleSelected: {
    backgroundColor: "#007AFF",
  },
  dateCircleToday: {
    borderWidth: 1.5,
    borderColor: "#007AFF",
  },
  dateText: {
    fontSize: 13,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  dateTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  dateTextToday: {
    color: "#007AFF",
    fontWeight: "700",
  },
  dateTextDisabled: {
    color: "#CCC",
  },
});
