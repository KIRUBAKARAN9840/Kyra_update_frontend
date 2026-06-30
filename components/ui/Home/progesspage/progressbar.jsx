import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Modal,
  TouchableOpacity,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  isFittbotPremium,
  isGymPremium,
  isPureFreemium,
} from "../../../../config/access";
import PremiumBadge from "../../Payment/premiumbadge";
import JoinGym from "../../Payment/joingym";
import { useRouter } from "expo-router";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Gift-themed vibrant colors
const GIFT_PARTICLE_COLORS = [
  "#FFD700", // Gold
  "#FF1493", // Deep Pink
  "#00FF7F", // Spring Green
  "#FF4500", // Orange Red
  "#9370DB", // Medium Purple
  "#FF69B4", // Hot Pink
  "#32CD32", // Lime Green
  "#FF6347", // Tomato
  "#BA55D3", // Medium Orchid
  "#FFA500", // Orange
  "#FF0080", // Bright Pink
  "#00BFFF", // Deep Sky Blue
  "#FFE4B5", // Moccasin
  "#FF6B6B", // Light Red
  "#4ECDC4", // Turquoise
  "#45B7D1", // Sky Blue
];

const GiftParticle = ({ delay, color, index }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(new Animated.Value(0)).current;

  // Calculate gift box center position (center of screen)
  const giftCenterX = SCREEN_WIDTH / 2;
  const giftCenterY = SCREEN_HEIGHT / 2;

  // Particle spread from gift box center
  const horizontalSpread = (Math.random() - 0.5) * 400; // Wide spread
  const verticalDistance = 400 + Math.random() * 300; // Shoot high up

  // Particle size
  const particleSize = 5 + Math.random() * 8;

  useEffect(() => {
    const animationDelay = delay + Math.random() * 400;

    Animated.parallel([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 2500 + Math.random() * 1500,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.timing(rotationValue, {
        toValue: 1,
        duration: 2000 + Math.random() * 1000,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [
      giftCenterX,
      giftCenterX + horizontalSpread * 0.6,
      giftCenterX + horizontalSpread,
    ],
  });

  const translateY = animatedValue.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [
      giftCenterY,
      giftCenterY - verticalDistance * 0.4,
      giftCenterY - verticalDistance * 0.9,
      giftCenterY - verticalDistance,
    ],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.1, 0.6, 1],
    outputRange: [0, 1, 1, 0],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0.3, 1.5, 1.2, 0.2],
  });

  const rotate = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "720deg"], // Multiple rotations
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          width: particleSize,
          height: particleSize,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }, { rotate }],
        },
      ]}
    />
  );
};

