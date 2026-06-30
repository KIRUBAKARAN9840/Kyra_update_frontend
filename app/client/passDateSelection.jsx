import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  BackHandler,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import CustomCalendarContinuous from "../../components/ui/CustomCalendarContinuous";
import { pythonRound } from "../../utils/basicUtilFunctions";
import { getOperatingHours } from "../../services/clientApi";

const PassDateSelection = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [selectedDates, setSelectedDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [operatingHours, setOperatingHours] = useState([]);
  const passType = params.passType; // '1-day', '2-day', '3-day', '5-day', 'custom'
  const gymName = params.gymName || "Gym";
  const basePrice = params.discountPrice ? parseInt(params.discountPrice) : 0;
  const customDays = params.customDays ? parseInt(params.customDays) : 4;
  const isDailypassOfferActive = params.dailypass_offer_active === "true";
  const gymId = params?.gymId || null;

  useEffect(() => {
    if (!gymId) return;
    const fetchOperatingHours = async () => {
      try {
        const res = await getOperatingHours(gymId);
        if (res?.data && Array.isArray(res.data)) {
          setOperatingHours(res.data);
        }
      } catch (e) {}
    };
    fetchOperatingHours();
  }, [gymId]);

  const formatTimingSlot = (timing) => {
    try {
      const startTime = new Date(timing.startTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const endTime = new Date(timing.endTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const dayLabel = timing?.day || timing?.days || "";
      const formattedDay =
        dayLabel && typeof dayLabel === "string" && dayLabel.length > 0
          ? dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)
          : "";
      return { label: formattedDay, time: `${startTime} – ${endTime}` };
    } catch {
      return null;
    }
  };

  // Determine mode and number of days based on pass type
  const getCalendarMode = () => {
    if (passType === "1-day") return "continuous";
    if (passType === "5-day") return "continuous";
    return "continuous"; // for custom selection, also continuous
  };

  const getNumberOfDays = () => {
    if (passType === "1-day") return 1;
    if (passType === "2-day") return 2;
    if (passType === "3-day") return 3;
    if (passType === "5-day") return 5;
    return customDays; // for custom, use selected days
  };

  const calendarMode = getCalendarMode();
  const numberOfDays = getNumberOfDays();

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

      return () => subscription.remove();
    }, []),
  );

  const handleSelectionChange = (dates) => {
    setSelectedDates(dates);
  };

  const handleContinue = () => {
    const isValidSelection =
      passType === "1-day"
        ? selectedDates.length === 1
        : passType === "2-day"
          ? selectedDates.length === 2
          : passType === "3-day"
            ? selectedDates.length === 3
            : passType === "5-day"
              ? selectedDates.length === 5
              : selectedDates.length === customDays;

    if (!isValidSelection) {
      return;
    }

    // Calculate final amount
    const daysCount = selectedDates.length;
    // If offer is active (₹49 for 1-3 days), no additional discount
    // Otherwise, apply 10% discount for 5+ days
    const discount = 1;
    const finalAmount = pythonRound(basePrice * daysCount * discount);

    // Format start and end dates
    const startDateObj = selectedDates[0];
    const endDateObj = selectedDates[selectedDates.length - 1];

    const formatDateForParam = (date) => {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const startDate = formatDateForParam(startDateObj);
    const endDate = formatDateForParam(endDateObj);

    // Navigate to passpay page

    router.push({
      pathname: "/client/passpay",
      params: {
        ...params,
        days: daysCount,
        startDate: startDate,
        endDate: endDate,
        finalAmount: finalAmount,
        basePrice: basePrice,
        expectedTime: "09:00",
        type: "new",
        // Ensure we pass the offer flag with the correct parameter name
        dailypass_offer_eligible: isDailypassOfferActive ? "true" : "false",
      },
    });
  };

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
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  const getTitle = () => {
    if (passType === "1-day") return "Select 1 Date";
    if (passType === "2-day") return "Select 2 Dates";
    if (passType === "3-day") return "Select 3 Dates";
    if (passType === "5-day") return "Select 5 Dates";
    return `Select ${customDays} Dates`;
  };

  const getSubtitle = () => {
    if (passType === "1-day") return "Choose 1 day for your pass";
    if (passType === "5-day") return "Choose 5 continuous days for your pass";
    return `Choose ${customDays} continuous days for your pass`;
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{gymName}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <MaterialIcons name="event" size={30} color="#FF3B30" />
          <View>
            <Text style={styles.mainTitle}>{getTitle()}</Text>
            <Text style={styles.subtitle}>
              Choose the Start Date of Your Pass
            </Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <CustomCalendarContinuous
            numberOfDays={numberOfDays}
            mode={calendarMode}
            onSelectionChange={handleSelectionChange}
            availableDates={[]}
          />
        </View>

        {/* Available Timings */}
        {operatingHours?.length > 0 && (
          <View style={styles.timingsCard}>
            <View style={styles.timingsHeader}>
              <MaterialIcons name="schedule" size={16} color="#555" />
              <Text style={styles.timingsTitle}>Available Timings</Text>
            </View>
            <View style={styles.timingsGrid}>
              {(() => {
                const slots = operatingHours
                  .map((t) => formatTimingSlot(t))
                  .filter(Boolean);
                const rows = [];
                for (let i = 0; i < slots.length; i += 2) {
                  rows.push(slots.slice(i, i + 2));
                }
                return rows.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.timingsRow}>
                    {row.map((slot, colIndex) => (
                      <View key={colIndex} style={styles.timingChip}>
                        <Text style={styles.timingChipText}>
                          {slot.label ? `${slot.label}: ` : ""}
                          <Text style={{ color: "#007BFF", fontWeight: "500" }}>
                            {slot.time}
                          </Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                ));
              })()}
            </View>
          </View>
        )}

        {/* Selected Dates Section */}
        {selectedDates.length > 0 && (
          <View style={styles.selectedDatesSection}>
            <Text style={styles.selectedDatesTitle}>Selected Dates</Text>
            <View style={styles.selectedDatesContainer}>
              {selectedDates.map((date, index) => (
                <View key={index} style={styles.selectedDateChip}>
                  <Text style={styles.selectedDateText}>
                    {formatDate(date)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            ((passType === "1-day" && selectedDates.length !== 1) ||
              (passType === "2-day" && selectedDates.length !== 2) ||
              (passType === "3-day" && selectedDates.length !== 3) ||
              (passType === "5-day" && selectedDates.length !== 5) ||
              (passType === "custom" && selectedDates.length !== customDays) ||
              loading) &&
              styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={
            (passType === "1-day" && selectedDates.length !== 1) ||
            (passType === "2-day" && selectedDates.length !== 2) ||
            (passType === "3-day" && selectedDates.length !== 3) ||
            (passType === "5-day" && selectedDates.length !== 5) ||
            (passType === "custom" && selectedDates.length !== customDays) ||
            loading
          }
        >
          <Text style={styles.continueButtonText}>
            {loading ? "Processing..." : "Continue to payment"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default PassDateSelection;

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
  calendarContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 10,
  },
  selectedDatesSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  selectedDatesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  selectedDatesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedDateChip: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectedDateText: {
    color: "#414040",
    fontSize: 14,
    fontWeight: "600",
  },
  continueButton: {
    backgroundColor: "#FF3B30",
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
  timingsCard: {
    marginHorizontal: 6,
    marginBottom: 12,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    paddingHorizontal: 8,
  },
  timingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  timingsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  timingsGrid: {
    gap: 4,
  },
  timingsRow: {
    flexDirection: "row",
    gap: 4,
  },
  timingChip: {
    flex: 1,
    backgroundColor: "#F2F2F2",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  timingChipText: {
    fontSize: 11,
    color: "#444",
    textAlign: "center",
  },
});
