import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

const DateSelectionSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
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

  const renderWeekHeader = () => (
    <View style={styles.weekHeader}>
      {[...Array(7)].map((_, index) => (
        <SkeletonBox key={index} style={styles.weekDay} />
      ))}
    </View>
  );

  const renderWeekRow = (weekIndex) => (
    <View key={weekIndex} style={styles.weekRow}>
      {[...Array(7)].map((_, index) => (
        <SkeletonBox key={index} style={styles.dateItem} />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Month Title */}
      <View style={styles.monthHeader}>
        <SkeletonBox style={styles.monthTitle} />
      </View>

      {/* Week day headers */}
      {renderWeekHeader()}

      {/* Calendar grid - 5 weeks */}
      <View style={styles.calendarGrid}>
        {[...Array(5)].map((_, index) => renderWeekRow(index))}
      </View>

      {/* Second month */}
      <View style={styles.monthHeader}>
        <SkeletonBox style={styles.monthTitle} />
      </View>

      {renderWeekHeader()}

      <View style={styles.calendarGrid}>
        {[...Array(2)].map((_, index) => renderWeekRow(index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 10,
  },
  skeletonBase: {
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
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
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    width: 50,
  },
  monthHeader: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  monthTitle: {
    height: 20,
    width: 120,
    borderRadius: 4,
  },
  weekHeader: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 8,
  },
  weekDay: {
    flex: 1,
    height: 16,
    borderRadius: 4,
  },
  calendarGrid: {
    gap: 8,
    marginBottom: 16,
  },
  weekRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 100,
    minHeight: 40,
  },
});

export default DateSelectionSkeleton;
