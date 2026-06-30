import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  BackHandler,
  ScrollView,
  Modal,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import SessionCalendar from "../../../components/ui/SessionCalendar";
import { showToast } from "../../../utils/Toaster";
import {
  getAvailableSessionDaysAPI,
  sendSelectedDatesAPI,
} from "../../../services/clientApi";
import DateSelectionSkeleton from "../../../components/ui/loaders/DateSelectionSkeleton";

const DateSelection = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [selectedDates, setSelectedDates] = useState([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipShown, setTooltipShown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableDays, setAvailableDays] = useState([]);
  const passType = params.passType; // '1-session', '5-session', 'custom-dates'
  const sessionName = params.sessionName;
  const sessionId = params.sessionId;

  // Determine max selections based on pass type
  const getMaxSelections = () => {
    if (passType === "1-session") return 1;
    if (passType === "5-session") return 5;
    return null; // unlimited for custom
  };

  const maxSelections = getMaxSelections();

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

  const fetchAllDays = async () => {
    setLoading(true);
    try {
      const gymId = params.gymId;
      const trainer_id = params.trainer_id || null;
      if (!sessionId || !gymId) {
        showToast({
          type: "error",
          title: "Error fetching Dates",
        });
        setLoading(false);
        return;
      }
      const response = await getAvailableSessionDaysAPI(
        gymId,
        sessionId,
        trainer_id,
      );

      if (response?.status === 200) {
        // Extract dates array from response
        const dates = response.data?.dates || [];
        setAvailableDays(dates);
      } else {
        showToast({
          type: "error",
          title: "Error fetching Dates",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error fetching Dates",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDays();
  }, []);

  const handleSelectionChange = (dates) => {
    setSelectedDates(dates);

    // Show tooltip only the first time when max selections are reached
    if (maxSelections && dates.length === maxSelections && !tooltipShown) {
      setShowTooltip(true);
      setTooltipShown(true);
      setTimeout(() => setShowTooltip(false), 3000);
    }
  };

  const handleContinue = async () => {
    const isValidSelection =
      passType === "1-session"
        ? selectedDates.length === 1
        : passType === "5-session"
          ? selectedDates.length === 5
          : selectedDates.length > 0;

    if (!isValidSelection) {
      return;
    }

    // Convert selected dates to SQL format (YYYY-MM-DD)
    const formattedDates = selectedDates.map((date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    });

    // Send selected dates to API
    setLoading(true);
    try {
      const payload = {
        session_id: sessionId,
        gym_id: params.gymId,
        dates: formattedDates,
        trainer_id: params.trainer_id || null,
      };

      const response = await sendSelectedDatesAPI(payload);

      if (response?.status === 200) {
        // Navigate to time selection with slots data
        router.push({
          pathname: "/client/(sessions)/timeSelection",
          params: {
            ...params,
            selectedDates: JSON.stringify(
              selectedDates.map((d) => d.toISOString()),
            ),
            numberOfDays: selectedDates.length,
            slotsData: JSON.stringify(response.data),
          },
        });
      } else {
        showToast({
          type: "error",
          title: "Error sending dates",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error sending dates",
      });
    } finally {
      setLoading(false);
    }
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
    if (passType === "1-session") return "Select 1 Date";
    if (passType === "5-session") return "Select 5 Dates";
    return "Select Your Dates";
  };

  const getSubtitle = () => {
    if (passType === "1-session") return "Choose 1 day for your 1 Session";
    if (passType === "5-session") return "Choose 5 days for your 5 Sessions";
    return "Choose any number of days";
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
          <MaterialIcons name="event" size={30} color="#FF3B30" />
          <View>
            <Text style={styles.mainTitle}>Select Your Dates</Text>
            <Text style={styles.subtitle}>{getSubtitle()}</Text>
          </View>
        </View>

        {/* Calendar */}
        {loading ? (
          <DateSelectionSkeleton />
        ) : (
          <View style={styles.calendarContainer}>
            <SessionCalendar
              maxSelections={maxSelections}
              onSelectionChange={handleSelectionChange}
              availableDates={availableDays}
            />
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
            ((passType === "1-session" && selectedDates.length !== 1) ||
              (passType === "5-session" && selectedDates.length !== 5) ||
              (passType === "custom-dates" && selectedDates.length === 0) ||
              loading) &&
              styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={
            (passType === "1-session" && selectedDates.length !== 1) ||
            (passType === "5-session" && selectedDates.length !== 5) ||
            (passType === "custom-dates" && selectedDates.length === 0) ||
            loading
          }
        >
          <Text style={styles.continueButtonText}>
            {loading ? "Sending..." : "Continue to time selection"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tooltip Modal */}
      <Modal
        transparent={true}
        visible={showTooltip}
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <TouchableOpacity
          style={styles.tooltipOverlay}
          activeOpacity={1}
          onPress={() => setShowTooltip(false)}
        >
          <View style={styles.tooltipContainer}>
            <MaterialIcons name="info" size={24} color="#FFF" />
            <Text style={styles.tooltipText}>
              {maxSelections === 1
                ? "Maximum days reached. If you select more, initial selection will be unselected.Choose Custom Days for more flexibility."
                : `Maximum days reached. If you select more, initial selection will be unselected.Choose Custom Days for more flexibility.`}
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default DateSelection;

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
  tooltipOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  tooltipContainer: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  tooltipText: {
    color: "#FFF",
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});
