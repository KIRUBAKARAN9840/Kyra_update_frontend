// HeaderComponent.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ImageBackground,
  Animated,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { MaskedText } from "../MaskedText";
import DietHeader from "./DietHeader";
import XpCard from "./XpCard";
import { useNavigation } from "../../../context/NavigationContext";
import { useRouter } from "expo-router";
import { isGymFreemium, isGymPremium } from "../../../config/access";
import { useUser } from "../../../context/UserContext";

const HeaderComponent = ({
  userName,
  progress,
  tag,
  badge,
  showHeader = false,
  headerTranslateY,
  gymName,
  xp,
  tabHeaders,
  activeTabHeader,
  setActiveTabHeader,
  setShowHeader,
  width,
  tabScrollViewRef,
  bgImage,
  tabIndex,
  color1,
  color2,
  toggleSideNav,
  headerName,
  gymDetails,
  showXpBar = true,
  page,
  isScrolled = false,
}) => {
  if (!showHeader) return null;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const { plan } = useUser();

  // Animated values for logo and gym name hiding on scroll
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const gymInfoOpacity = useRef(new Animated.Value(1)).current;
  const gymInfoTranslateY = useRef(new Animated.Value(0)).current;
  const menuButtonOpacity = useRef(new Animated.Value(1)).current;
  const topRowHeight = useRef(new Animated.Value(1)).current;

  // Animate logo and gym info based on scroll state
  useEffect(() => {
    // Always reset to expanded state when not on Fitness Studios
    const shouldCollapse = isScrolled && page === "home";

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: shouldCollapse ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(gymInfoOpacity, {
        toValue: shouldCollapse ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(gymInfoTranslateY, {
        toValue: shouldCollapse ? -20 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(menuButtonOpacity, {
        toValue: shouldCollapse ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(topRowHeight, {
        toValue: shouldCollapse ? 0 : 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isScrolled, activeTabHeader, page]);

  useEffect(() => {
    const index = tabHeaders.findIndex((tab) => tab.title === activeTabHeader);
    if (index !== -1) {
      setSelectedIndex(index);
    }
  }, [activeTabHeader, tabHeaders]);

  const radius = 25;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  const progressPercentage = 80;
  const strokeDashoffset =
    circumference - (progressPercentage / 100) * circumference;

  const handleTabSelection = (tab, index) => {
    setActiveTabHeader(tab);
    setShowHeader(true);
    setSelectedIndex(index);
    scrollToTab(tab);
  };

  const scrollToTab = (tabName) => {
    const index = tabIndex.indexOf(tabName);
    if (index !== -1 && tabScrollViewRef.current) {
      const approximateTabWidth = 100;
      const scrollToX = Math.max(
        0,
        index * approximateTabWidth - width / 2 + approximateTabWidth / 2,
      );
      tabScrollViewRef.current.scrollTo({ x: scrollToX, animated: true });
    }
  };

  const getBackgroundImage = () => {
    if (bgImage) return bgImage;

    const activeTab = tabHeaders.find((tab) => tab.title === activeTabHeader);
    if (activeTab && activeTab.bgImage) {
      return activeTab.bgImage;
    }

    return tabHeaders[selectedIndex]?.bgImage;
  };

  const getBackgroundColor = () => {
    const activeTab = tabHeaders.find((tab) => tab.title === activeTabHeader);
    if (activeTab && activeTab.bgColor) {
      return activeTab.bgColor;
    }

    return tabHeaders[selectedIndex]?.bgColor;
  };

  const router = useRouter();

  const goToGymDetails = () => {
    router.push({
      pathname: "/client/profile",
      params: {
        tab: "gym",
      },
    });
  };
  const goToGym = () => {
    router.push({
      pathname: "/client/home",
      params: {
        tab: "Fitness Studios",
      },
    });
  };

  const handleKyraAIPress = () => {
    // Add haptic feedback if available
    if (Platform.OS === "ios") {
      // Add iOS haptic feedback if needed
    }

    //

    // Navigate to KyraAI page
    router.push("/client/(workout)/kyraAI");
  };

  // Create a gradient background color based on color1 and color2
  const getGradientStyle = () => {
    return {
      backgroundColor: color1 || "#1DA1F2",
    };
  };

  return (
    <View
      style={[
        styles.headerContainer,
        {
          opacity: showHeader ? 1 : 0,
          height: showHeader ? "auto" : 0,
          backgroundColor: getBackgroundColor() || "transparent",
        },
      ]}
    >
      {/* Main Header with Background Image (only if no bgColor) */}
      {!getBackgroundColor() && (
        <View style={StyleSheet.absoluteFillObject}>
          <ImageBackground
            source={getBackgroundImage()}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        </View>
      )}

      {/* Content */}
      <View style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <Animated.View
            style={{
              opacity: topRowHeight,
              height: topRowHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 50],
                extrapolate: "clamp",
              }),
              overflow: "hidden",
            }}
          >
            <View style={styles.topRow}>
              <View style={styles.companyContainer}>
                <Animated.View style={{ opacity: menuButtonOpacity }}>
                  <TouchableOpacity
                    onPress={toggleSideNav}
                    style={styles.menuButton}
                  >
                    <Ionicons
                      name="menu-outline"
                      size={28}
                      color={page === "home" ? "#000000" : "#fff"}
                    ></Ionicons>
                  </TouchableOpacity>
                </Animated.View>
                <Animated.View style={{ opacity: logoOpacity }}>
                  {page === "home" ? (
                    // <MaskedText
                    //   text="Fymble"
                    //   bg1="#FF5757"
                    //   bg2="#0154a0"
                    //   textStyle={styles.logoText}
                    // />
                    <Text style={[styles.logoText, { color: "#FF5757" }]}>
                      <Text style={styles.logoFirstPart}>Fy</Text>
                      <Text style={styles.logoSecondPart}>mble</Text>
                    </Text>
                  ) : (
                    <Text style={[styles.logoText, { color: "#FFFFFF" }]}>
                      Fymble
                    </Text>
                  )}
                </Animated.View>
              </View>
              <Animated.View
                style={{
                  opacity: gymInfoOpacity,
                  transform: [{ translateY: gymInfoTranslateY }],
                }}
              >
                {isGymFreemium(plan) || isGymPremium(plan) ? (
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center" }}
                    onPress={goToGymDetails}
                  >
                    <Text
                      style={[
                        { color: "white", marginRight: 10, fontWeight: "500" },

                        page === "home" && styles.blackText,
                      ]}
                    >
                      {gymDetails?.name?.length > 18
                        ? gymDetails?.name.substring(0, 18) + "..."
                        : gymDetails?.name}
                    </Text>
                    <View style={styles.profileButtonInitial}>
                      <View style={styles.profileIcon}>
                        <Image
                          source={
                            gymDetails?.logo ||
                            require("../../../assets/images/header/gym_logo.png")
                          }
                          style={{ width: 36, height: 36, borderRadius: 18 }}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#FFFFFF",
                      paddingHorizontal: 10,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: "#FF5757",
                    }}
                    onPress={goToGym}
                  >
                    <Text
                      style={[
                        { color: "#FF5757", fontSize: 13 },

                        page === "home" && styles.blackText,
                        { color: "#FF5757" },
                      ]}
                    >
                      Join Gym
                    </Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            </View>
          </Animated.View>

          <DietHeader
            ref={tabScrollViewRef}
            tabHeaders={tabHeaders}
            activeTabHeader={activeTabHeader}
            handleTabSelection={handleTabSelection}
            headerName={headerName}
            showXpBar={showXpBar}
            page={page}
          />
        </View>
      </View>
    </View>
  );
};

export default HeaderComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fcfcfc",
  },
  contentContainer: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerGradient: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  headerContent: {
    flexDirection: "column",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    overflow: "hidden",
  },
  companyContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerLeft: {
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeContainer: {
    alignItems: "flex-end",
    marginRight: 10,
  },
  badgeText: {
    color: "#FFA500",
    fontSize: 14,
    fontWeight: "bold",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  xpText: {
    color: "#AAAAAA",
    fontSize: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  profileButton: {
    // Style for profile button if needed
  },
  profileIconWrapper: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badgeIcon: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeInitial: {
    width: 35,
    height: 35,
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 0.5,
    gap: 30,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
  },
  tabItem: {
    paddingBottom: 8,
    alignItems: "center",
    position: "relative",
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#fff",
  },
  tabIconContainer: {
    width: 25,
    height: 25,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 0,
  },
  tabIconContainerActive: {
    // Style for active tab icon if needed
  },
  tabTextHeader: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.5)",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  tabDescription: {
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
    fontSize: 17,
    fontWeight: "bold",
    color: "#FF5757",
    borderRadius: 5,
    lineHeight: 28,
  },
  logoFirstPart: {
    color: "#FF5757",
  },
  logoSecondPart: {
    color: "#263148",
  },
  profileButtonInitial: {
    marginRight: 10,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInitial: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF5757",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 70,
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    width: 250,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuItemText: {
    marginLeft: 15,
    fontSize: 16,
    color: "#333",
  },
  // Side Navigation Styles
  sideNavOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  sideNavBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sideNavContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: "80%",
    backgroundColor: "#fff",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  sideNavHeader: {
    padding: 20,
    backgroundColor: "#F5E7FF",
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  profileInfo: {
    marginLeft: 15,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  profileEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  editProfileButton: {
    backgroundColor: "#9B4DEE",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editProfileText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  sideNavContent: {
    paddingTop: 15,
  },
  sideNavItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5E7FF",
  },
  sideNavItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  sideNavIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5E7FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  sideNavItemText: {
    fontSize: 16,
    color: "#333",
  },
  blackText: {
    color: "#000000",
  },
});
