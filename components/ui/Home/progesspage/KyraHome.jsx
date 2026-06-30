import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Camera, Sparkles, Brain, Zap } from "lucide-react-native";
import { MaskedText } from "../../MaskedText";

const { width } = Dimensions.get("window");

const AISnapComponent = ({ onSnapPress, gender = "male" }) => {
  const [shimmerAnim] = useState(new Animated.Value(-200));
  const [pulseAnim] = useState(new Animated.Value(1));

  React.useEffect(() => {
    // Enhanced shimmer animation with better visibility
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: width + 150,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Subtle pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.mainCard}
        onPress={onSnapPress}
        activeOpacity={0.95}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <LinearGradient
            colors={["#7b2cbf", "#9d4edd", "#e5383b"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCard}
          >
            {/* Enhanced Shimmer Effect */}
            <Animated.View
              style={[
                styles.shimmer,
                {
                  transform: [
                    { translateX: shimmerAnim },
                    { rotate: "-25deg" },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={[
                  "transparent",
                  "rgba(255,255,255,0.4)",
                  "rgba(255,255,255,0.8)",
                  "rgba(255,255,255,0.4)",
                  "transparent",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>

            <View style={styles.cardContent}>
              {/* Header with Kyra AI branding */}
              <View style={styles.headerSection}>
                <View style={styles.logoContainer}>
                  <View style={styles.aiStarsContainer}>
                    <Sparkles size={16} color="#00BFFF" />
                    <Sparkles
                      size={12}
                      color="#87CEEB"
                      style={styles.smallStar}
                    />
                  </View>
                  <MaskedText
                    bg1="#00BFFF"
                    bg2="#87CEEB"
                    text="Kyra AI"
                    textStyle={{ fontWeight: 600, fontSize: 16 }}
                  >
                    Kyra AI
                  </MaskedText>
                </View>

                <View style={styles.quickFeatures}>
                  <View style={styles.featureItem}>
                    <Zap size={14} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.featureLabel}>Instant</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Brain size={14} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.featureLabel}>Smart</Text>
                  </View>
                </View>
              </View>

              {/* Main Content */}
              <View style={styles.mainContent}>
                <View style={styles.textSection}>
                  <Text style={styles.mainTitle}>AI Snap & Log</Text>
                  <Text style={styles.subtitle}>
                    Snap food, get instant macros & nutrients
                  </Text>
                </View>

                <View style={styles.cameraSection}>
                  <View style={styles.cameraButton}>
                    <Camera size={28} color="#FFF" />
                  </View>
                </View>
              </View>
            </View>

            {/* Modern decorative elements */}
            <View style={styles.decorativeElement1} />
            <View style={styles.decorativeElement2} />
            <View style={styles.decorativeElement3} />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 12,
  },
  mainCard: {
    borderRadius: 24,
    elevation: 12,
    shadowColor: "#7b2cbf",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  gradientCard: {
    borderRadius: 24,
    padding: 20,
    minHeight: 120,
    overflow: "hidden",
    position: "relative",
  },
  shimmer: {
    position: "absolute",
    top: -50,
    left: -200,
    height: 250,
    width: 120,
    zIndex: 1,
  },
  shimmerGradient: {
    flex: 1,
    width: "100%",
  },
  cardContent: {
    flex: 1,
    zIndex: 2,
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // marginBottom: 16,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiStarsContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    position: "relative",
  },
  smallStar: {
    position: "absolute",
    top: -2,
    right: -2,
  },
  brandText: {
    // Removed - now using MaskedText component
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  newBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  newText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 3,
    letterSpacing: 0.5,
  },
  mainContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textSection: {
    flex: 1,
  },
  mainTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 10,
    lineHeight: 18,
    fontWeight: "500",
  },
  cameraSection: {
    alignItems: "center",
    marginLeft: 16,
  },
  cameraButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    marginBottom: 8,
  },
  quickFeatures: {
    flexDirection: "row",
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  featureLabel: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 3,
  },
  decorativeElement1: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  decorativeElement2: {
    position: "absolute",
    bottom: -15,
    left: -15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  decorativeElement3: {
    position: "absolute",
    top: 20,
    right: 40,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
});

export default AISnapComponent;
