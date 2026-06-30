import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { width } from "./constants";
import SkeletonBox from "./SkeletonBox";
import styles from "./homeStyles";

const DailyPassSection = ({
  homeLoading,
  noGyms,
  dailyPassGyms,
  goListGyms,
  onCardPress,
  onBookPress,
}) => {
  if (noGyms) return null;

  if (homeLoading) {
    return (
      <View style={[styles.dailyPassSection, { paddingHorizontal: 14 }]}>
        <SkeletonBox style={{ width: 180, height: 50, marginBottom: 12 }} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SkeletonBox style={{ width: 160, height: 220, borderRadius: 14 }} />
          <SkeletonBox style={{ width: 160, height: 220, borderRadius: 14 }} />
          <SkeletonBox style={{ width: 160, height: 220, borderRadius: 14 }} />
        </View>
      </View>
    );
  }

  if (!dailyPassGyms || dailyPassGyms.length === 0) return null;

  return (
    <View style={styles.dailyPassSection}>
      {/* Header row: heading image + See All */}
      <TouchableOpacity
        style={styles.dailyPassHeaderRow}
        onPress={goListGyms}
        activeOpacity={0.7}
      >
        <Image
          source={require("../../../assets/images/home/daily_pass.webp")}
          style={styles.dailyPassHeadingImg}
          contentFit="contain"
        />
        <TouchableOpacity
          style={styles.dailyPassSeeAll}
          activeOpacity={0.7}
          onPress={goListGyms}
        >
          <Text style={styles.dailyPassSeeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={18} color="#FF5757" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Horizontal scrollable gym cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dailyPassScrollContent}
      >
        {dailyPassGyms.map((gym, index) => (
          <TouchableOpacity
            key={gym.gym_id}
            activeOpacity={0.88}
            style={styles.dailyPassCardShadow}
            onPress={() => onCardPress(gym)}
          >
            <View style={styles.dailyPassCard}>
              <View style={styles.dailyPassImageWrap}>
                <Image
                  source={{
                    uri:
                      gym.cover_pic ||
                      "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/Gym_Studios/default_gym_mage.png",
                  }}
                  style={styles.dailyPassImage}
                  contentFit="cover"
                />
                {gym?.previously_booked && (
                  <LinearGradient
                    colors={["rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(0,0,0,1)"]}
                    style={styles.dailyPassImageOverlay}
                  >
                    <View style={styles.dailyPassPrevBookedRow}>
                      <View style={styles.dailyPassStarCircle}>
                        <Ionicons name="star" size={8} color="#000000" />
                      </View>
                      <Text style={styles.dailyPassPrevBooked}>
                        Previously Booked
                      </Text>
                    </View>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.dailyPassInfo}>
                <Text style={styles.dailyPassGymName} numberOfLines={1}>
                  {gym.gym_name}
                </Text>
                <Text style={styles.dailyPassGymLocation} numberOfLines={1}>
                  {gym.area}
                </Text>
                <View style={styles.dailyPassDistanceRow}>
                  <Ionicons name="location" size={11} color="#FF5757" />
                  <Text style={styles.dailyPassDistance}>
                    {gym.distance_km} km away
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.dailyPassBtn}
                activeOpacity={0.8}
                onPress={() => onBookPress(gym)}
              >
                <Text style={styles.dailyPassBtnText}>
                  ₹{gym?.dailypass_price}/ day
                </Text>
                <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.dailyPassTagline}>Access Premium Gyms</Text>
    </View>
  );
};

export default DailyPassSection;
