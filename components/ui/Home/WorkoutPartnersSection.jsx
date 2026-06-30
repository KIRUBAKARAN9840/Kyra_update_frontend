import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { sendFriendRequestAPI } from "../../../services/clientApi";
import styles from "./homeStyles";

const CARD_WIDTH = 220;
const CARD_HEIGHT = 280;

const getBadgeLabel = (item) => {
  if (item.suggestion_type === "match" && item.match_percentage != null)
    return `${item.match_percentage}% Match`;
  if (item.suggestion_type === "mutual" && item.mutual_count != null)
    return `${item.mutual_count} mutual friend${item.mutual_count === 1 ? "" : "s"}`;
  return "Suggested for you";
};

const PartnerCard = ({
  item,
  onCardPress,
  onboardingCompleted,
  onNotOnboarded,
  onSent,
}) => {
  const [sent, setSent] = useState(false);
  const sendingRef = useRef(false);

  const handleConnect = async (e) => {
    e.stopPropagation();
    if (!onboardingCompleted) {
      onNotOnboarded?.();
      return;
    }
    if (sendingRef.current || sent) return;
    sendingRef.current = true;
    try {
      const res = await sendFriendRequestAPI(item.client_id);
      if (res?.status === 200) {
        setSent(true);
        setTimeout(() => onSent?.(item.client_id), 600);
      }
    } catch {
      // silently fail
    } finally {
      sendingRef.current = false;
    }
  };

  return (
    <TouchableOpacity
      key={item.sno ?? item.client_id}
      style={styles.wpCardShadow}
      activeOpacity={0.85}
      onPress={() => onCardPress?.(item.client_id)}
    >
      <View style={[styles.wpCard, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={styles.wpCardImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.wpCardPlaceholder}>
            <Ionicons name="person" size={65} color="rgba(255,255,255,0.6)" />
          </View>
        )}

        {/* Badge - top right */}
        <View style={[styles.wpMatchBadge, getBadgeLabel(item) === "Suggested for you" && { backgroundColor: "#ED7E00" }]}>
          <Text style={styles.wpMatchText}>{getBadgeLabel(item)}</Text>
        </View>

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.85)"]}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 0, y: 1 }}
          style={styles.wpCardOverlay}
        >
          <Text style={styles.wpCardName} numberOfLines={1}>
            {item.name}
          </Text>

          <Text style={styles.wpCardBio} numberOfLines={1}>
            {item.bio || "Looking for a gym mate on Fymble!"}
          </Text>

          <View style={styles.wpTagRow}>
            {(item.details || []).slice(0, 2).map((tag) => (
              <View key={tag} style={styles.wpTag}>
                <Text style={styles.wpTagText}>{tag}</Text>
              </View>
            ))}
          </View>

          {sent ? (
            <View style={[styles.wpAddBtn, { backgroundColor: "#4CAF50" }]}>
              <Ionicons name="checkmark-circle" size={14} color="#FFF" />
              <Text style={styles.wpAddBtnText}>Request Sent</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.wpAddBtn}
              activeOpacity={0.85}
              onPress={handleConnect}
            >
              <Ionicons name="person-add-outline" size={14} color="#FFF" />
              <Text style={styles.wpAddBtnText}>Add Friend</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
};

const WorkoutPartnersSection = ({
  suggestions,
  onboardingCompleted,
  onCardPress,
  onNotOnboarded,
  onSeeAll,
  onSent,
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <View style={styles.wpSection}>
      <LinearGradient
        colors={["#F4F4F4", "rgba(244,244,244,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.membershipHeadingCard, { marginHorizontal: -10 }]}
      >
        <View style={styles.sectionTitleRow}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text
              style={[
                styles.sectionHeading,
                { marginBottom: 0, textAlign: "left" },
              ]}
            >
              Meet workout partners near you
            </Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllInline}
            activeOpacity={0.7}
            onPress={onSeeAll}
          >
            <Text style={styles.viewAll}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.wpScrollContent}
      >
        {suggestions.map((item) => (
          <PartnerCard
            key={item.sno ?? item.client_id}
            item={item}
            onCardPress={onCardPress}
            onboardingCompleted={onboardingCompleted}
            onNotOnboarded={onNotOnboarded}
            onSent={onSent}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default WorkoutPartnersSection;
