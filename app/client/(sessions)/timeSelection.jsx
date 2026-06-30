import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  BackHandler,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import React, { useState, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { sendSelectedSlotsAPI } from "../../../services/clientApi";
import { showToast } from "../../../utils/Toaster";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TimeSelection = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [timePreference, setTimePreference] = useState("same_time");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedSlotScheduleId, setSelectedSlotScheduleId] = useState(null);
  const [customSlots, setCustomSlots] = useState({});
  const [loading, setLoading] = useState(false);

  const sessionName = params?.sessionName || "Session";
  const sessionId = params?.sessionId || null;
  const gymId = params?.gymId || null;
  const passType = params?.passType || null;
  const selectedDatesString = params.selectedDates;
  const selectedDates = selectedDatesString
    ? JSON.parse(selectedDatesString).map((d) => new Date(d))
    : [];

  // Check if only one day is selected
  const isSingleDay = selectedDates.length === 1;

  // Parse slots data from API response
  const slotsData = useMemo(() => {
    try {
      return params.slotsData ? JSON.parse(params.slotsData) : null;
    } catch (error) {
      console.error("Error parsing slotsData:", error);
      return null;
    }
  }, [params.slotsData]);

  // Get default slots for "Same Time Daily"
  const defaultSlots = useMemo(() => {
    return slotsData?.default_slots || [];
  }, [slotsData]);

  // Get custom slots per date
  const customSlotsData = useMemo(() => {
    return slotsData?.slots || [];
  }, [slotsData]);

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
        onBackPress
      );

      return () => subscription.remove();
    }, [])
  );

  const formatDate = (date) => {
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
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${days[date.getDay()]}, ${
      months[date.getMonth()]
    } ${date.getDate()}`;
  };

  const handleSameTimeSlotToggle = (slotData) => {
    if (slotData.is_full) return;
    const isCurrentlySelected = selectedSlot === slotData.start_time;
    setSelectedSlot(isCurrentlySelected ? null : slotData.start_time);
    setSelectedSlotScheduleId(isCurrentlySelected ? null : null); // For default_slots, no schedule_id
  };

  const handleCustomSlotToggle = (date, slotData) => {
    if (slotData.is_full) return;

    setCustomSlots((prev) => {
      const currentSlots = prev[date] || [];
      const isSelected = currentSlots.some(
        (s) => s.start_time === slotData.start_time
      );

      const newSlots = isSelected
        ? currentSlots.filter((s) => s.start_time !== slotData.start_time)
        : [
            {
              start_time: slotData.start_time,
              schedule_id: slotData.schedule_id,
            },
          ]; // Only one slot per date

      return { ...prev, [date]: newSlots };
    });
  };

  const isSlotBooked = (slotData) => {
    return slotData.is_full;
  };

  const isSlotSelected = (slotTime) => {
    return timePreference === "same_time" ? selectedSlot === slotTime : false;
  };

  const isCustomSlotSelected = (date, slotTime) => {
    return customSlots[date]?.some((s) => s.start_time === slotTime) || false;
  };

  const canContinue = () => {
    if (timePreference === "same_time") {
      return selectedSlot !== null;
    } else {
      // For custom, check if all dates have a slot selected
      return customSlotsData.every((dateSlot) => {
        return customSlots[dateSlot.date]?.length > 0;
      });
    }
  };

  const handleContinue = async () => {
    if (!canContinue()) return;
    const clientId = await AsyncStorage.getItem("client_id");
    if (!clientId) {
      showToast({ type: "error", title: "Client ID not found" });
      return;
    }
    const timeData =
      timePreference === "same_time"
        ? { type: "same_time", slot: selectedSlot }
        : { type: "custom", slots: customSlots };

    setLoading(true);
    try {
      const payload = {
        session_id: sessionId,
        gym_id: gymId,
        sessions_count: customSlotsData.length,
        trainer_id: params.trainer_id || null,
        client_id: clientId,
        is_offer_eligible: params.session_offer_eligible === "true",
      };

      const response = await sendSelectedSlotsAPI(payload);

      if (response?.status === 200) {
        router.push({
          pathname: "/client/(sessions)/reviewBooking",
          params: {
            ...params,
            timeData: JSON.stringify(timeData),
            pricingData: JSON.stringify(response.data),
          },
        });
      } else {
        showToast({
          type: "error",
          title: "Error loading review",
        });
      }
    } catch (error) {
      console.error("Error calling sendSelectedSlotsAPI:", error);
      showToast({
        type: "error",
        title: "Error loading review",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{sessionName || "Session"}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <MaterialIcons name="schedule" size={30} color="#FF5757" />
          <View>
            <Text style={styles.mainTitle}>Select Time Slots</Text>
            <Text style={styles.subtitle}>
              Choose your preferred workout times
            </Text>
          </View>
        </View>

        {/* Time Preference Toggle - Only show if more than 1 day */}
        {!isSingleDay && (
          <View style={styles.timePreferenceContainer}>
            <Text style={styles.sectionTitle}>Time Preference</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  timePreference === "same_time" && styles.toggleButtonActive,
                ]}
                onPress={() => setTimePreference("same_time")}
              >
                <Ionicons
                  name="time"
                  size={18}
                  color={timePreference === "same_time" ? "#FFF" : "#FF5757"}
                />
                <Text
                  style={[
                    styles.toggleButtonText,
                    timePreference === "same_time" &&
                      styles.toggleButtonTextActive,
                  ]}
                >
                  Same Time Daily
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  timePreference === "custom" && styles.toggleButtonActive,
                ]}
                onPress={() => setTimePreference("custom")}
              >
                <Ionicons
                  name="calendar"
                  size={18}
                  color={timePreference === "custom" ? "#FFF" : "#FF5757"}
                />
                <Text
                  style={[
                    styles.toggleButtonText,
                    timePreference === "custom" &&
                      styles.toggleButtonTextActive,
                  ]}
                >
                  Custom Per Day
                </Text>
              </TouchableOpacity>
            </View>
            {slotsData?.show_custom && timePreference === "same_time" && (
              <View style={styles.infoMessage}>
                <Ionicons name="information-circle" size={16} color="#FF9800" />
                <Text style={styles.infoMessageText}>
                  No same time slot available for all days. Please select custom
                  slots per day.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Same Time Daily Slots - Show for single day or when "same_time" is selected */}
        {(isSingleDay || timePreference === "same_time") && (
          <View style={styles.slotsSection}>
            <Text style={styles.sectionTitle}>
              {isSingleDay ? "Select Time Slot" : "Select Time for All Days"}
            </Text>
            <View style={styles.timeSlotsContainer}>
              {defaultSlots.map((slotData, index) => {
                const booked = isSlotBooked(slotData);
                const selected = isSlotSelected(slotData.start_time);

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.timeSlot,
                      selected && styles.timeSlotSelected,
                      booked && styles.timeSlotBooked,
                    ]}
                    onPress={() => handleSameTimeSlotToggle(slotData)}
                    disabled={booked}
                  >
                    <View style={styles.timeSlotRow}>
                      <Ionicons
                        name={
                          booked
                            ? "close-circle"
                            : selected
                            ? "checkmark-circle"
                            : "time-outline"
                        }
                        size={16}
                        color={booked ? "#FFF" : selected ? "#FFF" : "#6B7280"}
                      />
                      <Text
                        style={[
                          styles.timeSlotText,
                          selected && styles.timeSlotTextSelected,
                          booked && styles.timeSlotTextBooked,
                        ]}
                      >
                        {slotData.start_time}
                      </Text>
                    </View>
                    {!booked && (
                      <Text
                        style={[
                          styles.availableSpotsText,
                          selected && styles.availableSpotsTextSelected,
                        ]}
                      >
                        {slotData.min_available_spots} spots
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: "#FFF" }]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendBox, { backgroundColor: "#00C853" }]}
                />
                <Text style={styles.legendText}>Selected</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendBox, { backgroundColor: "#FFA8A8" }]}
                />
                <Text style={styles.legendText}>Booked</Text>
              </View>
            </View>
          </View>
        )}

        {/* Custom Per Day Slots - Only show when not single day and custom is selected */}
        {!isSingleDay && timePreference === "custom" && (
          <View style={styles.slotsSection}>
            {customSlotsData.map((dateSlot, index) => {
              // Parse the date to display
              const date = new Date(dateSlot.date);

              return (
                <View key={index} style={styles.customDayContainer}>
                  <Text style={styles.customDayTitle}>{formatDate(date)}</Text>
                  <View style={styles.timeSlotsContainer}>
                    {dateSlot.slots.map((slotData, slotIndex) => {
                      const booked = isSlotBooked(slotData);
                      const selected = isCustomSlotSelected(
                        dateSlot.date,
                        slotData.start_time
                      );

                      return (
                        <TouchableOpacity
                          key={slotIndex}
                          style={[
                            styles.timeSlot,
                            selected && styles.timeSlotSelected,
                            booked && styles.timeSlotBooked,
                          ]}
                          onPress={() =>
                            handleCustomSlotToggle(dateSlot.date, slotData)
                          }
                          disabled={booked}
                        >
                          <View style={styles.timeSlotRow}>
                            <Ionicons
                              name={
                                booked
                                  ? "close-circle"
                                  : selected
                                  ? "checkmark-circle"
                                  : "time-outline"
                              }
                              size={16}
                              color={
                                booked ? "#FFF" : selected ? "#FFF" : "#6B7280"
                              }
                            />
                            <Text
                              style={[
                                styles.timeSlotText,
                                selected && styles.timeSlotTextSelected,
                                booked && styles.timeSlotTextBooked,
                              ]}
                            >
                              {slotData.start_time}
                            </Text>
                          </View>
                          {!booked && (
                            <Text
                              style={[
                                styles.availableSpotsText,
                                selected && styles.availableSpotsTextSelected,
                              ]}
                            >
                              {slotData.available_spots} spots
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            {/* Legend */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: "#FFF" }]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendBox, { backgroundColor: "#00C853" }]}
                />
                <Text style={styles.legendText}>Selected</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendBox, { backgroundColor: "#FF5757" }]}
                />
                <Text style={styles.legendText}>Booked</Text>
              </View>
            </View>
          </View>
        )}

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!canContinue() || loading) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!canContinue() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.continueButtonText}>Continue to Review</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default TimeSelection;

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
    paddingHorizontal: 0,
    paddingBottom: 20,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 10,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
  },
  mainTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    fontWeight: "400",
  },
  timePreferenceContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: "row",
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#FF5757",
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#FF5757",
    borderColor: "#FF5757",
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF5757",
  },
  toggleButtonTextActive: {
    color: "#FFF",
  },
  infoMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  infoMessageText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: "#E65100",
    lineHeight: 16,
  },
  slotsSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  timeSlotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  timeSlot: {
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 0,
    width: "31%",
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
  timeSlotText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
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
    color: "#9CA3AF",
  },
  availableSpotsTextSelected: {
    color: "#FFFFFF",
  },
  timeSlotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  customDayContainer: {
    marginBottom: 20,
  },
  customDayTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 10,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  legendText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  continueButton: {
    backgroundColor: "#FF5757",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    width: "70%",
    alignSelf: "center",
  },
  continueButtonDisabled: {
    backgroundColor: "#CCC",
  },
  continueButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
