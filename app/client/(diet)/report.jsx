import { useState, useMemo, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import { ManualCalorieModal } from "../../../components/ui/Home/progesspage/calculatecalories";
import { getDietReportAPI } from "../../../services/clientApi";

const MEAL_ORDER = ["Breakfast", "Lunch", "Snacks", "Dinner"];

// ─── Constants (mirrors passDateSelection) ─────────────────────
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

// ─── Protein Intake Data ───────────────────────────────────────
const VEG_FOODS = [
  {
    name: "Paneer",
    protein: 18,
    image: require("../../../assets/images/diet/paneer.webp"),
  },
  {
    name: "Soya Chunks",
    protein: 26,
    image: require("../../../assets/images/diet/soya.webp"),
  },
  {
    name: "Chana",
    protein: 15,
    image: require("../../../assets/images/diet/channa.webp"),
  },
  {
    name: "Moong Dal",
    protein: 14,
    image: require("../../../assets/images/diet/dal.webp"),
  },
  {
    name: "Curd",
    protein: 9,
    image: require("../../../assets/images/diet/curd.webp"),
  },
  {
    name: "Milk",
    protein: 8,
    image: require("../../../assets/images/diet/milk.webp"),
  },
  {
    name: "Peanuts",
    protein: 13,
    image: require("../../../assets/images/diet/peanuts.webp"),
  },
  {
    name: "Rajma",
    protein: 14,
    image: require("../../../assets/images/diet/rajma.webp"),
  },
  {
    name: "Sprouts",
    protein: 13,
    image: require("../../../assets/images/diet/sprouts.webp"),
  },
  {
    name: "Besan Chilla",
    protein: 14,
    image: require("../../../assets/images/diet/chilla.webp"),
  },
];

const NON_VEG_FOODS = [
  {
    name: "Chicken Breast",
    protein: 31,
    image: require("../../../assets/images/diet/chicken_breast.webp"),
  },
  {
    name: "Eggs",
    protein: 12,
    image: require("../../../assets/images/diet/egg.webp"),
  },
  {
    name: "Egg Whites",
    protein: 15,
    image: require("../../../assets/images/diet/whites.webp"),
  },
  {
    name: "Fish (Rohu)",
    protein: 21,
    image: require("../../../assets/images/diet/rohu.webp"),
  },
  {
    name: "Mutton",
    protein: 25,
    image: require("../../../assets/images/diet/mutton.webp"),
  },
  {
    name: "Chicken Keema",
    protein: 27,
    image: require("../../../assets/images/diet/keema.webp"),
  },
  {
    name: "Omelette",
    protein: 18,
    image: require("../../../assets/images/diet/omlette.webp"),
  },
  {
    name: "Boiled Eggs",
    protein: 24,
    image: require("../../../assets/images/diet/boiled.webp"),
  },
  {
    name: "Fish Fry",
    protein: 21,
    image: require("../../../assets/images/diet/fish.webp"),
  },
  {
    name: "Chicken Curry",
    protein: 27,
    image: require("../../../assets/images/diet/chicken.webp"),
  },
];

// ─── Protein Intake Section Component ─────────────────────────
function ProteinIntakeSection() {
  const [activeTab, setActiveTab] = useState("veg");
  const foods = activeTab === "veg" ? VEG_FOODS : NON_VEG_FOODS;

  return (
    <View style={ptStyles.wrapper}>
      {/* Title */}
      <Text style={ptStyles.title}>Improve your Protein intake</Text>
      <Text style={ptStyles.subtitle}>Add to your next meal</Text>

      {/* Tabs */}
      <View style={ptStyles.tabRow}>
        <TouchableOpacity
          style={ptStyles.tabBtn}
          onPress={() => setActiveTab("veg")}
          activeOpacity={0.85}
        >
          {activeTab === "veg" ? (
            <LinearGradient
              colors={["#28A745", "#28A745"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={ptStyles.tabGradient}
            >
              <Text style={ptStyles.tabTextActive}>Vegetarian Foods</Text>
            </LinearGradient>
          ) : (
            <View style={ptStyles.tabInactive}>
              <Text style={ptStyles.tabTextInactive}>Vegetarian Foods</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={ptStyles.tabBtn}
          onPress={() => setActiveTab("nonveg")}
          activeOpacity={0.85}
        >
          {activeTab === "nonveg" ? (
            <LinearGradient
              colors={["#28A745", "#28A745"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={ptStyles.tabGradient}
            >
              <Text style={ptStyles.tabTextActive}>Non-Vegetarian Foods</Text>
            </LinearGradient>
          ) : (
            <View style={ptStyles.tabInactive}>
              <Text style={ptStyles.tabTextInactive}>Non-Vegetarian Foods</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Horizontal scroll food cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ptStyles.foodList}
      >
        {foods.map((food, idx) => (
          <View key={idx} style={ptStyles.foodCard}>
            <Image
              source={food.image}
              style={ptStyles.foodImage}
              contentFit="cover"
            />
            <View style={ptStyles.foodInfo}>
              <Text style={ptStyles.foodName} numberOfLines={1}>
                {food.name}
              </Text>
              <Text style={ptStyles.foodPerLabel}>Protein per 100g</Text>
              <LinearGradient
                colors={["#007BFF", "#28A745"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={ptStyles.proteinBadge}
              >
                <Text style={ptStyles.proteinBadgeText}>{food.protein}g</Text>
              </LinearGradient>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const ptStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: "#888",
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 8,
    // overflow: "hidden",
  },
  tabGradient: {
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabInactive: {
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#F8F8F8",
  },
  tabTextActive: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  tabTextInactive: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },
  foodList: {
    paddingRight: 4,
    gap: 10,
  },
  foodCard: {
    width: 130,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  foodImage: {
    width: 130,
    height: 100,
  },
  foodInfo: {
    padding: 8,
    gap: 4,
  },
  foodName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  foodPerLabel: {
    fontSize: 10,
    color: "#888",
  },
  proteinBadge: {
    borderRadius: 10,
    paddingHorizontal: 30,
    paddingVertical: 3,
    alignSelf: "center",
    marginTop: 6,
  },
  proteinBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
});

// ─── Circular Arc Helper ───────────────────────────────────────
// cx=cy=center of SVG viewBox, r=radius, pct in [0,1]
function createArc(pct, r, cx, cy) {
  const safe = isNaN(pct) || pct < 0 ? 0 : Math.min(pct, 0.9999995);
  if (safe === 0) return "";
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + safe * 2 * Math.PI;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = safe > 0.5 ? 1 : 0;
  if (safe >= 0.9999995) {
    const mid = cx + r * Math.cos(startAngle + Math.PI);
    const midY = cy + r * Math.sin(startAngle + Math.PI);
    return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${mid} ${midY} A ${r} ${r} 0 1 1 ${x1} ${y1}`;
  }
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

// ─── Primary Macros Row (Protein / Carbs / Fat) ────────────────
const PRIMARY_MACROS = [
  { key: "protein", label: "Protein", fill: "#2E984D", bg: "#FFFFFF" },
  { key: "carbs", label: "Carbs", fill: "#FFB200", bg: "#FFFFFF" },
  { key: "fat", label: "Fat", fill: "#EB0E13", bg: "#FFFFFF" },
];

function statusLabel(eaten, target) {
  const diff = eaten - target;
  if (diff <= 0) return { text: "On Track", color: "#2E984D" };
  if (diff < 25) return { text: "Slightly High", color: "#FFB200" };
  return { text: "Too High", color: "#EB0E13" };
}

function MacroCircle({ eaten, target, fill, bg, label }) {
  const SIZE = 86;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const STROKE = 7;
  const R = (SIZE - STROKE) / 2 - 1;
  const pct = target > 0 ? Math.min(eaten / target, 1) : 0;
  const { text, color } = statusLabel(eaten, target);

  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* background circle */}
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            stroke="#EDEDED"
            strokeWidth={STROKE}
            fill={bg}
          />
          {/* progress arc */}
          {pct > 0 && (
            <Path
              d={createArc(pct, R, CX, CY)}
              stroke={fill}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
            />
          )}
        </Svg>
        {/* text overlay */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SIZE,
            height: SIZE,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "800", color: "#111" }}>
            {Math.round(eaten)}g
          </Text>
          <Text style={{ fontSize: 10, color: "#888" }}>/{target}g</Text>
        </View>
      </View>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: "#1A1A1A",
          marginTop: 5,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 11, fontWeight: "600", color, marginTop: 1 }}>
        {text}
      </Text>
    </View>
  );
}

function MacroCirclesRow({ macroData }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 4,
        marginBottom: 4,
      }}
    >
      {PRIMARY_MACROS.map((m) => (
        <MacroCircle
          key={m.key}
          eaten={macroData[m.key]?.eaten ?? 0}
          target={macroData[m.key]?.target ?? 0}
          fill={m.fill}
          bg={m.bg}
          label={m.label}
        />
      ))}
    </View>
  );
}

// ─── Secondary Macros + Micros Row (Fiber/Sugar/Calcium/Sodium) ─
const SECONDARY_ITEMS = [
  {
    key: "fiber",
    label: "Fiber",
    fill: "#2E984D",
    bg: "#FFFFFF",
    isMicro: false,
  },
  {
    key: "sugar",
    label: "Sugar",
    fill: "#FFBFD5",
    bg: "#FFFFFF",
    isMicro: false,
  },
  {
    key: "calcium",
    label: "Calcium",
    fill: "#A2CEFF",
    bg: "#FFFFFF",
    isMicro: true,
    unit: "mg",
  },
  {
    key: "sodium",
    label: "Sodium",
    fill: "#EBAE84",
    bg: "#FFFFFF",
    isMicro: true,
    unit: "mg",
  },
];

function FullCircle({ fill, bg, value, unit, label }) {
  const SIZE = 68;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const STROKE = 6;
  const R = (SIZE - STROKE) / 2 - 1;

  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            stroke={fill}
            strokeWidth={STROKE}
            fill={bg}
          />
        </Svg>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SIZE,
            height: SIZE,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: "#111" }}>
            {Math.round(value)}
            {unit ?? "g"}
          </Text>
        </View>
      </View>
      <Text
        style={{ fontSize: 11, fontWeight: "500", color: "#555", marginTop: 5 }}
      >
        {label}
      </Text>
    </View>
  );
}

function SecondaryMacrosRow({ macroData, micros }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 12,
        paddingBottom: 4,
      }}
    >
      {SECONDARY_ITEMS.map((item) => {
        const value = item.isMicro
          ? (micros[item.key]?.actual ?? 0)
          : (macroData[item.key]?.eaten ?? 0);
        return (
          <FullCircle
            key={item.key}
            fill={item.fill}
            bg={item.bg}
            value={value}
            unit={item.unit}
            label={item.label}
          />
        );
      })}
    </View>
  );
}

// ─── Calendar Modal (passDateSelection style, past 3 months) ───
function CalendarModal({ visible, onClose, selectedDate, onSelectDate }) {
  // Start at current month, allow going back 3 months
  const [calYear, setCalYear] = useState(todayDate.getFullYear());
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());

  // Earliest allowed month: 3 months ago
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
  // Future dates are disabled; also dates before minMonth
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
              {/* Handle bar */}
              <View style={calStyles.handleBar} />

              {/* Header */}
              <View style={calStyles.header}>
                <Text style={calStyles.headerTitle}>Select Date</Text>
                <TouchableOpacity onPress={onClose} style={calStyles.closeBtn}>
                  <Ionicons name="close" size={22} color="#333" />
                </TouchableOpacity>
              </View>

              {/* Month nav — exactly like passDateSelection */}
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

              {/* Day labels */}
              <View style={calStyles.dayRow}>
                {DAY_LABELS.map((d) => (
                  <Text key={d} style={calStyles.dayLabel}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Grid — flex-wrap like passDateSelection */}
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

// ─── Format date as YYYY-MM-DD ────────────────────────────────
function toAPIDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Main Component ────────────────────────────────────────────
const Report = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const backRoute = params.from === "savedmeal"
    ? "/client/(dietcoach)/savedmeal"
    : "/client/diettracker";

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState(null);
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [selectedBarIndex, setSelectedBarIndex] = useState(6); // today
  const [macrosExpanded, setMacrosExpanded] = useState(false);

  const fetchReport = useCallback(async (date) => {
    setLoading(true);
    try {
      const res = await getDietReportAPI(toAPIDate(date));

      if (res?.status === 200) {
        setReportData(res.data);
      }
    } catch (e) {
      console.error("Diet report fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate]);

  // Hardware back button → route to /client/diet (same as header back)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.replace(backRoute);
        return true;
      };
      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => sub.remove();
    }, [router]),
  );

  // ── Derived display values ──
  const summary = reportData?.summary ?? {};
  const todayLog = reportData?.today ?? {};
  const last7Days = reportData?.last_7_days ?? [];
  const micros = reportData?.todays_macros?.micros ?? {};

  // Build weekDays merging IST dates with API calorie data
  const weekDays = useMemo(() => {
    const now = new Date();
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + IST_OFFSET);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(istNow);
      d.setUTCDate(istNow.getUTCDate() - i);
      const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const apiDay = last7Days.find((x) => x.date === dateStr);
      result.push({
        date: d.getUTCDate(),
        day: days[d.getUTCDay()],
        isToday: i === 0,
        calories: apiDay?.calories ?? 0,
      });
    }
    return result;
  }, [last7Days]);

  // Calories card values — from todays_macros.overall
  const todayOverall = reportData?.todays_macros?.overall ?? {};

  const caloriesEaten = todayOverall.calories?.actual ?? 0;
  const caloriesTarget = todayOverall.calories?.target ?? 0;

  const macroData = {
    protein: {
      eaten: todayOverall.protein?.actual ?? 0,
      target: todayOverall.protein?.target ?? 0,
    },
    carbs: {
      eaten: todayOverall.carbs?.actual ?? 0,
      target: todayOverall.carbs?.target ?? 0,
    },
    fat: {
      eaten: todayOverall.fat?.actual ?? 0,
      target: todayOverall.fat?.target ?? 0,
    },
    fiber: {
      eaten: todayOverall.fiber?.actual ?? 0,
      target: todayOverall.fiber?.target ?? 0,
    },
    sugar: {
      eaten: todayOverall.sugar?.actual ?? 0,
      target: todayOverall.sugar?.target ?? 0,
    },
  };

  // Meals for food log
  const mealsFromAPI = {
    Breakfast: todayLog.breakfast ?? [],
    Lunch: todayLog.lunch ?? [],
    Snacks: todayLog.snacks ?? [],
    Dinner: todayLog.dinner ?? [],
  };

  // Add custom meals keyed by their title
  (todayLog.custom_meals ?? []).forEach((cm) => {
    if (cm?.title) {
      mealsFromAPI[cm.title] = cm.foodList ?? [];
    }
  });

  // Order: fixed meals first, then custom meals in the order they arrived
  const orderedMealKeys = [
    ...MEAL_ORDER,
    ...(todayLog.custom_meals ?? [])
      .map((cm) => cm?.title)
      .filter((t) => t && !MEAL_ORDER.includes(t)),
  ];

  const progressRatio = caloriesTarget
    ? Math.min((caloriesEaten / caloriesTarget) * 100, 100)
    : 0;

  const formatSelectedDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);
    if (sel.toDateString() === today.toDateString()) return "Today";
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
    return `${sel.getDate()} ${months[sel.getMonth()]} ${sel.getFullYear()}`;
  };

  const maxBarCalories = Math.max(...weekDays.map((d) => d.calories), 1);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace(backRoute)}
        >
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diet Report</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── AI Coach Bubble ── */}
        <View style={styles.aiRow}>
          <View style={styles.aiAvatarWrap}>
            <Image
              source={require("../../../assets/images/home/ai.png")}
              style={styles.aiAvatar}
              contentFit="contain"
            />
          </View>
          <View style={styles.aiBubble}>
            <View style={styles.aiBubbleTail} />
            <Text style={styles.aiBubbleTitle}>Your AI Coach</Text>
            <Text style={styles.aiBubbleText}>
              {summary.days_tracked
                ? `You've tracked ${summary.days_tracked} days. Keep it up!`
                : "Start logging your meals to get insights."}
            </Text>
            <View style={styles.aiStatRow}>
              <View style={styles.aiStatItem}>
                <Feather name="bar-chart-2" size={12} color="#007BFF" />
                <Text style={styles.aiStatLabel}>Avg Calories</Text>
                <Text style={styles.aiStatValue}>
                  {summary.avg_calories ?? 0}{" "}
                  <Text style={{ color: "#aca6a6" }}>kcal</Text>
                </Text>
              </View>
              <View style={styles.aiStatDivider} />
              <View style={styles.aiStatItem}>
                <Feather name="activity" size={12} color="#FF5757" />
                <Text style={styles.aiStatLabel}>Protein</Text>
                <Text style={[styles.aiStatValue, { color: "#FF5757" }]}>
                  {summary.protein_status?.status ?? "Low"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Calories Card (expanded format) ── */}
        <View style={styles.card}>
          {/* Header row */}
          <View style={styles.calorieHeaderRow}>
            <Text style={styles.calorieCardTitle}>Today's Calories Eaten</Text>
            <TouchableOpacity
              onPress={() => setTargetModalVisible(true)}
              style={styles.setTargetBtn}
            >
              <Feather name="edit" size={14} color="#007BFF" />
              <Text style={styles.setTargetText}>Set Target</Text>
            </TouchableOpacity>
          </View>

          {/* Calorie number */}
          <View style={styles.calorieNumberRow}>
            <Image
              source={require("../../../assets/images/diet/calorie.png")}
              style={styles.fireIcon}
            />
            <Text style={styles.calorieNumber}>{caloriesEaten}</Text>
            <Text style={styles.calorieSubLabel}>
              /{caloriesTarget} kcal eaten
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.barTrack}>
            <LinearGradient
              colors={["#007BFF", "#1F9C74"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${progressRatio}%` }]}
            />
          </View>

          {/* ── Primary Macros: Protein / Carbs / Fat ── */}
          <MacroCirclesRow macroData={macroData} />

          {/* ── View Macros & Micronutrients (collapsible) ── */}
          <TouchableOpacity
            style={styles.macroExpandRow}
            onPress={() => setMacrosExpanded((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={styles.macroExpandLabel}>
              View Macros & Micronutrients
            </Text>
            <Ionicons
              name={macrosExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color="#555"
            />
          </TouchableOpacity>

          {macrosExpanded && (
            <View style={styles.microExpandedSection}>
              <SecondaryMacrosRow macroData={macroData} micros={micros} />
            </View>
          )}
        </View>

        {/* ── Today's Food Log ── */}
        <View style={styles.sectionCard}>
          <View style={styles.foodLogHeader}>
            <Text style={styles.sectionTitle}>
              {formatSelectedDate() === "Today"
                ? "Today's Food Log"
                : `${formatSelectedDate()} Food Log`}
            </Text>
            <TouchableOpacity
              style={styles.calendarIconBtn}
              onPress={() => setCalendarVisible(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#007BFF" />
              <Text style={styles.calendarDateText}>
                {formatSelectedDate()}
              </Text>
            </TouchableOpacity>
          </View>

          {orderedMealKeys.map((meal) => {
            const items = mealsFromAPI[meal] ?? [];
            const mealCalories = items.reduce(
              (s, i) => s + (i.calories ?? 0),
              0,
            );
            const isExpanded = expandedMeal === meal;
            return (
              <View key={meal} style={styles.mealCard}>
                <TouchableOpacity
                  style={styles.mealRow}
                  onPress={() => setExpandedMeal(isExpanded ? null : meal)}
                  activeOpacity={0.8}
                >
                  <View style={styles.mealLeft}>
                    <View>
                      <Text style={styles.mealName}>{meal}</Text>
                      <Text style={styles.mealTime}>
                        {items.length} item{items.length !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.mealRight}>
                    <Text style={styles.mealCalories}>{mealCalories} kcal</Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#888"
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.mealItems}>
                    {items.length === 0 ? (
                      <Text style={styles.foodItemName}>No items logged</Text>
                    ) : (
                      items.map((item, idx) => (
                        <View
                          key={item.id ?? idx}
                          style={[
                            styles.foodItemRow,
                            idx === items.length - 1 && {
                              borderBottomWidth: 0,
                            },
                          ]}
                        >
                          <View style={styles.foodItemLeft}>
                            <Text style={styles.foodItemName}>{item.name}</Text>
                            <Text style={styles.foodItemQty}>
                              {item.quantity}
                            </Text>
                          </View>
                          <Text style={styles.foodItemCal}>
                            {item.calories} kcal
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Your Weekly Trend ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Weekly Trend</Text>
          <View style={styles.barChart}>
            {weekDays.map((day, idx) => {
              const isSelected = idx === selectedBarIndex;
              const barHeight = Math.max(
                (day.calories / maxBarCalories) * 110,
                8,
              );
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.barCol}
                  onPress={() => setSelectedBarIndex(idx)}
                >
                  <View style={styles.barWrapper}>
                    {isSelected && (
                      <Text style={styles.barValueLabel}>{day.calories}</Text>
                    )}
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: isSelected ? "#10B981" : "#E0E0E0",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barDateLabel}>
                    {String(day.date).padStart(2, "0")}
                  </Text>
                  <Text style={styles.barDayLabel}>{day.day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Selected day summary */}
          <View style={styles.weekSummary}>
            <Text style={styles.weekSummaryText}>
              {weekDays[selectedBarIndex]?.day},{" "}
              {String(weekDays[selectedBarIndex]?.date).padStart(2, "0")}
              {"  "}
              <Text style={styles.weekSummaryVal}>
                {weekDays[selectedBarIndex]?.calories} kcal
              </Text>
            </Text>
          </View>
        </View>

        {/* ── Improve Protein Intake ── */}
        <ProteinIntakeSection />
      </ScrollView>

      {/* ── Calendar Modal ── */}
      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {/* ── Set Target Modal ── */}
      <ManualCalorieModal
        visible={targetModalVisible}
        onClose={() => setTargetModalVisible(false)}
        target={{
          calories: caloriesTarget ?? "",
          protein: macroData.protein?.target ?? "",
          carbs: macroData.carbs?.target ?? "",
          fat: macroData.fat?.target ?? "",
          fiber: macroData.fiber?.target ?? "",
          sugar: macroData.sugar?.target ?? "",
        }}
        saveTrackingData={() => {}}
        getHomeData={() => {}}
      />
    </View>
  );
};

export default Report;

// ─── Calendar Styles (mirrors passDateSelection exactly) ───────
const calStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    width: "100%",
    maxWidth: 400,
  },
  handleBar: {
    height: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  closeBtn: { padding: 4 },
  // Month nav row
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  // Day labels
  dayRow: { flexDirection: "row", marginBottom: 4 },
  dayLabel: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
    paddingVertical: 4,
  },
  // Grid — flex-wrap like passDateSelection
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  dateCircleSelected: { backgroundColor: "#22C55E" },
  dateCircleToday: { borderWidth: 1.5, borderColor: "#22C55E" },
  dateText: { fontSize: 13, color: "#1A1A1A", fontWeight: "400" },
  dateTextSelected: { color: "#FFF", fontWeight: "700" },
  dateTextToday: { color: "#22C55E", fontWeight: "700" },
  dateTextDisabled: { color: "#CCCCCC" },
});

// ─── Main Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaea",
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  headerRight: {
    width: 36,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
    gap: 14,
  },

  // ── AI Bubble ──
  aiRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#F0F7FF",
    marginHorizontal: -12,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  aiAvatarWrap: {
    position: "relative",
  },
  aiAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  aiBubble: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  aiBubbleTail: {
    position: "absolute",
    left: -8,
    top: 14,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderRightWidth: 9,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#a18e8e58",
  },
  aiBubbleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  aiBubbleText: {
    fontSize: 12,
    color: "#555",
    lineHeight: 18,
    marginBottom: 4,
  },
  aiStatRow: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 6,
    gap: 8,
  },
  aiStatItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  aiStatDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
  },
  aiStatLabel: {
    fontSize: 10,
    color: "#888",
  },
  aiStatValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#007BFF",
  },

  // ── Card ──
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  calorieHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calorieCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  setTargetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  setTargetText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007BFF",
  },
  calorieNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
    height: 40,
  },
  fireIcon: {
    width: 16,
    height: 25,
    marginRight: 4,
  },
  calorieNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111",
    lineHeight: 40,
    marginRight: 4,
  },
  calorieSubLabel: {
    fontSize: 14,
    color: "#888",
    paddingBottom: 4,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EEEEEE",
    marginBottom: 14,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  macroExpandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 6,
  },
  macroExpandLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },

  // ── Section Card ──
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 14,
  },

  // ── Food Log ──
  foodLogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calendarIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  calendarDateText: {
    fontSize: 12,
    color: "#007BFF",
    fontWeight: "600",
  },
  mealCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    marginBottom: 10,
    overflow: "hidden",
  },
  mealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
  },
  mealLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007BFF",
  },
  mealName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  mealTime: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  mealRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  mealItems: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  foodItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  foodItemLeft: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  foodItemQty: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  foodItemCal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
  },

  // ── Bar Chart ──
  barChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 150,
    marginBottom: 10,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barWrapper: {
    height: 120,
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 6,
  },
  bar: {
    width: 22,
    borderRadius: 6,
    minHeight: 8,
  },
  barValueLabel: {
    fontSize: 9,
    color: "#333",
    fontWeight: "700",
    marginBottom: 4,
  },
  barDateLabel: {
    fontSize: 11,
    color: "#555",
    fontWeight: "600",
  },
  barDayLabel: {
    fontSize: 10,
    color: "#888",
    marginTop: 2,
  },
  weekSummary: {
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  weekSummaryText: {
    fontSize: 13,
    color: "#555",
  },
  weekSummaryVal: {
    fontWeight: "700",
    color: "#10B981",
  },
});
