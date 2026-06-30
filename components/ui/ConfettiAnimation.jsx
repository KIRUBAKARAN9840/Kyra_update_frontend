import React, { useEffect, useRef } from "react";
import {
  View,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  Platform,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Brighter, more vibrant colors
const GRAIN_COLORS = [
  "#FFD700", // Bright Gold
  "#FF4500", // Bright Orange Red
  "#00FFFF", // Bright Cyan
  "#FF0040", // Bright Red
  "#00FF40", // Bright Green
  "#4080FF", // Bright Blue
  "#FF40FF", // Bright Magenta
  "#FFFF00", // Bright Yellow
  "#FF1493", // Bright Pink
  "#00FF80", // Bright Spring Green
  "#8A2BE2", // Bright Purple
  "#FF6347", // Bright Tomato
];

const GrainPiece = ({ delay, side, color, index }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(new Animated.Value(0)).current;

  // More varied horizontal spread for realistic grain effect
  const horizontalSpread = (Math.random() - 0.5) * SCREEN_WIDTH * 0.8;
  const verticalDistance = SCREEN_HEIGHT * (0.7 + Math.random() * 0.4); // Shoot higher

  // Slightly larger and more visible grain dimensions
  const grainSize = 3 + Math.random() * 4; // Increased from 2-5 to 3-7

  useEffect(() => {
    const animationDelay = delay + Math.random() * 200; // Stagger the grains

    Animated.parallel([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1800 + Math.random() * 600, // Faster animation
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.timing(rotationValue, {
        toValue: 1,
        duration: 1200 + Math.random() * 400,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  const startX =
    side === "left"
      ? 20 + Math.random() * 40
      : SCREEN_WIDTH - 60 + Math.random() * 40;
  const startY = SCREEN_HEIGHT - 20;

  // Upward trajectory only
  const translateX = animatedValue.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [
      startX,
      startX + horizontalSpread * 0.6,
      startX + horizontalSpread,
    ],
  });

  const translateY = animatedValue.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [
      startY,
      startY - verticalDistance * 0.8, // Peak height
      startY - verticalDistance * 0.95,
      startY - verticalDistance, // Final position (off screen)
    ],
  });

  // Enhanced opacity for brighter visibility
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0], // Stay at full opacity longer
  });

  // Enhanced scaling for more prominent grain effect
  const scale = animatedValue.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0.3, 1.2, 1, 0.4], // Slightly larger peak scale
  });

  const rotate = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"], // Less rotation for grains
  });

  return (
    <Animated.View
      style={[
        styles.grainPiece,
        {
          backgroundColor: color,
          width: grainSize,
          height: grainSize,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }, { rotate }],
        },
      ]}
    />
  );
};

const XPPointsDisplay = ({ points }) => {
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const translateYValue = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 150,
        friction: 6,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(translateYValue, {
        toValue: 0,
        tension: 120,
        friction: 8,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Exit animation
    const exitTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(translateYValue, {
          toValue: -30,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2000);

    return () => clearTimeout(exitTimer);
  }, [points]);

  return (
    <Animated.View
      style={[
        styles.xpContainer,
        {
          opacity: opacityValue,
          transform: [{ scale: scaleValue }, { translateY: translateYValue }],
        },
      ]}
    >
      <View style={styles.xpBadge}>
        <Text style={styles.xpText}>+{points} XP</Text>
      </View>
    </Animated.View>
  );
};

const GrainConfettiAnimation = ({ numberOfGrains = 150, xpPoints = 100 }) => {
  const grainPieces = [];
  const backgroundFade = useRef(new Animated.Value(0)).current;

  // Optimize for low-end devices by reducing grain count
  const optimizedGrainCount = Platform.select({
    ios: Math.min(numberOfGrains, 80), // Reduce for iOS low-end devices
    android: Math.min(numberOfGrains, 50), // Further reduce for Android
    default: Math.min(numberOfGrains, 50),
  });

  useEffect(() => {
    // Quick fade in for background
    Animated.timing(backgroundFade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Fade out background after grains finish
    const fadeOutTimer = setTimeout(() => {
      Animated.timing(backgroundFade, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 2800);

    return () => clearTimeout(fadeOutTimer);
  }, []);

  // Generate optimized number of grains
  for (let i = 0; i < optimizedGrainCount; i++) {
    const side = i % 2 === 0 ? "left" : "right";
    const delay = Math.floor(i / 8) * 50; // Release in small batches
    const color = GRAIN_COLORS[Math.floor(Math.random() * GRAIN_COLORS.length)];

    grainPieces.push(
      <GrainPiece key={i} index={i} delay={delay} side={side} color={color} />
    );
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.background,
          {
            opacity: backgroundFade.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.1], // Even more subtle background
            }),
          },
        ]}
      />
      {grainPieces}
      {xpPoints ? <XPPointsDisplay points={xpPoints} /> : ""}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999, // Increased from 1000 to ensure it's above modals
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.05)", // Even more subtle
  },
  grainPiece: {
    position: "absolute",
    borderRadius: 2, // Slightly more rounded for better visibility
    // Remove shadows for better performance on low-end devices
  },
  xpContainer: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.15, // Moved from 0.35 to 0.15 (much higher up)
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  xpBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.95)", // Gold background
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  xpText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#8B4513",
    textAlign: "center",
    textShadowColor: "rgba(255, 255, 255, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default GrainConfettiAnimation;
