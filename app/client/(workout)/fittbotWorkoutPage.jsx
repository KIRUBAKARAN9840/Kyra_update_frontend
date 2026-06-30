import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  ImageBackground,
  Alert,
  View,
  StyleSheet,
  Dimensions,
  Animated,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getFittbotWorkoutAPI } from "../../../services/clientApi";
import { useRouter } from "expo-router";
import { showToast } from "../../../utils/Toaster";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const FittbotWorkoutPage = ({
  onScroll,
  scrollEventThrottle = 16,
  onSectionChange,
  priority = "medium", // Add priority prop for skeleton animations
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [activeSection, setActiveSection] = useState(null);

  // Animation refs for skeleton
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  // Skeleton animation setup
  const shouldUseShimmer = priority === "high";
  const shouldUsePulse = priority === "high" || priority === "medium";
  const shouldAnimate = isFocused && loading;

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
        }),
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
        ]),
      );
      pulseAnimation.start();
    }

    return () => {
      shimmerAnimation?.stop();
      pulseAnimation?.stop();
    };
  }, [shouldAnimate, shouldUseShimmer, shouldUsePulse, priority]);

  useEffect(() => {
    fetchFittbotWorkouts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.replace({
          pathname: "/client/workouttracker",
        });
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );

      return () => {
        backHandler.remove();
      };
    }, []),
  );

  const handleMuscleGroupSelect = (muscleGroup) => {
    router.push({
      pathname: "/client/allexercises",
      params: {
        type: "gym",
        muscleGroup,
      },
    });
  };

  const fetchFittbotWorkouts = async () => {
    setLoading(true);
    try {
      const response = await getFittbotWorkoutAPI();
      if (response?.status === 200) {
        setMuscleGroups(response?.data ?? []);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: "Error fetching Gym workouts",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  // Skeleton components
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
        <View style={[skeletonStyles.skeletonBase, style]}>
          <View
            style={[
              skeletonStyles.skeletonContent,
              skeletonStyles.staticContent,
            ]}
          />
        </View>
      );
    }

    return (
      <View style={[skeletonStyles.skeletonBase, style]}>
        <Animated.View
          style={[
            skeletonStyles.skeletonContent,
            usePulseForThis ? { opacity } : skeletonStyles.staticContent,
          ]}
        />
        {useShimmerForThis && (
          <Animated.View
            style={[
              skeletonStyles.shimmerOverlay,
              {
                transform: [{ translateX }],
              },
            ]}
          />
        )}
      </View>
    );
  };

  const renderSkeletonHeader = () => (
    <View style={[styles.listHeader, { paddingTop: insets.top }]}>
      <SkeletonBox style={skeletonStyles.backIcon} pulse={false} />
      <SkeletonBox
        style={skeletonStyles.headerTitle}
        shimmer={priority === "high"}
        pulse={priority !== "low"}
      />
    </View>
  );

  const renderSkeletonCard = (index) => (
    <View key={index} style={styles.workoutCardContainer}>
      <View style={styles.workoutCard}>
        <SkeletonBox
          style={skeletonStyles.cardImage}
          shimmer={priority === "high" && index < 2}
          pulse={priority !== "low"}
        />
      </View>
      <View
        style={[styles.labelContainer, skeletonStyles.labelContainerSkeleton]}
      >
        <SkeletonBox style={skeletonStyles.cardLabel} pulse={false} />
      </View>
    </View>
  );

  const renderSkeletonContent = () => (
    <View style={styles.container}>
      <View style={styles.flatListContent}>
        {renderSkeletonHeader()}

        {/* Skeleton Grid */}
        <View style={skeletonStyles.skeletonGrid}>
          {Array.from({ length: 8 }).map((_, index) => {
            if (index % 2 === 0) {
              return (
                <View key={index} style={styles.row}>
                  {renderSkeletonCard(index)}
                  {index + 1 < 8 && renderSkeletonCard(index + 1)}
                </View>
              );
            }
            return null;
          })}
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <TouchableOpacity
      style={[styles.listHeader, { paddingTop: insets.top + 10 }]}
      onPress={() => {
        router.replace("/client/workouttracker");
      }}
    >
      <Ionicons name="arrow-back" size={20} color="#333" />
      <Text style={styles.headerTitle}>Gym Workouts</Text>
    </TouchableOpacity>
  );

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.workoutCardContainer}>
        <TouchableOpacity
          style={styles.workoutCard}
          onPress={() => handleMuscleGroupSelect(item.muscle_group)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#5299DB66", "#FFFFFF"]}
            style={styles.imageBackground}
          >
            <ImageBackground
              source={{ uri: item.image }}
              style={styles.imageBackground}
              resizeMode="contain"
              imageStyle={styles.backgroundImage}
            >
              <View style={styles.overlay} />
            </ImageBackground>
          </LinearGradient>
        </TouchableOpacity>
        <LinearGradient
          colors={["#FFFFFF", "#DCEFFF"]}
          style={styles.labelContainer}
        >
          <Text style={styles.workoutLabel}>
            {item.muscle_group === "Treadmill"
              ? "RUNNING"
              : item.muscle_group.toUpperCase()}
          </Text>
        </LinearGradient>
      </View>
    ),
    [],
  );

  // Show skeleton when loading
  if (loading) {
    return renderSkeletonContent();
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {renderHeader()}
      <FlatList
        data={muscleGroups}
        keyExtractor={(item) => item.muscle_group}
        numColumns={2}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        renderItem={renderItem}
        columnWrapperStyle={styles.row}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
};

export default FittbotWorkoutPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  flatListContent: {
    padding: 20,
    paddingBottom: height * 0.1,
  },
  listHeader: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 15,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 15,
  },
  workoutCardContainer: {
    width: (width - 60) / 2,
  },
  workoutCard: {
    width: "100%",
    aspectRatio: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  imageBackground: {
    flex: 1,
  },
  backgroundImage: {
    borderRadius: 20,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  labelContainer: {
    backgroundColor: "rgba(255, 255, 255, 1)",
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  workoutLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});

const skeletonStyles = StyleSheet.create({
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
  skeletonGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  headerTitle: {
    width: 140,
    height: 20,
    borderRadius: 4,
    marginLeft: 15,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  labelContainerSkeleton: {
    backgroundColor: "#F0F0F0",
  },
  cardLabel: {
    width: 60,
    height: 14,
    borderRadius: 4,
  },
});
