import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");
const responsiveWidth = (percentage) => width * (percentage / 100);
const responsiveHeight = (percentage) => height * (percentage / 100);
const responsiveFontSize = (fontSize) => {
  const standardScreenHeight = 820;
  const standardFontScale = fontSize / standardScreenHeight;
  return Math.round(height * standardFontScale);
};

const ExerciseScreenSkeleton = ({
  priority = "medium", // "high", "medium", "low"
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  // Determine animation type based on priority
  const shouldUseShimmer = priority === "high";
  const shouldUsePulse = priority === "high" || priority === "medium";
  const shouldAnimate = isFocused;

  useEffect(() => {
    if (!shouldAnimate) {
      shimmerAnim.stopAnimation();
      pulseAnim.stopAnimation();
      return;
    }

    let shimmerAnimation, pulseAnimation;

    if (shouldUseShimmer) {
      shimmerAnimation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      );
      shimmerAnimation.start();
    }

    if (shouldUsePulse) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: priority === "high" ? 800 : 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: priority === "high" ? 800 : 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
    }

    return () => {
      shimmerAnimation?.stop();
      pulseAnimation?.stop();
    };
  }, [
    shimmerAnim,
    pulseAnim,
    shouldAnimate,
    shouldUseShimmer,
    shouldUsePulse,
    priority,
  ]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const opacity = shouldUsePulse
    ? pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: priority === "high" ? [0.3, 0.8] : [0.4, 0.7],
      })
    : new Animated.Value(0.5);

  const SkeletonBox = ({ style, shimmer = false, pulse = true }) => {
    const useShimmerForThis = shimmer && shouldUseShimmer;
    const usePulseForThis = pulse && shouldUsePulse;

    if (priority === "low") {
      return (
        <View style={[styles.skeletonBase, style]}>
          <View style={[styles.skeletonContent, styles.staticContent]} />
        </View>
      );
    }

    return (
      <View style={[styles.skeletonBase, style]}>
        <Animated.View
          style={[
            styles.skeletonContent,
            usePulseForThis ? { opacity } : styles.staticContent,
          ]}
        />
        {useShimmerForThis && (
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                transform: [{ translateX }],
              },
            ]}
          />
        )}
      </View>
    );
  };

  const renderExerciseCardSkeleton = (index) => (
    <View key={index} style={styles.exerciseCard}>
      <View style={styles.cardHeader}>
        {/* Exercise Image */}
        <SkeletonBox
          style={styles.exerciseImage}
          shimmer={priority === "high" && index < 4}
          pulse={priority !== "low"}
        />

        {/* Exercise Info */}
        <View style={styles.exerciseInfo}>
          <SkeletonBox
            style={[
              styles.exerciseName,
              { width: index % 2 === 0 ? "85%" : "70%" },
            ]}
            shimmer={priority === "high" && index === 0}
            pulse={priority !== "low"}
          />
          <SkeletonBox style={styles.muscleGroup} pulse={false} />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <SkeletonBox style={styles.actionButton} pulse={false} />
          <SkeletonBox style={styles.actionButton} pulse={false} />
          <SkeletonBox style={styles.expandButton} pulse={false} />
        </View>
      </View>

      {/* Sets Indicator */}
      {index % 3 === 0 && (
        <View style={styles.setsIndicator}>
          <SkeletonBox style={styles.setsIndicatorBadge} pulse={false} />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SkeletonBox style={styles.backIcon} pulse={false} />
          <SkeletonBox
            style={styles.headerTitle}
            shimmer={priority === "high"}
            pulse={priority !== "low"}
          />
        </View>

        <View style={styles.gymStatus}>
          <SkeletonBox style={styles.statusDot} pulse={false} />
          <SkeletonBox style={styles.statusText} pulse={false} />
        </View>
      </View>

      {/* Day tabs (for default workouts) */}
      <View style={styles.dayTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabsContent}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((item) => (
            <SkeletonBox key={item} style={styles.dayTab} pulse={false} />
          ))}
        </ScrollView>
      </View>

      {/* Helper Text */}
      <View style={styles.helperTextContainer}>
        <SkeletonBox style={styles.helperText1} pulse={false} />
        <SkeletonBox style={styles.helperText2} pulse={false} />
      </View>

      {/* Exercise Cards */}
      <ScrollView
        style={styles.exerciseList}
        contentContainerStyle={styles.exerciseListContent}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: 6 }).map((_, index) =>
          renderExerciseCardSkeleton(index)
        )}
      </ScrollView>

      {/* Save Workout Button */}
      <View style={styles.saveButtonContainer}>
        <SkeletonBox
          style={styles.saveButton}
          shimmer={priority === "high"}
          pulse={priority !== "low"}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  skeletonBase: {
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
  },
  skeletonContent: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E1E9EE",
  },
  staticContent: {
    opacity: 0.5,
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

  // Header styles
  header: {
    paddingHorizontal: responsiveWidth(5),
    paddingVertical: responsiveWidth(1),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: responsiveHeight(5),
    marginBottom: 15,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backIcon: {
    width: responsiveFontSize(20),
    height: responsiveFontSize(20),
    borderRadius: 4,
    marginRight: 10,
  },
  headerTitle: {
    width: 140,
    height: responsiveFontSize(16),
    borderRadius: 4,
  },
  gymStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: responsiveWidth(3),
    paddingVertical: responsiveHeight(0.8),
    borderRadius: responsiveWidth(5),
  },
  statusDot: {
    width: responsiveWidth(2.5),
    height: responsiveWidth(2.5),
    borderRadius: responsiveWidth(1.25),
    marginRight: responsiveWidth(2),
  },
  statusText: {
    width: 60,
    height: responsiveFontSize(14),
    borderRadius: 4,
  },

  // Day tabs styles
  dayTabsContainer: {
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  dayTabsContent: {
    paddingHorizontal: 8,
    alignItems: "center",
  },
  dayTab: {
    width: 80,
    height: 35,
    borderRadius: 8,
    marginHorizontal: 4,
  },

  // Helper text styles
  helperTextContainer: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 15,
    marginBottom: 15,
  },
  helperText1: {
    width: "90%",
    height: 12,
    borderRadius: 4,
    marginBottom: 6,
  },
  helperText2: {
    width: "60%",
    height: 12,
    borderRadius: 4,
  },

  // Exercise list styles
  exerciseList: {
    flex: 1,
  },
  exerciseListContent: {
    padding: responsiveWidth(4),
    paddingBottom: responsiveHeight(10),
  },

  // Exercise card styles
  exerciseCard: {
    backgroundColor: "rgba(236, 236, 236, 0.9)",
    borderRadius: responsiveWidth(3),
    marginBottom: responsiveHeight(1.5),
    padding: responsiveWidth(3),
    paddingVertical: responsiveHeight(1.5),
    minHeight: responsiveHeight(13),
    position: "relative",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseImage: {
    width: responsiveWidth(18),
    height: responsiveWidth(18),
    borderRadius: responsiveWidth(2),
    marginRight: responsiveWidth(3),
  },
  exerciseInfo: {
    flex: 1,
    justifyContent: "center",
  },
  exerciseName: {
    height: responsiveFontSize(14),
    borderRadius: 4,
    marginBottom: 8,
  },
  muscleGroup: {
    width: "40%",
    height: responsiveFontSize(11),
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: responsiveWidth(1),
  },
  expandButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: responsiveWidth(1),
  },

  // Sets indicator styles
  setsIndicator: {
    position: "absolute",
    top: responsiveHeight(0.5),
    right: responsiveWidth(4),
    zIndex: 5,
  },
  setsIndicatorBadge: {
    width: 40,
    height: 20,
    borderRadius: responsiveWidth(5),
  },

  // Save button styles
  saveButtonContainer: {
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveHeight(1.5),
    backgroundColor: "#F7F7F7",
  },
  saveButton: {
    width: "100%",
    height: 48,
    borderRadius: responsiveWidth(3),
  },
});

export default ExerciseScreenSkeleton;
