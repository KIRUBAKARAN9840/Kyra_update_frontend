import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import styles from "./homeStyles";

const getBookingLabel = (b) => {
  if (!b) return null;
  const { dailypass, sessions, gym_membership } = b;
  const parts = [];
  if (dailypass) parts.push("Daily Pass");
  if (sessions) parts.push("Fitness Class");
  if (gym_membership) parts.push("Membership");
  return parts.join(" & ") + " Bookings";
};

const ActiveBookingsBanner = ({ bookings, onViewBookings }) => {
  if (!bookings) return null;

  return (
    <TouchableOpacity
      style={styles.welcomeCreditCardBooking}
      activeOpacity={0.8}
      onPress={onViewBookings}
    >
      <LinearGradient
        colors={["#6E3A951A", "#4468C91A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.welcomeCreditGradient}
      >
        <View style={styles.welcomeCreditTopRow}>
          <Text
            style={[styles.welcomeCreditTagBooking, { color: "#000000" }]}
          >
            My Bookings
          </Text>
        </View>

        <Text
          style={[
            styles.welcomeCreditTitle,
            { fontSize: 16, color: "#000000" },
          ]}
        >
          You have{" "}
          <Text
            style={[styles.welcomeCreditHighlight, { color: "#000000" }]}
          >
            {getBookingLabel(bookings)}
          </Text>
        </Text>

        <TouchableOpacity
          style={[
            styles.welcomeCreditPill,
            { borderRadius: 8, paddingVertical: 6 },
          ]}
          activeOpacity={0.8}
          onPress={onViewBookings}
        >
          <Ionicons name="calendar-outline" size={14} color="#6A1FA8" />
          <Text
            style={[styles.welcomeCreditPillText, { color: "#6A1FA8" }]}
          >
            View Bookings
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default ActiveBookingsBanner;
