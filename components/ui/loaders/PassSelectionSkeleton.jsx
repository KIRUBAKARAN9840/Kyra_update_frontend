import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

const PassSelectionSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const SkeletonBox = ({ style }) => (
    <View style={[styles.skeletonBase, style]}>
      <Animated.View style={styles.skeletonContent} />
      <Animated.View
        style={[
          styles.shimmerOverlay,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );

  const renderPassCard = (index) => (
    <View key={index} style={styles.passCard}>
      {/* Top Row */}
      <View style={styles.passTopRow}>
        {/* Icon */}
        <SkeletonBox style={styles.iconSkeleton} />

        {/* Title and Subtitle */}
        <View style={styles.passInfo}>
          <SkeletonBox style={styles.titleSkeleton} />
          <SkeletonBox style={styles.subtitleSkeleton} />
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <SkeletonBox style={styles.priceSkeleton} />
        </View>
      </View>

      {/* Bottom Row */}
      <View style={styles.passBottomRow}>
        <SkeletonBox style={styles.discountSkeleton} />
        <SkeletonBox style={styles.buttonSkeleton} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Title Card Skeleton */}
      <View style={styles.titleCard}>
        <SkeletonBox style={styles.mainTitleSkeleton} />
        <SkeletonBox style={styles.subtitleTopSkeleton} />
      </View>

      {/* Pass Cards */}
      <View style={styles.passContainer}>
        {[0, 1, 2, 3].map((index) => renderPassCard(index))}
      </View>

      {/* Explore Button Skeleton */}
      <View style={styles.exploreButtonContainer}>
        <SkeletonBox style={styles.exploreButtonSkeleton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  titleCard: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    marginBottom: 24,
    paddingVertical: 10,
  },
  mainTitleSkeleton: {
    width: "40%",
    height: 16,
    marginBottom: 8,
    borderRadius: 4,
  },
  subtitleTopSkeleton: {
    width: "70%",
    height: 14,
    borderRadius: 4,
  },
  passContainer: {
    gap: 16,
    paddingHorizontal: 10,
  },
  passCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    elevation: 1,
  },
  passTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  passBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconSkeleton: {
    width: 45,
    height: 45,
    borderRadius: 12,
    marginRight: 12,
  },
  passInfo: {
    flex: 1,
  },
  titleSkeleton: {
    width: "60%",
    height: 14,
    marginBottom: 6,
    borderRadius: 4,
  },
  subtitleSkeleton: {
    width: "80%",
    height: 12,
    borderRadius: 4,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceSkeleton: {
    width: 60,
    height: 18,
    borderRadius: 4,
  },
  discountSkeleton: {
    width: 80,
    height: 24,
    borderRadius: 4,
  },
  buttonSkeleton: {
    width: 90,
    height: 32,
    borderRadius: 8,
  },
  exploreButtonContainer: {
    marginTop: 24,
    marginBottom: 20,
    alignItems: "center",
  },
  exploreButtonSkeleton: {
    width: "70%",
    height: 40,
    borderRadius: 12,
  },
  skeletonBase: {
    overflow: "hidden",
    backgroundColor: "#E1E9EE",
  },
  skeletonContent: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E1E9EE",
  },
  shimmerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    width: 60,
  },
});

export default PassSelectionSkeleton;
