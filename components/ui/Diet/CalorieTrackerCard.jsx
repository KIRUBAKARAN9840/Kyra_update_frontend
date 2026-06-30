import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";

const EMPTY = {
  caloriesLeft: 0,
  caloriesEaten: 0,
  caloriesTarget: 0,
  protein: { eaten: 0, target: 0 },
  carbs: { eaten: 0, target: 0 },
  fat: { eaten: 0, target: 0 },
};

// Same colors as report.jsx PRIMARY_MACROS
const PRIMARY_MACROS = [
  { key: "protein", label: "Protein", fill: "#2E984D", bg: "#FFFFFF" },
  { key: "carbs", label: "Carbs", fill: "#FFB200", bg: "#FFFFFF" },
  { key: "fat", label: "Fat", fill: "#EB0E13", bg: "#FFFFFF" },
];

// Identical to report.jsx createArc
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

// Same logic as report.jsx statusLabel — but null when nothing eaten yet
function getStatus(eaten, target) {
  if (!eaten || eaten === 0) return null; // not started → no label
  const diff = eaten - target;
  if (diff <= 0) return { text: "On Track", color: "#2E984D" };
  if (diff < 25) return { text: "Slightly High", color: "#FFB200" };
  return { text: "Too High", color: "#EB0E13" };
}

const SIZE = 78;
const CX = SIZE / 2;
const CY = SIZE / 2;
const STROKE = 7;
const R = (SIZE - STROKE) / 2 - 1;

const ANIM_DURATION = 220;

