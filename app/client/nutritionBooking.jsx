import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  BackHandler,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import {
  getAvailableDatesNutritionAPI,
  getAvailableSlotsNutritionAPI,
  bookNutritionSlotAPI,
} from "../../services/clientApi";
import { showToast } from "../../utils/Toaster";

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

const tomorrowDate = new Date(todayDate);
tomorrowDate.setDate(tomorrowDate.getDate() + 1);

const toKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

// Parse "YYYY-MM-DD" as local date (avoids UTC midnight → IST previous-day shift)
const parseLocalDate = (dateStr) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const buildMonthGrid = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
};

// Convert 12hr time string ("09:45 AM", "02:00 PM") to 24hr ("09:45", "14:00")
const to24hr = (timeStr) => {
  if (!timeStr) return timeStr;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return timeStr; // already 24hr or unknown format
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = match[3].toUpperCase();
  if (period === "AM" && h === 12) h = 0;
  else if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${m}`;
};

const NutritionBooking = () => {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(tomorrowDate);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [calYear, setCalYear] = useState(tomorrowDate.getFullYear());
  const [calMonth, setCalMonth] = useState(tomorrowDate.getMonth());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Auto-navigate to home 1.5s after success
  useEffect(() => {
    if (!showSuccessModal) return;
    const t = setTimeout(() => {
      setShowSuccessModal(false);
      router.replace("/client/diet");
    }, 1500);
    return () => clearTimeout(t);
  }, [showSuccessModal]);

  const handleBack = () => {
    router.back();
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      fetchAvailableDates();
      return () => subscription.remove();
    }, []),
  );

  const fetchAvailableDates = async () => {
    setLoading(true);
    try {
      const response = await getAvailableDatesNutritionAPI();
      if (response?.status === 200) {
        const dates = response?.data || [];
        setAvailableDates(dates);
        const tomorrowKey = toKey(tomorrowDate);
        const tomorrowAvailable = dates.some(
          (d) => toKey(parseLocalDate(d)) === tomorrowKey,
        );
        if (tomorrowAvailable) {
          setSelectedDate(new Date(tomorrowDate));
        } else {
          setSelectedDate(null);
        }
      } else {
        setAvailableDates([]);
        showToast({ type: "error", title: "Failed to fetch available dates" });
      }
    } catch {
      setAvailableDates([]);
      showToast({ type: "error", title: "Error fetching available dates" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) fetchTimeSlots(selectedDate);
  }, [selectedDate]);

  const fetchTimeSlots = async (date) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const sqlFormattedDate = `${year}-${month}-${day}`;

      const response = await getAvailableSlotsNutritionAPI(sqlFormattedDate);
      if (response?.status === 200) {
        const formattedSlots =
          response?.data?.map((slot, idx) => ({
            id: `${slot.schedule_id}_${idx}`,
            time: `${slot.start_time} - ${slot.end_time}`,
            available: !slot.is_booked,
            schedule_id: slot.schedule_id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            duration_minutes: slot.duration_minutes,
          })) || [];
        setAvailableTimeSlots(formattedSlots);
      } else {
        setAvailableTimeSlots([]);
        showToast({ type: "error", title: "Failed to fetch time slots" });
      }
    } catch {
      setAvailableTimeSlots([]);
      showToast({ type: "error", title: "Error fetching time slots" });
    } finally {
      setLoading(false);
    }
  };

  // Calendar helpers
  const isCurrentMonth =
    calYear === todayDate.getFullYear() && calMonth === todayDate.getMonth();
  const nextMonthVal = todayDate.getMonth() + 1;
  const maxYear =
    nextMonthVal > 11 ? todayDate.getFullYear() + 1 : todayDate.getFullYear();
  const maxMonthNorm = nextMonthVal > 11 ? nextMonthVal - 12 : nextMonthVal;
  const isAtMax = calYear === maxYear && calMonth === maxMonthNorm;

  const goPrev = () => {
    if (isCurrentMonth) return;
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

  const isDateAvailable = (date) => {
    if (!date || availableDates.length === 0) return false;
    const key = toKey(date);
    return availableDates.some((d) => toKey(parseLocalDate(d)) === key);
  };

  const isSelectedDate = (date) =>
    date && selectedDate && toKey(date) === toKey(selectedDate);

  const handleDatePress = (date) => {
    if (!date || !isDateAvailable(date)) return;
    const newDate = new Date(date);
    if (isSelectedDate(date)) {
      setSelectedDate(null);
      setSelectedTimeSlot(null);
      setAvailableTimeSlots([]);
    } else {
      setSelectedDate(newDate);
      setSelectedTimeSlot(null);
    }
  };

  const cells = buildMonthGrid(calYear, calMonth);

  const handleTimeSlotSelection = (slot) => {
    if (!slot.available) return;
    setSelectedTimeSlot(slot);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTimeSlot || booking) return;
    setBooking(true);

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const bookingDate = `${year}-${month}-${day}`;

    try {
      const response = await bookNutritionSlotAPI({
        schedule_id: selectedTimeSlot.schedule_id,
        booking_date: bookingDate,
        start_time: to24hr(selectedTimeSlot.start_time),
        end_time: to24hr(selectedTimeSlot.end_time),
      });

      if (response?.status === 200) {
        setSuccessInfo(response);
        setShowSuccessModal(true);
      } else {
        const errorMsg =
          response?.detail || response?.message || "Booking failed";
        if (errorMsg === "slot_time_conflict") {
          showToast({
            type: "error",
            title: "Slot No Longer Available",
            desc: "Someone else booked this slot. Refreshing...",
          });
          fetchTimeSlots(selectedDate);
          setSelectedTimeSlot(null);
        } else {
          showToast({ type: "error", title: "Booking Failed", desc: errorMsg });
        }
      }
    } catch {
      showToast({ type: "error", title: "Error booking slot" });
    } finally {
      setBooking(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    const months = [
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
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const canConfirm = selectedDate && selectedTimeSlot && !loading && !booking;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Nutrition Session</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <MaterialIcons name="event" size={30} color="#28A745" />
          <View>
            <Text style={styles.mainTitle}>1:1 Nutrition Consultation</Text>
            <Text style={styles.subtitle}>
              Select your preferred date and time
            </Text>
          </View>
        </View>

        {/* Calendar Section */}
        <View style={styles.section}>
          <View style={styles.calendarContainer}>
            {/* Month nav */}
            <View style={styles.calHeader}>
              <TouchableOpacity
                onPress={goPrev}
                disabled={isCurrentMonth}
                style={styles.navBtn}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={24}
                  color={isCurrentMonth ? "#CCC" : "#007AFF"}
                />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[calMonth]} {calYear}
              </Text>
              <TouchableOpacity
                onPress={goNext}
                disabled={isAtMax}
                style={styles.navBtn}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={isAtMax ? "#CCC" : "#007AFF"}
                />
              </TouchableOpacity>
            </View>

            {/* Day labels */}
            <View style={styles.dayRow}>
              {DAY_LABELS.map((d) => (
                <Text key={d} style={styles.dayLabel}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Grid */}
            <View style={styles.grid}>
              {cells.map((date, i) => {
                if (!date)
                  return <View key={`empty-${i}`} style={styles.cell} />;
                const selected = isSelectedDate(date);
                const available = isDateAvailable(date);
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.cell}
                    onPress={() => handleDatePress(date)}
                    disabled={!available}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.dateCircle,
                        selected && styles.dateCircleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calDateText,
                          selected && styles.dateTextSelected,
                          !available && styles.dateTextDisabled,
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
        </View>

        {/* Time Slots Section */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Times</Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#28A745" />
              </View>
            ) : availableTimeSlots.length === 0 ? (
              <View style={styles.noSlotsContainer}>
                <MaterialIcons name="event-busy" size={32} color="#CCC" />
                <Text style={styles.noSlotsText}>
                  No time slots available for the selected date.
                </Text>
                <Text style={styles.noSlotsSubText}>
                  Please select another day.
                </Text>
              </View>
            ) : (
              <View style={styles.timeSlotsContainer}>
                {availableTimeSlots.map((slot) => {
                  const isSelected = selectedTimeSlot?.id === slot.id;
                  const isBooked = !slot.available;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[
                        styles.timeSlot,
                        isSelected && styles.timeSlotSelected,
                        isBooked && styles.timeSlotBooked,
                      ]}
                      onPress={() => handleTimeSlotSelection(slot)}
                      disabled={isBooked}
                    >
                      <View style={styles.timeSlotRow}>
                        <Text
                          style={[
                            styles.timeSlotText,
                            isSelected && styles.timeSlotTextSelected,
                            isBooked && styles.timeSlotTextBooked,
                          ]}
                        >
                          {slot.time}
                        </Text>
                      </View>
                      {slot.duration_minutes && (
                        <Text
                          style={[
                            styles.availableSpotsText,
                            isSelected && styles.availableSpotsTextSelected,
                            isBooked && styles.bookedSpotsText,
                          ]}
                        >
                          {isBooked ? "Booked" : `${slot.duration_minutes} min`}
                        </Text>
                      )}
                      {!slot.duration_minutes && !isBooked && (
                        <Text
                          style={[
                            styles.availableSpotsText,
                            isSelected && styles.availableSpotsTextSelected,
                          ]}
                        >
                          Available
                        </Text>
                      )}
                      {!slot.duration_minutes && isBooked && (
                        <Text style={styles.bookedSpotsText}>Booked</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Summary Section */}
        {selectedDate && selectedTimeSlot && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <MaterialIcons name="event" size={20} color="#666" />
                <Text style={styles.summaryLabel}>Date:</Text>
                <Text style={styles.summaryValue}>
                  {formatDate(selectedDate)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <MaterialIcons name="access-time" size={20} color="#666" />
                <Text style={styles.summaryLabel}>Time:</Text>
                <Text style={styles.summaryValue}>{selectedTimeSlot.time}</Text>
              </View>
              {selectedTimeSlot.duration_minutes && (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <MaterialIcons name="timer" size={20} color="#666" />
                    <Text style={styles.summaryLabel}>Duration:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedTimeSlot.duration_minutes} minutes
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Sticky Bottom Bar ── */}
      {selectedDate && selectedTimeSlot && (
        <View
          style={[
            styles.checkoutWrapper,
            { paddingBottom: insets.bottom + 10 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              !canConfirm && styles.confirmBtnDisabled,
            ]}
            onPress={() => setShowConfirmModal(true)}
            disabled={!canConfirm}
            activeOpacity={0.85}
          >
            {booking ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Confirmation Modal ── */}
      <Modal
        animationType="fade"
        transparent
        visible={showConfirmModal}
        onRequestClose={() => setShowConfirmModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmIconContainer}>
              <MaterialIcons name="event-available" size={48} color="#28A745" />
            </View>
            <Text style={styles.confirmModalTitle}>Confirm Booking?</Text>
            <View style={styles.confirmDetails}>
              <View style={styles.confirmDetailRow}>
                <MaterialIcons name="event" size={18} color="#666" />
                <Text style={styles.confirmDetailText}>
                  {formatDate(selectedDate)}
                </Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <MaterialIcons name="access-time" size={18} color="#666" />
                <Text style={styles.confirmDetailText}>
                  {selectedTimeSlot?.time}
                </Text>
              </View>
              {selectedTimeSlot?.duration_minutes && (
                <View style={styles.confirmDetailRow}>
                  <MaterialIcons name="timer" size={18} color="#666" />
                  <Text style={styles.confirmDetailText}>
                    {selectedTimeSlot.duration_minutes} minutes
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bookBtn, booking && styles.confirmBtnDisabled]}
                onPress={() => {
                  setShowConfirmModal(false);
                  handleConfirmBooking();
                }}
                disabled={booking}
              >
                {booking ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.bookBtnText}>Book Now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Success Modal ── */}
      <Modal
        animationType="fade"
        transparent
        visible={showSuccessModal}
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.replace("/client/diet");
        }}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={56} color="#28A745" />
            </View>
            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successMessage}>
              {successInfo?.message ||
                `Session ${successInfo?.session_number || ""} booked successfully. ${successInfo?.sessions_remaining != null ? `${successInfo.sessions_remaining} sessions remaining.` : ""}`}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default NutritionBooking;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  scrollContent: {
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: "#F0F9F4",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    fontWeight: "400",
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  calendarContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    paddingBottom: 0,
  },
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  dayRow: { flexDirection: "row", marginBottom: 4 },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
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
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  dateCircleSelected: { backgroundColor: "#28A745" },
  calDateText: { fontSize: 13, color: "#1A1A1A", fontWeight: "400" },
  dateTextSelected: { color: "#FFF", fontWeight: "700" },
  dateTextDisabled: { color: "#CCCCCC" },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  noSlotsContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 6,
  },
  noSlotsText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    textAlign: "center",
  },
  noSlotsSubText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  timeSlotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlot: {
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#22C55E",
    gap: 0,
    width: "48%",
    justifyContent: "center",
  },
  timeSlotSelected: {
    backgroundColor: "#00C853",
    borderColor: "#00C853",
  },
  timeSlotBooked: {
    backgroundColor: "#FFA8A8",
    borderColor: "#FFA8A8",
  },
  timeSlotRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeSlotText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#22C55E",
  },
  timeSlotTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  timeSlotTextBooked: {
    color: "#FFFFFF",
  },
  availableSpotsText: {
    fontSize: 9,
    fontWeight: "400",
    color: "#22C55E",
  },
  bookedSpotsText: {
    fontSize: 9,
    fontWeight: "400",
    color: "#ffffff",
  },
  availableSpotsTextSelected: {
    color: "#FFFFFF",
  },
  summarySection: {
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginVertical: 12,
  },
  checkoutWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#28A745",
    borderRadius: 12,
    paddingVertical: 14,
  },
  confirmBtnDisabled: { backgroundColor: "#CCC" },
  confirmBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContent: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    elevation: 8,
  },
  confirmModalContent: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    elevation: 8,
  },
  confirmIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F0FFF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
    textAlign: "center",
  },
  confirmDetails: {
    width: "100%",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 24,
  },
  confirmDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  confirmDetailText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  confirmModalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  bookBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#28A745",
    alignItems: "center",
    justifyContent: "center",
  },
  bookBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0FFF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#28A745",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
});
