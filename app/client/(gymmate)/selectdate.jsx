import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────
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

const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const MINUTES = ["00", "15", "30", "45"];
const PERIODS = ["AM", "PM"];

const getISTNow = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.5 * 3600000);
};

const todayDate = new Date(getISTNow());
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

const formatDate = (date) => {
  if (!date) return null;
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
};

// ─── Calendar Modal ───────────────────────────────────────────
function CalendarModal({ visible, onClose, selectedDate, onSelectDate }) {
  const [calYear, setCalYear] = useState(todayDate.getFullYear());
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());

  // Allow selecting future dates (workout planning), but not more than 3 months ahead
  const maxYear =
    todayDate.getMonth() + 3 > 11
      ? todayDate.getFullYear() + 1
      : todayDate.getFullYear();
  const maxMonth =
    todayDate.getMonth() + 3 > 11
      ? (todayDate.getMonth() + 3) % 12
      : todayDate.getMonth() + 3;

  const isAtMin =
    calYear === todayDate.getFullYear() && calMonth === todayDate.getMonth();
  const isAtMax = calYear === maxYear && calMonth === maxMonth;

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
    return d < todayDate;
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
              {/* Header */}
              <View style={calStyles.header}>
                <Text style={calStyles.headerTitle}>Select Date</Text>
                <TouchableOpacity onPress={onClose} style={calStyles.closeBtn}>
                  <Ionicons name="close" size={22} color="#333" />
                </TouchableOpacity>
              </View>

              {/* Month nav */}
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

              {/* Grid */}
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

