import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

const MobileLogo = () => {
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const logoTranslateY = useRef(new Animated.Value(0)).current;

  return (
    <View>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslateY }],
          },
        ]}
      >
        <Text style={styles.logoText}>
          <Text style={styles.logoFirstPart}>Fitt</Text>
          <Text style={styles.logoSecondPart}>bot</Text>
        </Text>
        {/* <View style={styles.logoUnderline} />
        <Text style={styles.tagline}>Your Personal Fitness Companion</Text> */}
      </Animated.View>
    </View>
  );
};

export default MobileLogo;

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: "center",
    marginBottom: height * 0.03,
  },
  logoText: {
    fontSize: 55,
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
    fontWeight: 400,
  },
  logoFirstPart: {
    color: "#FF5757",
  },
  logoSecondPart: {
    color: "#263148",
  },
  logoUnderline: {
    width: 80,
    height: 4,
    backgroundColor: "#FF5757",
    borderRadius: 2,
    marginTop: 0,
  },
  tagline: {
    color: "#263148",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
  },
});
