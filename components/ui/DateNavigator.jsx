import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import WeekdayButton from "./WeekdayButton";

const { width, height } = Dimensions.get("window");

// Function to determine if device is tablet
const isTablet = () => {
  const aspectRatio = height / width;
  return width >= 768 || (width >= 600 && aspectRatio < 1.6);
};

const DateNavigator = ({
  selectedDate,
  today,
  navigateDate,
  setShowDatePicker,
  selectDayFromStrip,
}) => {
  const deviceIsTablet = isTablet();

  const generateWeekDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentDate = new Date(selectedDate);
    const currentDay = currentDate.getDay();

    currentDate.setDate(currentDate.getDate() - 3);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      weekDays.push({
        day: days[date.getDay()],
        date: date.getDate(),
        fullDate: new Date(date),
        isActive: date.toDateString() === selectedDate.toDateString(),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return weekDays;
  };

  const formatHeaderDate = (date) => {
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
    const day = date.getDate();
    const month = months[date.getMonth()];

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${month} ${day}`;
    }
    return `${month} ${day}`;
  };

  const isFutureDate = (date) => {
    return new Date(date).setHours(0, 0, 0, 0) > today.setHours(0, 0, 0, 0);
  };

  return (
    <View style={styles.dateHeader}>
      <View style={styles.dateNavigator}>
        <TouchableOpacity onPress={() => navigateDate(-1)}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateHeaderText}>
            {formatHeaderDate(selectedDate)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigateDate(1)}
          disabled={selectedDate.toDateString() === today.toDateString()}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={
              selectedDate.toDateString() === today.toDateString()
                ? "#ccc"
                : "#000"
            }
          />
        </TouchableOpacity>
      </View>

      {/* Responsive weekday strip */}
      {deviceIsTablet ? (
        // For tablets: Center the days without scrolling
        <View style={styles.weekDayStripTablet}>
          {generateWeekDays().map((item, index) => (
            <WeekdayButton
              key={index}
              day={item.day}
              date={item.date}
              isActive={item.isActive}
              disabled={isFutureDate(item.fullDate)}
              onPress={() => {
                if (!isFutureDate(item.fullDate)) {
                  selectDayFromStrip(item.fullDate);
                }
              }}
            />
          ))}
        </View>
      ) : (
        // For mobile: Keep scrollable horizontal strip
        <ScrollView
          horizontal
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.weekDayStrip}
        >
          {generateWeekDays().map((item, index) => (
            <WeekdayButton
              key={index}
              day={item.day}
              date={item.date}
              isActive={item.isActive}
              disabled={isFutureDate(item.fullDate)}
              onPress={() => {
                if (!isFutureDate(item.fullDate)) {
                  selectDayFromStrip(item.fullDate);
                }
              }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dateNavigator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingTop: 12,
    paddingHorizontal: 10,
  },
  dateHeader: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    backgroundColor: "white",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderRadius: 15,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Mobile weekday strip (original)
  weekDayStrip: {
    paddingLeft: 8,
    paddingTop: 10,
    paddingBottom: 16,
  },
  // New tablet weekday strip (centered)
  weekDayStripTablet: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  weekdayButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: "rgba(0, 123, 255, 0.06)",
  },
  activeWeekdayButton: {
    backgroundColor: "#007BFF",
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "400",
  },
  weekdayLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  activeWeekdayText: {
    color: "white",
  },
  activeWeekdayLabel: {
    color: "#007BFF",
  },
});

export default DateNavigator;