const CalorieTrackerCard = ({ data, onViewReport, onTargetCal }) => {
  const d = data ?? EMPTY;
  const leftNumInit = Number(data?.caloriesLeft);
  const initialExpanded =
    data != null && !isNaN(leftNumInit) && leftNumInit <= 0;

  const [expanded, setExpanded] = useState(initialExpanded);
  const userToggledRef = useRef(false);

  const fadeDefault = useRef(
    new Animated.Value(initialExpanded ? 0 : 1),
  ).current;
  const fadeExpanded = useRef(
    new Animated.Value(initialExpanded ? 1 : 0),
  ).current;

  // Auto-switch to "eaten" view when calories left is 0 (until user toggles manually)
  useEffect(() => {
    if (userToggledRef.current) return;
    if (!data) return;
    const leftNum = Number(data.caloriesLeft);
    const shouldExpand = !isNaN(leftNum) && leftNum <= 0;
    setExpanded(shouldExpand);
    fadeDefault.setValue(shouldExpand ? 0 : 1);
    fadeExpanded.setValue(shouldExpand ? 1 : 0);
  }, [data?.caloriesLeft]);

  const progressRatio =
    d.caloriesTarget > 0
      ? Math.min((d.caloriesEaten / d.caloriesTarget) * 100, 100)
      : 0;

  const toggleCard = () => {
    userToggledRef.current = true;
    const toDefault = expanded;
    Animated.parallel([
      Animated.timing(fadeDefault, {
        toValue: toDefault ? 1 : 0,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(fadeExpanded, {
        toValue: toDefault ? 0 : 1,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
    setExpanded(!expanded);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={toggleCard}
      style={styles.wrapper}
    >
      <View style={styles.card}>
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <Animated.Text
              style={[
                styles.headerTitle,
                { opacity: fadeDefault, position: "absolute" },
              ]}
            >
              Today's Calories Left
            </Animated.Text>
            <Animated.Text
              style={[styles.headerTitle, { opacity: fadeExpanded }]}
            >
              Today's Calories Eaten
            </Animated.Text>
          </View>
          <Animated.View
            style={{ opacity: fadeDefault, position: "absolute", right: 0 }}
            pointerEvents={expanded ? "none" : "auto"}
          >
            <TouchableOpacity
              onPress={onViewReport}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 4 }}
            >
              <View style={styles.actionLinkRow}>
                <Text style={styles.actionLink}>View Report</Text>
                <Feather name="arrow-right" size={13} color="#007BFF" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={{ opacity: fadeExpanded, position: "absolute", right: 0 }}
            pointerEvents={expanded ? "auto" : "none"}
          >
            <TouchableOpacity
              onPress={onTargetCal}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 4 }}
            >
              <View style={styles.actionLinkRow}>
                <Feather name="edit" size={14} color="#007BFF" />
                <Text style={[styles.actionLink, { marginLeft: 4 }]}>
                  Set Target
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── Calorie number row ── */}
        <View style={styles.calorieRow}>
          <Image
            source={require("../../../assets/images/diet/calorie.png")}
            style={styles.fireEmoji}
          />
          <View style={styles.calorieTextWrap}>
            <Animated.Text
              style={[
                styles.calorieNumber,
                { opacity: fadeDefault, position: "absolute" },
              ]}
            >
              {d.caloriesLeft}
            </Animated.Text>
            <Animated.Text
              style={[
                styles.calorieNumber,
                { opacity: fadeExpanded, position: "absolute" },
              ]}
            >
              {d.caloriesEaten}
            </Animated.Text>
          </View>
          <View style={styles.calorieSubWrap}>
            <Animated.Text
              style={[
                styles.calorieSubLabel,
                { opacity: fadeDefault, position: "absolute" },
              ]}
            >
              Calories left
            </Animated.Text>
            <Animated.Text
              style={[styles.calorieSubLabel, { opacity: fadeExpanded }]}
            >
              /{d.caloriesTarget} kcal eaten
            </Animated.Text>
          </View>
        </View>

        {/* ── Progress bar (shows only when expanded) ── */}
        <View style={styles.barTrack}>
          {expanded && (
            <LinearGradient
              colors={["#007BFF", "#1F9C74"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${progressRatio}%` }]}
            />
          )}
        </View>

        {/* ── Macro rings row ── */}
        <View style={styles.macrosRow}>
          {PRIMARY_MACROS.map((m) => {
            const eaten = d[m.key]?.eaten ?? 0;
            const target = d[m.key]?.target ?? 0;
            const left = d[m.key]?.left ?? Math.max(target - eaten, 0);
            const pct = target > 0 ? Math.min(eaten / target, 0.9999995) : 0;
            const status = getStatus(eaten, target);

            return (
              <View key={m.key} style={{ flex: 1, alignItems: "center" }}>
                {/* Ring */}
                <View style={{ width: SIZE, height: SIZE }}>
                  <Svg
                    width={SIZE}
                    height={SIZE}
                    viewBox={`0 0 ${SIZE} ${SIZE}`}
                  >
                    <Circle
                      cx={CX}
                      cy={CY}
                      r={R}
                      stroke="#EDEDED"
                      strokeWidth={STROKE}
                      fill={m.bg}
                    />
                    {pct > 0 && (
                      <Path
                        d={createArc(pct, R, CX, CY)}
                        stroke={m.fill}
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                        fill="none"
                      />
                    )}
                  </Svg>

                  {/* Center text — value only */}
                  <View style={styles.ringCenter}>
                    <Animated.Text
                      style={[
                        styles.ringMainValue,
                        { opacity: fadeDefault, position: "absolute" },
                      ]}
                    >
                      {left}g
                    </Animated.Text>
                    <Animated.View
                      style={{ opacity: fadeExpanded, alignItems: "center" }}
                    >
                      <Text style={styles.ringMainValue}>
                        {Math.round(eaten)}g
                      </Text>
                      <Text style={styles.ringSubValue}>/{target}g</Text>
                    </Animated.View>
                  </View>
                </View>

                {/* Label below ring — single line, cross-fade */}
                <View style={styles.labelWrap}>
                  <Animated.Text
                    style={[
                      styles.macroLabel,
                      { opacity: fadeDefault, position: "absolute" },
                    ]}
                  >
                    {m.label} left
                  </Animated.Text>
                  <Animated.Text
                    style={[styles.macroLabel, { opacity: fadeExpanded }]}
                  >
                    {m.label} eaten
                  </Animated.Text>
                </View>

                {/* Status — only meaningful in expanded mode */}
                <View style={styles.statusWrap}>
                  <Animated.Text
                    style={[
                      styles.macroStatus,
                      {
                        opacity: fadeExpanded,
                        color: status?.color ?? "#2E984D",
                      },
                    ]}
                  >
                    {status ? status.text : ""}
                  </Animated.Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 20,
    marginBottom: 10,
  },
  headerTitleWrap: {
    flex: 1,
    height: 20,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  actionLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007BFF",
  },

  // Calorie row
  calorieRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    height: 40,
  },
  fireEmoji: {
    width: 30,
    height: 30,
    resizeMode: "contain",
    marginRight: 4,
  },
  calorieTextWrap: {
    width: 80,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  calorieNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111111",
    lineHeight: 30,
  },
  calorieSubWrap: {
    flex: 1,
    height: 30,
    justifyContent: "flex-end",
    paddingBottom: 4,
    paddingLeft: 4,
    marginLeft: 4,
  },
  calorieSubLabel: {
    fontSize: 14,
    color: "#888888",
  },

  // Progress bar
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EEEEEE",
    marginBottom: 12,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
  },

  // Macros row
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Ring center overlay
  ringCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  ringMainValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },
  ringSubValue: {
    fontSize: 10,
    color: "#888",
    marginTop: 1,
  },

  // Below ring
  labelWrap: {
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },
  macroLabel: {
    fontSize: 12,
    color: "#1A1A1A",
  },
  statusWrap: {
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  macroStatus: {
    fontSize: 11,
    fontWeight: "600",
  },
});

export default CalorieTrackerCard;
