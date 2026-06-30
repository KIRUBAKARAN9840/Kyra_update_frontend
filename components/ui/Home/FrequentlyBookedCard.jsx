import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import styles from "./homeStyles";

const FrequentlyBookedCard = ({ gym, onBookAgain }) => {
  if (!gym) return null;

  return (
    <View style={styles.freqBookedWrap}>
      {/* Section heading */}
      <LinearGradient
        colors={["#F4F4F4", "rgba(244,244,244,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.freqBookedHeading}
      >
        <Text style={[styles.sectionHeading, { textAlign: "left" }]}>Quick Book</Text>
      </LinearGradient>

      <TouchableOpacity
        style={styles.freqBookedCard}
        activeOpacity={0.88}
        onPress={() => onBookAgain(gym)}
      >
        {/* Daily Pass badge - absolute top right */}
        <View style={styles.freqBookedBadge}>
          <Text style={styles.freqBookedBadgeText}>Daily Pass</Text>
        </View>

        {/* Cover image with fade */}
        <View style={styles.freqBookedImageWrap}>
          <Image
            source={{
              uri:
                gym.cover_pic ||
                "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/Gym_Studios/default_gym_mage.png",
            }}
            style={styles.freqBookedImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={["transparent", "#FFFFFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.freqBookedImageFade}
          />
        </View>

        {/* Right side content */}
        <View style={styles.freqBookedContent}>
          <Text style={styles.freqBookedGymName} numberOfLines={1}>
            {gym.gym_name}
          </Text>

          {/* Location row */}
          <View style={styles.freqBookedLocationRow}>
            <Ionicons name="location-outline" size={12} color="#888" />
            <Text style={styles.freqBookedLocationText} numberOfLines={1}>
              {gym.area}
              {gym.distance_km != null ? ` • ${gym.distance_km} km` : ""}
            </Text>
          </View>

          {/* Booked info */}
          <Text style={styles.freqBookedInfo}>
            Booked {gym.booking_count}{" "}
            {gym.booking_count === 1 ? "Time" : "Times"}
            {gym.last_booked_days_ago != null
              ? ` • ${gym.last_booked_days_ago} ${gym.last_booked_days_ago === 1 ? "day" : "days"} ago`
              : ""}
          </Text>

          {/* Price + Book Again */}
          <View style={styles.freqBookedBottomRow}>
            <Text style={styles.freqBookedPrice}>
              ₹{gym.dailypass_price}/ day
            </Text>
            <TouchableOpacity
              style={styles.freqBookedBtn}
              activeOpacity={0.8}
              onPress={() => onBookAgain(gym)}
            >
              <Text style={styles.freqBookedBtnText}>Book Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default FrequentlyBookedCard;
