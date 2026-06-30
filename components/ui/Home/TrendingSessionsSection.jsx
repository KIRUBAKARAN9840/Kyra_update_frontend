import React, { useRef } from "react";
import { View, Text, TouchableOpacity, ImageBackground } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import AutoScrollCards from "./AutoScrollCards";
import SkeletonBox from "./SkeletonBox";
import {
  width,
  CARD_GAP,
  SESSION_IMAGES,
  DEFAULT_SESSION_IMAGE,
} from "./constants";
import styles from "./homeStyles";

const TrendingSessionsSection = ({
  homeLoading,
  noGyms,
  nearbySessions,
  nextDay,
  goAllClass,
  viewAllLottieRef,
}) => {
  const router = useRouter();

  if (noGyms) return null;

  const renderSkeleton = () => (
    <View style={[styles.section, { paddingBottom: 16 }]}>
      <SkeletonBox
        style={{
          width: "100%",
          height: 44,
          borderRadius: 12,
          marginBottom: 14,
        }}
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <SkeletonBox
          style={{
            width: (width - 20 - 10) / 2,
            height: Math.round(((width - 32 - 10) / 2) * 0.7),
            borderRadius: 14,
          }}
        />
        <SkeletonBox
          style={{
            width: (width - 20 - 10) / 2,
            height: Math.round(((width - 32 - 10) / 2) * 0.7),
            borderRadius: 14,
          }}
        />
      </View>
    </View>
  );

  const renderSessions = () => {
    if (!nearbySessions || nearbySessions.length === 0) return null;
    return (
      <View style={styles.section}>
        <LinearGradient
          colors={["#F4F4F4", "rgba(244,244,244,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.membershipHeadingCard, { marginHorizontal: -10 }]}
        >
          <TouchableOpacity
            style={styles.sectionTitleRow}
            onPress={goAllClass}
            activeOpacity={0.7}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
              }}
            >
              <Text
                style={[
                  styles.sectionHeading,
                  { marginBottom: 0, textAlign: "left" },
                ]}
              >
                Fitness classes near you
              </Text>
              <Image
                source={require("../../../assets/images/home/fitness_class.png")}
                style={{ width: 40, height: 23 }}
                contentFit="contain"
              />
            </View>
            <TouchableOpacity
              style={styles.viewAllInline}
              activeOpacity={0.7}
              onPress={goAllClass}
            >
              <Text style={styles.viewAll}>See All</Text>
              <Ionicons name="chevron-forward" size={14} color="#007AFF" />
            </TouchableOpacity>
          </TouchableOpacity>
        </LinearGradient>
        <AutoScrollCards itemCount={nearbySessions.length}>
          {nearbySessions.map((item) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.88}
              style={[styles.trendingCardShadow, { marginRight: CARD_GAP }]}
              onPress={() => {
                const istOffsetMs = 5.5 * 60 * 60 * 1000;
                const target = new Date(
                  Date.now() +
                    istOffsetMs +
                    (nextDay ? 24 * 60 * 60 * 1000 : 0),
                );
                const yyyy = target.getUTCFullYear();
                const mm = String(target.getUTCMonth() + 1).padStart(2, "0");
                const dd = String(target.getUTCDate()).padStart(2, "0");
                const slotDateIST = `${yyyy}-${mm}-${dd}`;

                const params = {
                  gymId: String(item.gym_id),
                  gymName: item.gym_name,
                  sessionId: String(item.session_id),
                  sessionName: item.session_name || "",
                  scheduleId: String(item.schedule_id),
                  slotTime: `${item.start_time} - ${item.end_time}`,
                  trainerId: item?.trainer_id ? String(item.trainer_id) : null,
                  selectedDates: JSON.stringify([slotDateIST]),
                };
                router.push({
                  pathname: item.trainer_id
                    ? "/client/(pt)/ptCheckout"
                    : "/client/(fitnessclass)/sessionCheckout",
                  params,
                });
              }}
            >
              <View style={styles.trendingCard}>
                <ImageBackground
                  source={
                    SESSION_IMAGES[item.session_name] || DEFAULT_SESSION_IMAGE
                  }
                  style={styles.trendingCardBg}
                  imageStyle={{ borderRadius: 14 }}
                  resizeMode="cover"
                >
                  <View style={styles.trendingCardTop}>
                    <Text style={styles.trendingCardTitle}>
                      {item.session_name}
                    </Text>
                    <Text style={styles.trendingCardSlots}>
                      {item?.distance_km} km away
                    </Text>
                  </View>
                  <View style={styles.trendingCardBottom}>
                    <View>
                      <Text style={styles.trendingStartAt}>
                        {nextDay ? "Tomorrow at" : "Start at"}
                      </Text>
                      <View style={styles.trendingTimeRow}>
                        <Ionicons
                          name="time-outline"
                          size={13}
                          color="#FF5757"
                          style={styles.trendingTimeIcon}
                        />
                        <Text style={styles.trendingTime}>
                          {item.start_time}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.trendingPricePill}>
                      <Text style={styles.trendingPriceText}>
                        ₹{item.price} only
                      </Text>
                    </View>
                  </View>
                </ImageBackground>
              </View>
            </TouchableOpacity>
          ))}
        </AutoScrollCards>
      </View>
    );
  };

  return (
    <>
      {homeLoading ? renderSkeleton() : renderSessions()}

      <View style={styles.categoryPillRow}>
        {[
          {
            label: "Personal Trainer",
            route: "/client/(pt)/listtrainers",
            params: null,
          },
          {
            label: "Yoga Class",
            route: "/client/(fitnessclass)/listclass",
            params: { session_id: 3, session_name: "Yoga" },
          },
        ].map(({ label, route, params }) => (
          <TouchableOpacity
            key={label}
            style={styles.categoryPill}
            activeOpacity={0.75}
            onPress={() =>
              router.push({ pathname: route, params: params ?? {} })
            }
          >
            <Text style={styles.categoryPillText}>{label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.categoryPillViewAll}
          activeOpacity={0.75}
          onPress={goAllClass}
        >
          <LottieView
            ref={viewAllLottieRef}
            source={require("../../../assets/gif/view_all.json")}
            autoPlay={false}
            loop
            renderToHardwareTextureAndroid
            style={{ width: "100%", height: "100%" }}
          />
        </TouchableOpacity>
      </View>
    </>
  );
};

export default TrendingSessionsSection;
