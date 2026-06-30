import React, { forwardRef } from "react";
import { View, Text, TouchableOpacity, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import styles from "./homeStyles";

export const SlideBanner = forwardRef(({ onPress }, ref) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={{ overflow: "hidden" }}
  >
    <LinearGradient
      colors={["#C7DAFF", "#C7DAFF", "#ffffff"]}
      locations={[0, 0.75, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.fitnessClassBannerFirst}
    >
      <View style={styles.fitnessClassBannerLeft}>
        <Text style={styles.fitnessClassBannerTitle}>Fitness Classes</Text>
        <Text style={styles.fitnessClassBannerSub}>
          Book top-rated fitness{"\n"}classes near you today
        </Text>
        <View style={styles.fitnessClassBannerPricePill}>
          <Text style={styles.fitnessClassBannerPriceText}>
            Starting At Just ₹99
          </Text>
        </View>
      </View>
      <View style={styles.fitnessClassBannerImageWrap}>
        <LottieView
          ref={ref}
          source={require("../../../assets/gif/slide.json")}
          autoPlay={false}
          loop
          renderToHardwareTextureAndroid
          style={{ position: "absolute", top: -20, width: "100%", height: 220 }}
        />
      </View>
    </LinearGradient>
  </TouchableOpacity>
));

export const OfferBanner = forwardRef(({ onPress }, ref) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={{ overflow: "hidden" }}
  >
    <LinearGradient
      colors={["#C7DAFF", "#C7DAFF", "#ffffff"]}
      locations={[0, 0.75, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.fitnessClassBanner}
    >
      <LottieView
        ref={ref}
        source={require("../../../assets/gif/offer.json")}
        autoPlay={false}
        loop
        renderToHardwareTextureAndroid
        style={{ position: "absolute", top: -50, width: "100%", height: 200 }}
      />
      <Text style={styles.fitnessClassBannerText}>
        Book Fitness Classes Near You
      </Text>
    </LinearGradient>
  </TouchableOpacity>
));

export const ExpertBanner = forwardRef(({ onPress }, ref) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={{ overflow: "hidden" }}
  >
    <LinearGradient
      colors={["#C7DAFF", "#C7DAFF", "#FFFFFF"]}
      locations={[0, 0.75, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.fitnessClassBannerScanner}
    >
      <LottieView
        ref={ref}
        source={require("../../../assets/gif/diet_coach.json")}
        autoPlay={false}
        loop
        renderToHardwareTextureAndroid
        style={{ position: "absolute", width: "100%", height: 130 }}
      />
    </LinearGradient>
  </TouchableOpacity>
));

export const DietCoach = forwardRef(({ onPress }, ref) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={{ overflow: "hidden" }}
  >
    <LinearGradient
      colors={["#C7DAFF", "#C7DAFF", "#FFFFFF"]}
      locations={[0, 0.75, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.fitnessClassBannerScanner}
    >
      <LottieView
        ref={ref}
        source={require("../../../assets/gif/expert.json")}
        autoPlay={false}
        loop
        renderToHardwareTextureAndroid
        style={{ position: "absolute", width: "100%", height: 130 }}
      />
    </LinearGradient>
  </TouchableOpacity>
));

export const GymMateBanner = forwardRef(({ onPress }, ref) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={{ overflow: "hidden" }}
  >
    <LinearGradient
      colors={["#FFFFFF", "#FFFFFF", "#FFFFFF"]}
      locations={[0, 0.75, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.fitnessClassBannerScanner}
    >
      <LottieView
        ref={ref}
        source={require("../../../assets/gif/gym_mate.json")}
        autoPlay={false}
        loop
        renderToHardwareTextureAndroid
        style={{ position: "absolute", width: "100%", height: 130 }}
      />
    </LinearGradient>
  </TouchableOpacity>
));

export const ScannerBanner = forwardRef(({ onPress }, ref) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={{ overflow: "hidden" }}
  >
    <LinearGradient
      colors={["#20B6BB", "#20B6BB", "#FFFFFF"]}
      locations={[0, 0.75, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.fitnessClassBannerScanner}
    >
      <LottieView
        ref={ref}
        source={require("../../../assets/gif/scanner.json")}
        autoPlay={false}
        loop
        renderToHardwareTextureAndroid
        style={{ position: "absolute", width: "100%", height: 130 }}
      />
    </LinearGradient>
  </TouchableOpacity>
));

export const DailyPassBanner = forwardRef(({ onPress }, ref) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={{ overflow: "hidden" }}
  >
    <ImageBackground
      source={require("../../../assets/images/home_content/bg.webp")}
      style={styles.fitnessClassBannerScanner}
    >
      <LottieView
        ref={ref}
        source={require("../../../assets/gif/dailypass.json")}
        autoPlay={false}
        loop
        renderToHardwareTextureAndroid
        style={{ position: "absolute", width: "100%", height: 130 }}
      />
    </ImageBackground>
  </TouchableOpacity>
));
