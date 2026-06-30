import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { width } from "./constants";
import SkeletonBox from "./SkeletonBox";
import styles from "./homeStyles";

const MembershipSection = ({
  homeLoading,
  noGyms,
  nearbyMemberships,
  goListAll,
}) => {
  const router = useRouter();

  if (noGyms) return null;

  if (homeLoading) {
    return (
      <View style={[styles.memPassSection, { paddingHorizontal: 14 }]}>
        <SkeletonBox style={{ width: 180, height: 50, marginBottom: 12 }} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SkeletonBox style={{ width: 160, height: 220, borderRadius: 14 }} />
          <SkeletonBox style={{ width: 160, height: 220, borderRadius: 14 }} />
          <SkeletonBox style={{ width: 160, height: 220, borderRadius: 14 }} />
        </View>
      </View>
    );
  }

  if (!nearbyMemberships || nearbyMemberships.length === 0) return null;

  return (
    <View style={styles.memPassSection}>
      <TouchableOpacity
        style={styles.memPassHeaderRow}
        onPress={goListAll}
        activeOpacity={0.7}
      >
        <Image
          source={require("../../../assets/images/home/membership.webp")}
          style={styles.memPassHeadingImg}
          contentFit="contain"
        />
        <TouchableOpacity
          style={styles.memPassSeeAll}
          activeOpacity={0.7}
          onPress={goListAll}
        >
          <Text style={styles.memPassSeeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={18} color="#FF561D" />
        </TouchableOpacity>
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.memPassScrollContent}
      >
        {nearbyMemberships.map((gym) => (
          <TouchableOpacity
            key={gym.gym_id}
            activeOpacity={0.88}
            style={styles.memPassCardShadow}
            onPress={() =>
              router.push({
                pathname: "/client/(membership)/payment",
                params: {
                  plan_id: gym.plan_id.toString(),
                  gym_id: gym.gym_id.toString(),
                },
              })
            }
          >
            <View style={styles.memPassCard}>
              <View style={styles.memPassImageWrap}>
                <Image
                  source={{
                    uri:
                      gym.cover_pic ||
                      "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/Gym_Studios/default_gym_mage.png",
                  }}
                  style={styles.memPassImage}
                  contentFit="cover"
                />
              </View>
              <View style={styles.memPassInfo}>
                <Text style={styles.memPassGymName} numberOfLines={1}>
                  {gym.gym_name}
                </Text>
                <Text style={styles.memPassGymLocation} numberOfLines={1}>
                  {gym.gym_area}
                </Text>
                <View style={styles.memPassDistanceRow}>
                  <Ionicons name="location" size={11} color="#FF561D" />
                  <Text style={styles.memPassDistance}>
                    {gym.distance_km} km away
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.memPassBtn}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/client/(membership)/payment",
                    params: {
                      plan_id: gym.plan_id.toString(),
                      gym_id: gym.gym_id.toString(),
                    },
                  })
                }
              >
                <Text style={styles.memPassBtnText}>
                  ₹{gym?.per_month_price}/month*
                </Text>
                <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.memPassPlanLabel}>
                on {gym?.duration} month{gym?.duration !== 1 ? "s" : ""} plan
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.memPassTagline}>
        Buy Now. Start Anytime. No Pressure.
      </Text>
    </View>
  );
};

export default MembershipSection;
