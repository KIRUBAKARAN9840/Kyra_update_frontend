import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";

const { width, height } = Dimensions.get("window");

const KyraAIFloatingButton = ({
  onPress,
  position = "bottom-right",
  size = "medium",
  style = {},
  showBadge = false,
  badgeText = "AI",
  colors = ["#667eea", "#764ba2", "#4b79a1"],
  message,
  boxColor = ["#28A745", "#007BFF"],
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowOpacityAnim = useRef(new Animated.Value(0.4)).current;
  const star1OpacityAnim = useRef(new Animated.Value(0.3)).current;
  const star2OpacityAnim = useRef(new Animated.Value(0.5)).current;
  const star3OpacityAnim = useRef(new Animated.Value(0.2)).current;

  // Initialize welcome animations with proper starting values
  const welcomeOpacityAnim = useRef(new Animated.Value(0)).current;
  const welcomeScaleAnim = useRef(new Animated.Value(0.8)).current;
  const welcomeTranslateX = useRef(new Animated.Value(-10)).current;

  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  // Size configurations
  const sizeConfig = {
    small: { button: 56, glow: 70, text: 9, kyra: 9, icon: 20 },
    medium: { button: 72, glow: 86, text: 10, kyra: 11, icon: 26 },
    large: { button: 88, glow: 102, text: 11, kyra: 12, icon: 32 },
  };

  const config = sizeConfig[size];

  // Draggable position state - positioned from bottom with hardcoded values
  const bottomOffset =
    style?.bottom !== undefined
      ? style.bottom
      : Platform.OS === "ios"
      ? 150
      : 130;
  const rightOffset = 20;

  // Use hardcoded Y position to ensure consistency across different screen heights
  // For standard screens (around 800-900px height), position around 550-600px from top
  const calculateY = () => {
    const calculatedY = height - bottomOffset - config.button;
    // Limit the maximum Y position to avoid button going too low on tall screens
    const maxY = 600; // Maximum distance from top
    return Math.min(calculatedY, maxY);
  };

  const dragPosition = useRef(
    new Animated.ValueXY({
      x: width - rightOffset - config.button,
      y: calculateY(),
    })
  ).current;

  // PanResponder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only activate if user has moved more than 5 pixels
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        dragPosition.setOffset({
          x: dragPosition.x._value,
          y: dragPosition.y._value,
        });
        dragPosition.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: dragPosition.x, dy: dragPosition.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gesture) => {
        dragPosition.flattenOffset();

        // Add boundary constraints
        const maxX = width - config.button;
        const maxY = height - config.button;
        const minX = 0;
        const minY = 0;

        let finalX = dragPosition.x._value;
        let finalY = dragPosition.y._value;

        // Keep within bounds
        if (finalX < minX) finalX = minX;
        if (finalX > maxX) finalX = maxX;
        if (finalY < minY) finalY = minY;
        if (finalY > maxY) finalY = maxY;

        // Animate to bounded position
        Animated.spring(dragPosition, {
          toValue: { x: finalX, y: finalY },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  // Get welcome message position (bottom-right)
  const getWelcomePosition = () => {
    const buttonSize = config.button;
    const spacing = 10;

    return {
      bottom: buttonSize + spacing,
      right: 0,
      left: undefined,
      top: undefined,
    };
  };

  // Welcome message animation effect
  useEffect(() => {
    if (showWelcomeMessage && !hasShownWelcome) {
      // Show animation
      Animated.parallel([
        Animated.timing(welcomeOpacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(welcomeScaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(welcomeTranslateX, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();

      // Hide animation after delay
      const welcomeTimer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(welcomeOpacityAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(welcomeScaleAnim, {
            toValue: 0.8,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(welcomeTranslateX, {
            toValue: -10,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowWelcomeMessage(false);
          setHasShownWelcome(true);
        });
      }, 3000); // Increased delay to 3 seconds for better visibility

      return () => {
        clearTimeout(welcomeTimer);
      };
    }
  }, []); // Run only once when component mounts

  // Other animations
  useEffect(() => {
    // Subtle pulsing animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Gentle glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacityAnim, {
          toValue: 0.7,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacityAnim, {
          toValue: 0.4,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );

    // Realistic star twinkling with staggered timing
    const star1Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(star1OpacityAnim, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(star1OpacityAnim, {
          toValue: 0.2,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(star1OpacityAnim, {
          toValue: 0.6,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(star1OpacityAnim, {
          toValue: 0.1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    const star2Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(star2OpacityAnim, {
          toValue: 0.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(star2OpacityAnim, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(star2OpacityAnim, {
          toValue: 0.3,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(star2OpacityAnim, {
          toValue: 0.7,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    const star3Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(star3OpacityAnim, {
          toValue: 0.7,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(star3OpacityAnim, {
          toValue: 0.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(star3OpacityAnim, {
          toValue: 0.5,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(star3OpacityAnim, {
          toValue: 0.2,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    // Slow rotation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    glowAnimation.start();
    // Start star animations with delays for natural effect
    setTimeout(() => star1Animation.start(), 0);
    setTimeout(() => star2Animation.start(), 800);
    setTimeout(() => star3Animation.start(), 1600);
    rotateAnimation.start();

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
      star1Animation.stop();
      star2Animation.stop();
      star3Animation.stop();
      rotateAnimation.stop();
    };
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Realistic Star Component
  const RealisticStar = ({ size = 8, opacity, style }) => (
    <Animated.View style={[styles.starContainer, style, { opacity }]}>
      <View
        style={[
          styles.starBeam,
          styles.starBeamHorizontal,
          { width: size * 1.5, height: size * 0.2 },
        ]}
      />
      <View
        style={[
          styles.starBeam,
          styles.starBeamVertical,
          { width: size * 0.2, height: size * 1.5 },
        ]}
      />
      <View
        style={[
          styles.starBeam,
          styles.starBeamDiagonal1,
          { width: size * 1.2, height: size * 0.15 },
        ]}
      />
      <View
        style={[
          styles.starBeam,
          styles.starBeamDiagonal2,
          { width: size * 1.2, height: size * 0.15 },
        ]}
      />
      <View
        style={[
          styles.starCore,
          { width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2 },
        ]}
      />
    </Animated.View>
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          top: 0,
          left: 0,
          bottom: undefined,
          right: undefined,
          transform: [
            { translateX: dragPosition.x },
            { translateY: dragPosition.y },
          ],
        },
      ]}
    >
      {/* Welcome Message */}
      {showWelcomeMessage && message && message.trim() !== "" && (
        <Animated.View
          style={[
            styles.welcomeContainer,
            getWelcomePosition(),
            {
              opacity: welcomeOpacityAnim,
              transform: [
                { scale: welcomeScaleAnim },
                { translateX: welcomeTranslateX },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[boxColor[0], boxColor[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeGradient}
          >
            <Text style={styles.welcomeText}>{message}</Text>
            {/* Speech bubble arrow */}
            <View
              style={[styles.welcomeArrow, styles.arrowUp, { right: 20 }]}
            />
          </LinearGradient>
        </Animated.View>
      )}

      {/* Outer glow effect */}
      <Animated.View style={[styles.glow]} />

      {/* Main button */}
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            width: config.button,
            height: config.button,
            borderRadius: config.button / 2,
            transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.button,
            {
              width: config.button,
              height: config.button,
              borderRadius: config.button / 2,
            },
          ]}
        >
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradient,
              {
                width: config.button,
                height: config.button,
                borderRadius: config.button / 2,
              },
            ]}
          >
            {/* Subtle rotating ring */}
            <Animated.View
              style={[
                styles.rotatingRing,
                {
                  width: config.button - 8,
                  height: config.button - 8,
                  borderRadius: (config.button - 8) / 2,
                  transform: [{ rotate: spin }],
                },
              ]}
            />

            {/* Content Container */}
            <View style={styles.contentContainer}>
              <Image
                source={require("../../../assets/images/kyraAI.png")}
                style={{ width: 60, height: 60 }}
                contentFit="contain"
              />
            </View>

            {/* Realistic Stars */}
            <RealisticStar
              size={6}
              opacity={star1OpacityAnim}
              style={styles.star1Position}
            />
            <RealisticStar
              size={4}
              opacity={star2OpacityAnim}
              style={styles.star2Position}
            />
            <RealisticStar
              size={5}
              opacity={star3OpacityAnim}
              style={styles.star3Position}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Badge */}
      {showBadge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 1000,
  },
  welcomeContainer: {
    position: "absolute",
    zIndex: 1001,
    minWidth: 200,
    maxWidth: 280,
  },
  welcomeGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    position: "relative",
  },
  welcomeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: 0.2,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  welcomeArrow: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  arrowUp: {
    bottom: -8,
    borderTopWidth: 8,
    borderTopColor: "#78CAFF", // Use first color from gradient
  },
  arrowDown: {
    top: -8,
    borderBottomWidth: 8,
    borderBottomColor: "#78CAFF", // Use first color from gradient
  },

  buttonWrapper: {
    alignSelf: "center",
  },
  button: {
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  gradient: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  rotatingRing: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderStyle: "dashed",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    position: "absolute",
    bottom: -8,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  kyraText: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Realistic Star Styles
  starContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  starBeam: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 1,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 3,
  },
  starBeamHorizontal: {
    // Horizontal beam - already styled above
  },
  starBeamVertical: {
    // Vertical beam - already styled above
  },
  starBeamDiagonal1: {
    transform: [{ rotate: "45deg" }],
  },
  starBeamDiagonal2: {
    transform: [{ rotate: "-45deg" }],
  },
  starCore: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },

  // Star Positions
  star1Position: {
    top: "18%",
    right: "18%",
  },
  star2Position: {
    bottom: "22%",
    left: "15%",
  },
  star3Position: {
    top: "35%",
    left: "10%",
  },

  // Badge
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});

export default KyraAIFloatingButton;
