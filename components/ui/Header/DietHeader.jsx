import { Image } from "expo-image";
import React, { forwardRef, useEffect, useRef } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { ScrollView, TouchableOpacity } from "react-native";

const { width, height } = Dimensions.get("window");

const DietHeader = forwardRef(
  (
    {
      tabHeaders,
      activeTabHeader,
      handleTabSelection,
      headerName,
      showXpBar,
      page,
    },
    ref,
  ) => {
    const isTablet = () => {
      const aspectRatio = height / width;
      return width >= 768 || (width >= 600 && aspectRatio < 1.6);
    };

    // Create animation refs for each tab
    const scaleAnimations = useRef(
      tabHeaders?.map(() => new Animated.Value(1)) || [],
    ).current;
    const shimmerAnimations = useRef(
      tabHeaders?.map(() => new Animated.Value(0)) || [],
    ).current;

    // Heartbeat animation with shimmer for Fitness Studios when inactive
    useEffect(() => {
      const gymStudiosIndex = tabHeaders?.findIndex(
        (tab) => tab.title === "Fitness Studios",
      );

      if (gymStudiosIndex !== -1) {
        const isActive = activeTabHeader === "Fitness Studios";

        if (!isActive) {
          const scaleAnim = scaleAnimations[gymStudiosIndex];
          const shimmerAnim = shimmerAnimations[gymStudiosIndex];

          const heartbeatAnimation = Animated.loop(
            Animated.sequence([
              // First heartbeat with shimmer
              Animated.parallel([
                Animated.timing(scaleAnim, {
                  toValue: 1.15,
                  duration: 400,
                  useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                  toValue: 1,
                  duration: 400,
                  useNativeDriver: true,
                }),
              ]),
              Animated.parallel([
                Animated.timing(scaleAnim, {
                  toValue: 1,
                  duration: 400,
                  useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                  toValue: 0,
                  duration: 400,
                  useNativeDriver: true,
                }),
              ]),
              // Second heartbeat
              Animated.timing(scaleAnim, {
                toValue: 1.1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              // Pause before repeat
              Animated.delay(1200),
            ]),
          );

          heartbeatAnimation.start();

          return () => {
            heartbeatAnimation.stop();
            scaleAnim.setValue(1);
            shimmerAnim.setValue(0);
          };
        } else {
          // Reset animations when active
          scaleAnimations[gymStudiosIndex].setValue(1);
          shimmerAnimations[gymStudiosIndex].setValue(0);
        }
      }
    }, [activeTabHeader, tabHeaders]);

    return (
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.tabsContainer,
          // { flex: tabHeaders?.length > 3 ? 0 : 1 },
          {
            flex:
              (headerName === "Diet" ||
                headerName === "Feed" ||
                headerName === "Workout") &&
              1,
          },
          // Add minimum height when no tabs to maintain header height
          tabHeaders?.length === 0 && { minHeight: 70 },
        ]}
        pointerEvents="auto"
        style={{ zIndex: 999 }}
      >
        {tabHeaders?.map((tab, index) => {
          const isActive = activeTabHeader === tab.title;
          const isGymStudios = tab.title === "Fitness Studios";
          const shouldAnimate = isGymStudios && !isActive;

          return (
            <TouchableOpacity
              key={tab.title}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => handleTabSelection(tab.title, index)}
            >
              <Animated.View
                style={[
                  styles.tabIconContainer,
                  isActive && styles.tabIconContainerActive,
                  shouldAnimate && {
                    transform: [{ scale: scaleAnimations[index] }],
                    opacity: shimmerAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.5],
                    }),
                  },
                ]}
              >
                {tab.iconType === "icon" && tab.iconLibrary && tab.iconName && (
                  <tab.iconLibrary
                    name={tab.iconName}
                    size={14}
                    color={isActive ? "#fff" : "rgba(255, 255, 255, 0.5)"}
                  />
                )}
                {tab.iconType === "png" && page === "home" && isActive && (
                  <Image
                    source={tab.iconSourceActive}
                    style={{
                      width: 31,
                      height: 31,
                      // tintColor: isActive ? "#fff" : "rgba(255, 255, 255, 0.5)",
                    }}
                    contentFit="contain"
                  />
                )}

                {tab.iconType === "png" && page === "home" && !isActive && (
                  <Image
                    source={tab.iconSource}
                    style={{
                      width: 31,
                      height: 31,
                      // tintColor: isActive ? "#fff" : "rgba(255, 255, 255, 0.5)",
                    }}
                    contentFit="contain"
                  />
                )}

                {tab.iconType === "png" && page !== "home" && (
                  <Image
                    source={tab.iconSource}
                    style={{
                      width: 40,
                      height: 40,
                      tintColor: isActive ? "#fff" : "rgba(255, 255, 255, 0.5)",
                    }}
                    contentFit="contain"
                  />
                )}
                {tab.iconType === "image" && (
                  <Image
                    source={tab.iconSource}
                    style={{
                      width: 14,
                      height: 14,
                    }}
                    contentFit="contain"
                  />
                )}
              </Animated.View>
              {page === "home" ? (
                <Text
                  style={[
                    styles.tabTextHeader,
                    isActive && styles.tabTextActive,
                    // !showXpBar && styles.tabTextXp,
                    isActive && {
                      color: "#1A1A1A",
                      fontWeight: "normal",
                      paddingTop: 3,
                    },
                    !isActive && {
                      color: "rgba(26,26,26,0.4)",
                      fontWeight: "normal",
                      paddingTop: 3,
                    },
                  ]}
                >
                  {tab.title}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.tabTextHeader,
                    isActive && styles.tabTextActive,
                    // !showXpBar && styles.tabTextXp,
                  ]}
                >
                  {tab.title}
                </Text>
              )}
              {isActive && page === "home" && (
                <View
                  style={[styles.border_bottom, { backgroundColor: "#FF5757" }]}
                ></View>
              )}
              {isActive && page !== "home" && (
                <View style={styles.border_bottom}></View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  },
);

export default DietHeader;

const styles = StyleSheet.create({
  tabsContainer: {
    // flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 0.5,
    gap: 30,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
    // backgroundColor: 'green',
  },

  tabItem: {
    // paddingBottom: 8,
    alignItems: "center",
    position: "relative",
  },
  tabItemActive: {
    // borderBottomWidth: 3,
    // borderBottomColor: '#fff',
    // borderTopLeftRadius: 50,
  },
  tabIconContainer: {
    width: 40,
    height: 40,
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
    paddingBottom: 8,
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  tabDescription: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
    fontSize: 15,
    fontWeight: "bold",
    color: "#000000",
    borderRadius: 5,
  },
  logoFirstPart: {
    color: "#FF5757",
  },
  logoSecondPart: {
    color: "#FFFFFF",
  },
  border_bottom: {
    width: "100%",
    height: 3,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: "#fff",
  },
  tabTextXp: {
    color: "#000000",
  },
});
