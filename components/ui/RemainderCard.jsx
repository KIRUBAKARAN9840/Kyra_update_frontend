import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];

const formatTo12Hour = (timeString) => {
  if (!timeString) return "";

  if (timeString.includes("AM") || timeString.includes("PM")) {
    return timeString;
  }

  try {
    const [hours, minutes] = timeString.split(":");
    let hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour || 12;
    return `${hour}:${minutes} ${ampm}`;
  } catch (e) {
    return timeString;
  }
};

const ReminderCard = ({ reminder, onDelete }) => {
  const getIcon = (type) => {
    switch (type) {
      case "water":
        return "water";
      case "diet":
        return "nutrition";
      case "gym":
        return "fitness";
      default:
        return "alarm";
    }
  };

  const getColors = (type) => {
    switch (type) {
      case "water":
        return ["#90CAF9", "#64B5F6"];
      case "diet":
        return ["#A5D6A7", "#81C784"];
      case "gym":
        return ["#FFCC80", "#FFB74D"];
      case "others":
        return ["#6C5CE7", "#0F00AF"];
      default:
        return ["#CE93D8", "#BA68C8"];
    }
  };

  const getGradientColors = (type) => {
    switch (type) {
      case "water":
        return ["#0154A0", "#030A15"];
      case "diet":
        return ["#28A745", "#007BFF"];
      case "gym":
        return ["#AD5389", "#3C1053"];
      case "others":
        return ["#6C5CE7", "#0F00AF"];
      default:
        return ["#CE93D8", "#BA68C8"];
    }
  };

  const getTypeBackground = (type) => {
    switch (type) {
      case "water":
        return "#E3F2FD";
      case "diet":
        return "#E8F5E9";
      case "gym":
        return "rgba(173, 83, 137, 0.50)";
      case "others":
        return "#EEEDF9";
      default:
        return "#F3E5F5";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "water":
        return "#1976D2";
      case "diet":
        return "#388E3C";
      case "gym":
        return "#3C1053";
      case "others":
        return "#6C5CE7";
      default:
        return "#7B1FA2";
    }
  };

  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;
  const formattedStartTime = formatTo12Hour(reminder.intimation_start_time);
  const formattedEndTime = formatTo12Hour(reminder.intimation_end_time);
  const formattedTime = formatTo12Hour(reminder.reminder_time);

  const getOthersTimeDayIndex = () => {
    if (
      reminder.reminder_mode === "others" &&
      !reminder.is_recurring &&
      reminder.others_time
    ) {
      const othersDate = new Date(reminder.others_time);
      const othersDay = othersDate.getDay();
      return othersDay === 0 ? 6 : othersDay - 1;
    }
    return null;
  };

  const othersTimeDayIndex = getOthersTimeDayIndex();

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);

    // Get day, month, year
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    // Get hours and determine AM/PM
    let hours = date.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12

    // Get minutes
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day}-${month}-${year} at ${hours}:${minutes}${ampm}`;
  };

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={getColors(reminder.reminder_mode)}
            style={styles.iconBackground}
          >
            <Ionicons
              name={getIcon(reminder.reminder_mode)}
              size={24}
              color="#FFFFFF"
            />
          </LinearGradient>
        </View>
        <View style={styles.titleContainer}>
          {/* MaskedView for the title */}
          <MaskedView
            style={styles.maskedTitle}
            maskElement={<Text style={styles.title}>{reminder.title}</Text>}
          >
            <LinearGradient
              colors={getGradientColors(reminder.reminder_mode)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.title, styles.transparentText]}>
                {reminder.title}
              </Text>
            </LinearGradient>
          </MaskedView>
          <Text style={styles.details}>{reminder.details}</Text>
          <Text style={styles.time}>
            {reminder.reminder_mode === "diet" ||
            reminder.reminder_mode == "others"
              ? reminder.reminder_mode == "others" && !reminder.is_recurring
                ? formatDateTime(reminder.others_time)
                : formattedTime
              : `${formattedStartTime} - ${formattedEndTime}`}
          </Text>
        </View>
        <View style={styles.actionsContainer}>
          <MaskedView
            style={styles.maskedIcon}
            maskElement={
              <View style={styles.actionButtonMask}>
                <Ionicons name="notifications" size={18} color="black" />
              </View>
            }
          >
            <LinearGradient
              colors={getGradientColors(reminder.reminder_mode)}
              style={styles.iconGradient}
            >
              <View style={styles.transparentIconContainer} />
            </LinearGradient>
          </MaskedView>

          {/* MaskedView for trash icon */}
          <MaskedView
            style={styles.maskedIcon}
            maskElement={
              <View style={styles.actionButtonMask}>
                <Ionicons name="trash-outline" size={18} color="black" />
              </View>
            }
          >
            <LinearGradient
              colors={getGradientColors(reminder.reminder_mode)}
              style={styles.iconGradient}
            >
              <TouchableOpacity
                style={styles.transparentIconContainer}
                onPress={() => onDelete(reminder.id)}
              />
            </LinearGradient>
          </MaskedView>
        </View>
      </View>

      <View style={styles.daysContainer}>
        {daysOfWeek.map((day, index) => {
          let isActive = false;

          if (reminder.is_recurring === true) {
            // If recurring, all days are active
            isActive = true;
          } else if (
            reminder.reminder_mode === "others" &&
            !reminder.is_recurring
          ) {
            // If others mode and not recurring, only highlight the specific day from others_time
            isActive = index === othersTimeDayIndex;
          } else {
            // For non-recurring reminders (except others), highlight today
            isActive = index === todayIndex;
          }

          return isActive ? (
            <LinearGradient
              key={index}
              colors={getGradientColors(reminder.reminder_mode)}
              style={styles.dayCircle}
            >
              <Text style={[styles.dayText, { color: "#FFFFFF" }]}>{day}</Text>
            </LinearGradient>
          ) : (
            <View
              key={index}
              style={[styles.dayCircle, { backgroundColor: "#E0E0E0" }]}
            >
              <Text style={[styles.dayText, { color: "#757575" }]}>{day}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.typeContainer}>
        <View
          style={[
            styles.typeTag,
            { backgroundColor: getTypeBackground(reminder.reminder_mode) },
          ]}
        >
          <Text
            style={[
              styles.typeText,
              { color: getTypeColor(reminder.reminder_mode) },
            ]}
          >
            {reminder.reminder_mode == "gym"
              ? reminder.reminder_mode.charAt(0).toUpperCase() +
                reminder.reminder_mode.slice(1) +
                " Crowd"
              : reminder.reminder_mode.charAt(0).toUpperCase() +
                reminder.reminder_mode.slice(1)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 25,
    paddingHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
    overflow: "hidden",
    borderWidth: Platform.OS === "ios" ? 1 : 0,
    borderColor: "#ddd",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderColor: "rgba(0, 0, 0, 0.29)",
    borderBottomWidth: 0.5,
    paddingBottom: 10,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
  },
  maskedTitle: {
    height: 20,
    marginBottom: 5,
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0A1158",
  },
  transparentText: {
    opacity: 0,
  },
  details: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  time: {
    fontSize: 12,
    color: "#999",
  },
  actionsContainer: {
    flexDirection: "row",
  },
  actionButton: {
    marginLeft: 8,
    padding: 4,
  },
  maskedIcon: {
    width: 26,
    height: 26,
    marginLeft: 8,
  },
  actionButtonMask: {
    flex: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  iconGradient: {
    flex: 1,
  },
  transparentIconContainer: {
    width: "100%",
    height: "100%",
  },
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 10,
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  typeContainer: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  typeTag: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderBottomLeftRadius: 15,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default ReminderCard;
