import React from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import SkeletonBox from "./SkeletonBox";
import { getBgColor, getGifBgColor } from "./constants";
import styles from "./homeStyles";

const LocationHeader = ({
  insets,
  gif,
  locationDenied,
  locationArea,
  locationAddress,
  requestingLocation,
  handleEnableLocation,
  onLocationPress,
  homeLoading,
  isUnlimited,
  credits,
  creditIconScale,
  goCredits,
  goAccount,
}) => {
  return (
    <View
      style={[
        styles.locationHeader,
        {
          paddingTop: insets.top + 8,
          backgroundColor: getBgColor(gif),
        },
      ]}
    >
      <TouchableOpacity
        style={styles.locationLeft}
        activeOpacity={0.7}
        onPress={locationDenied ? handleEnableLocation : onLocationPress}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.locationAreaRow}>
            <Ionicons
              name={locationDenied ? "navigate-outline" : "navigate"}
              size={16}
              color={locationDenied ? "#8A94A6" : "#FF5757"}
              style={styles.locationIcon}
            />
            <Text
              style={[
                styles.locationArea,
                locationDenied && styles.locationAreaDenied,
                { flexShrink: 1 },
              ]}
              numberOfLines={1}
            >
              {locationDenied
                ? "Location access off"
                : locationArea || "Fetching location..."}
            </Text>
            {!locationDenied && (
              <Ionicons
                name="caret-down"
                size={12}
                color="#1A1A1A"
                style={styles.locationChevron}
              />
            )}
          </View>
          {locationDenied ? (
            <View style={styles.locationEnableRow}>
              <Text style={styles.locationEnableText} numberOfLines={1}>
                {requestingLocation
                  ? "Requesting permission..."
                  : "Tap to enable location"}
              </Text>
              {!requestingLocation && (
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color="#FF5757"
                  style={{ marginLeft: 2 }}
                />
              )}
            </View>
          ) : locationAddress ? (
            <Text style={styles.locationAddressText} numberOfLines={1}>
              {locationAddress}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      <View style={styles.locationRight}>
        <TouchableOpacity
          style={[styles.earnBtn, { backgroundColor: "#FFFFFF" }]}
          activeOpacity={0.8}
          onPress={goCredits}
        >
          <Animated.View style={{ transform: [{ scale: creditIconScale }] }}>
            <Image
              source={require("../../../assets/images/credit.png")}
              style={styles.earnIcon}
              contentFit="contain"
            />
          </Animated.View>
          <View>
            <Text style={styles.earnLabel}>AI Credits</Text>
            {homeLoading ? (
              <SkeletonBox style={{ width: 28, height: 14, marginTop: 1 }} />
            ) : (
              <Text style={styles.earnAmount}>
                {isUnlimited ? "Unlimited" : credits}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.avatarBtn, { backgroundColor: getGifBgColor(gif) }]}
          activeOpacity={0.8}
          onPress={goAccount}
        >
          <Ionicons name="person" size={24} color="#7F9ACF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LocationHeader;