const FullPageGiftAnimation = ({ visible, onAnimationComplete }) => {
  const [showParticles, setShowParticles] = useState(false);
  const giftScaleValue = useRef(new Animated.Value(0)).current;
  const giftRotateValue = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const particles = [];

  useEffect(() => {
    if (visible) {
      setShowParticles(true);

      // Background fade in
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Gift box entrance and celebration animation
      Animated.sequence([
        // Entrance
        Animated.spring(giftScaleValue, {
          toValue: 1,
          tension: 50,
          friction: 6,
          delay: 200,
          useNativeDriver: true,
        }),
        // Celebration shake
        Animated.parallel([
          Animated.spring(giftScaleValue, {
            toValue: 1.2,
            tension: 100,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(giftRotateValue, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(giftRotateValue, {
              toValue: -1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(giftRotateValue, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(giftRotateValue, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Return to normal
        Animated.spring(giftScaleValue, {
          toValue: 1,
          tension: 80,
          friction: 6,
          delay: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      // Hide animation after particles finish
      const hideTimer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(giftScaleValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(backgroundOpacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowParticles(false);
          onAnimationComplete && onAnimationComplete();
        });
      }, 4500);

      return () => clearTimeout(hideTimer);
    }
  }, [visible]);

  // Generate particles (more for full screen effect)
  for (let i = 0; i < 150; i++) {
    const delay = Math.floor(i / 15) * 100; // Release in larger batches
    const color =
      GIFT_PARTICLE_COLORS[
        Math.floor(Math.random() * GIFT_PARTICLE_COLORS.length)
      ];

    particles.push(
      <GiftParticle key={i} index={i} delay={delay} color={color} />,
    );
  }

  const giftRotate = giftRotateValue.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-15deg", "15deg"],
  });

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      statusBarTranslucent={true}
    >
      <Animated.View
        style={[styles.modalBackground, { opacity: backgroundOpacity }]}
      >
        {/* Celebration Text */}
        <Animated.View
          style={[
            styles.celebrationTextContainer,
            {
              opacity: giftScaleValue,
              transform: [{ scale: giftScaleValue }],
            },
          ]}
        >
          <Text style={styles.celebrationText}>🎉 Congratulations! 🎉</Text>
          <Text style={styles.celebrationSubText}>
            You are eligible for next gym reward
          </Text>
        </Animated.View>

        {/* Large Gift Box */}
        <Animated.View
          style={[
            styles.largeGiftContainer,
            {
              transform: [{ scale: giftScaleValue }, { rotate: giftRotate }],
            },
          ]}
        >
          <Image
            source={require("../../../../assets/images/home/gift.png")}
            style={styles.largeGiftIcon}
          />
        </Animated.View>

        {/* Particles */}
        {showParticles && (
          <View style={styles.particlesContainer} pointerEvents="none">
            {particles}
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const GiftBar = ({
  progress,
  message = "Start Your Journey today for exciting rewards!",
  title = "Gift Bar",
  showAnimation = false,
  plan,
  onChangeTab,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (showAnimation) {
      setModalVisible(true);
    }
  }, [showAnimation]);

  const handleAnimationComplete = () => {
    setModalVisible(false);
  };

  const goTo = () => {
    if (isPureFreemium(plan)) {
      if (Platform.OS === "android") {
        router.push("/client/subscription");
        return;
      } else if (Platform.OS === "ios") {
        return;
      }
    } else if (isFittbotPremium(plan)) {
      onChangeTab("Fitness Studios");
      return;
    } else if (isGymPremium(plan)) {
      return;
    }
  };
  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={goTo}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text style={styles.title}>{title}</Text>
        {!isGymPremium(plan) && (
          <View>
            {isPureFreemium(plan) ? (
              <Image
                source={require("../../../../assets/images/lock.png")}
                style={{ width: 14, height: 14 }}
              />
            ) : (
              <JoinGym size={12} />
            )}
          </View>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <LinearGradient
            colors={["#FF5757", "#FFA0A0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.progressFill,
              { width: `${isGymPremium(plan) ? progress * 100 : 0}%` },
            ]}
          />
        </View>

        <View style={styles.giftIconContainer}>
          <Image
            source={require("../../../../assets/images/home/gift.png")}
            style={styles.giftIcon}
          />
        </View>
      </View>
      {isGymPremium(plan) && <Text style={styles.message}>"{message}"</Text>}

      <FullPageGiftAnimation
        visible={modalVisible}
        onAnimationComplete={handleAnimationComplete}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333333",
  },
  progressContainer: {
    position: "relative",
    height: 10,
    marginBottom: 16,
    width: "90%",
  },
  progressBackground: {
    height: "100%",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 10,
  },
  giftIconContainer: {
    position: "absolute",
    right: -40,
    top: -15,
    zIndex: 10,
  },
  giftIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  message: {
    fontSize: 12,
    color: "#555555",
    fontStyle: "italic",
    textAlign: "center",
  },
  // Modal and Animation Styles
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  celebrationTextContainer: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.75,
    alignItems: "center",
    zIndex: 10,
  },
  celebrationText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginBottom: 8,
  },
  celebrationSubText: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  largeGiftContainer: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
    position: "absolute",
    top: SCREEN_HEIGHT * 0.55,
  },
  largeGiftIcon: {
    width: 150,
    height: 150,
    resizeMode: "contain",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  particlesContainer: {
    position: "absolute",
    top: 30,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  particle: {
    position: "absolute",
    borderRadius: 4,
    shadowColor: "#FFD700",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 5,
  },
});

export default GiftBar;