// ─── Time Picker Modal ────────────────────────────────────────
function TimePickerModal({
  visible,
  onClose,
  selectedTime,
  onSelectTime,
  selectedDate,
}) {
  const [hour, setHour] = useState(selectedTime?.hour ?? "01");
  const [minute, setMinute] = useState(selectedTime?.minute ?? "00");
  const [period, setPeriod] = useState(selectedTime?.period ?? "PM");

  const isToday = selectedDate && toKey(selectedDate) === toKey(todayDate);

  const isTimePast = (h, m, p) => {
    if (!isToday) return false;
    const ist = getISTNow();
    const nowMinutes = ist.getHours() * 60 + ist.getMinutes();
    let hour24 = parseInt(h, 10);
    if (p === "PM" && hour24 !== 12) hour24 += 12;
    if (p === "AM" && hour24 === 12) hour24 = 0;
    return hour24 * 60 + parseInt(m, 10) <= nowMinutes;
  };

  const isPast = isTimePast(hour, minute, period);

  const handleConfirm = () => {
    if (isPast) return;
    onSelectTime({ hour, minute, period });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={timeStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={timeStyles.container}>
              {/* Header */}
              <View style={timeStyles.header}>
                <Text style={timeStyles.headerTitle}>Select Time</Text>
                <TouchableOpacity onPress={onClose} style={timeStyles.closeBtn}>
                  <Ionicons name="close" size={22} color="#333" />
                </TouchableOpacity>
              </View>

              {/* Pickers row */}
              <View style={timeStyles.pickersRow}>
                {/* Hour */}
                <View style={timeStyles.pickerCol}>
                  <Text style={timeStyles.pickerLabel}>Hour</Text>
                  <ScrollView
                    style={timeStyles.scrollPicker}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={44}
                    decelerationRate="fast"
                  >
                    {HOURS.map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[
                          timeStyles.pickerItem,
                          hour === h && timeStyles.pickerItemSelected,
                        ]}
                        onPress={() => setHour(h)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            timeStyles.pickerItemText,
                            hour === h && timeStyles.pickerItemTextSelected,
                          ]}
                        >
                          {h}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <Text style={timeStyles.colon}>:</Text>

                {/* Minute */}
                <View style={timeStyles.pickerCol}>
                  <Text style={timeStyles.pickerLabel}>Min</Text>
                  <ScrollView
                    style={timeStyles.scrollPicker}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={44}
                    decelerationRate="fast"
                  >
                    {MINUTES.map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          timeStyles.pickerItem,
                          minute === m && timeStyles.pickerItemSelected,
                        ]}
                        onPress={() => setMinute(m)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            timeStyles.pickerItemText,
                            minute === m && timeStyles.pickerItemTextSelected,
                          ]}
                        >
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* AM/PM */}
                <View style={timeStyles.pickerColAMPM}>
                  <Text style={timeStyles.pickerLabel}> </Text>
                  <View style={timeStyles.ampmContainer}>
                    {PERIODS.map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          timeStyles.ampmBtn,
                          period === p && timeStyles.ampmBtnSelected,
                        ]}
                        onPress={() => setPeriod(p)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            timeStyles.ampmText,
                            period === p && timeStyles.ampmTextSelected,
                          ]}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Past time warning */}
              {isPast && (
                <Text style={timeStyles.pastWarning}>
                  This time has already passed
                </Text>
              )}

              {/* Confirm */}
              <TouchableOpacity
                style={[
                  timeStyles.confirmBtn,
                  isPast && timeStyles.confirmBtnDisabled,
                ]}
                onPress={handleConfirm}
                disabled={isPast}
                activeOpacity={0.85}
              >
                <Text style={timeStyles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────
const SelectDate = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const formattedTime = selectedTime
    ? `${selectedTime.hour}:${selectedTime.minute} ${selectedTime.period}`
    : null;

  const canContinue = selectedDate && selectedTime;

  const handleContinue = () => {
    // Format date as YYYY-MM-DD
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    const sessionDate = `${y}-${m}-${d}`;

    // Convert 12h to 24h format HH:MM:SS
    let h = parseInt(selectedTime.hour, 10);
    if (selectedTime.period === "PM" && h !== 12) h += 12;
    if (selectedTime.period === "AM" && h === 12) h = 0;
    const sessionTime = `${String(h).padStart(2, "0")}:${selectedTime.minute}:00`;

    router.push({
      pathname: "/client/(gymmate)/mateprefer",
      params: { session_date: sessionDate, session_time: sessionTime },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
      </TouchableOpacity>

      {/* Step label */}
      <View style={styles.topSection}>
        <Text style={styles.stepLabel}>Step 1 of 5</Text>
        <Text style={styles.title}>Date & Time</Text>
        <Text style={styles.subtitle}>
          Plan Your Workout with your Gym Mate
        </Text>
      </View>

      {/* Fields */}
      <View style={styles.fieldsSection}>
        {/* Date selector */}
        <TouchableOpacity
          style={styles.selectorCard}
          onPress={() => setCalendarVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="calendar-outline" size={20} color="#555" />
          </View>
          <Text
            style={[
              styles.selectorText,
              selectedDate && styles.selectorTextFilled,
            ]}
          >
            {selectedDate ? formatDate(selectedDate) : "Select Date"}
          </Text>
        </TouchableOpacity>

        {/* Time selector */}
        <TouchableOpacity
          style={styles.selectorCard}
          onPress={() => setTimePickerVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="time-outline" size={20} color="#555" />
          </View>
          <Text
            style={[
              styles.selectorText,
              selectedTime && styles.selectorTextFilled,
            ]}
          >
            {formattedTime ?? "Select Time"}
          </Text>
          <Ionicons
            name="chevron-down"
            size={18}
            color={selectedTime ? "#1A1A1A" : "#999"}
            style={styles.chevron}
          />
        </TouchableOpacity>
      </View>

      {/* Continue button */}
      {canContinue && (
        <View
          style={[
            styles.continueWrapper,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <TouchableOpacity
            style={styles.continueBtn}
            activeOpacity={0.85}
            onPress={handleContinue}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
      <TimePickerModal
        visible={timePickerVisible}
        onClose={() => setTimePickerVisible(false)}
        selectedTime={selectedTime}
        onSelectTime={setSelectedTime}
        selectedDate={selectedDate}
      />
    </View>
  );
};

export default SelectDate;

// ─── Calendar Styles ──────────────────────────────────────────
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  closeBtn: { padding: 4 },
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  dayRow: { flexDirection: "row", marginBottom: 4 },
  dayLabel: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
    paddingVertical: 4,
  },
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

// ─── Time Picker Styles ───────────────────────────────────────
const timeStyles = StyleSheet.create({
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
    paddingHorizontal: 20,
    paddingBottom: 24,
    width: "100%",
    maxWidth: 360,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 16,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  closeBtn: { padding: 4 },
  pickersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  pickerCol: { alignItems: "center", flex: 1 },
  pickerColAMPM: { alignItems: "center", width: 64 },
  pickerLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scrollPicker: {
    height: 176,
    width: "100%",
  },
  pickerItem: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  pickerItemSelected: {
    backgroundColor: "#F0FDF4",
  },
  pickerItemText: {
    fontSize: 22,
    fontWeight: "400",
    color: "#AAAAAA",
  },
  pickerItemTextSelected: {
    color: "#22C55E",
    fontWeight: "700",
  },
  colon: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 20,
    paddingHorizontal: 2,
  },
  ampmContainer: {
    gap: 10,
    marginTop: 0,
  },
  ampmBtn: {
    width: 56,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  ampmBtnSelected: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  ampmText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  ampmTextSelected: {
    color: "#FFF",
  },
  pastWarning: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 10,
  },
  confirmBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  confirmText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

// ─── Main Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    marginTop: 8,
    marginLeft: 12,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  stepLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "400",
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "400",
    textAlign: "center",
  },
  fieldsSection: {
    paddingHorizontal: 20,
    gap: 14,
  },
  selectorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EAECF0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  selectorTextFilled: {
    color: "#111827",
    fontWeight: "500",
  },
  chevron: {
    marginLeft: 8,
  },
  continueWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  continueBtn: {
    backgroundColor: "#101828",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
