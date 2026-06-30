import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, Dimensions } from "react-native";

const FitnessLoader = ({ padding = 0, page = "default" }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "0deg"],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screenWidth * 0.8],
  });

  const gifPath = {
    default: {url:require("../../assets/gif/Home-page_L.gif"), width:'100%',height:'100%', fit:'cover'},
    feed: {url:require("../../assets/gif/feed.gif"), width:150,height:150, fit:'cover'},
    workout1: {url:require("../../assets/gif/tred_female.gif"), width:200,height:200, fit:'cover'},
    workout2: {url:require("../../assets/gif/tred_male.gif"), width:150,height:150, fit:'cover'},
    diet: {url:require("../../assets/gif/Home-page_L.gif"), width:'100%',height:'100%', fit:'cover'},
  };

  return (
    <View style={[styles.fullScreenContainer, { paddingTop: padding }]}>
      {/* <Animated.View
        style={[
          styles.imageContainer,
          {
            transform: [{ scale: pulseAnim }, { rotate: spin }],
          },
        ]}
      > */}
      <Image source={gifPath[page].url} style={{width: gifPath[page].width,
    height: gifPath[page].height,}} contentFit={gifPath[page].fit} />
      {/* </Animated.View> */}

      {/* Progress bar */}
      {/* <View style={styles.progressContainer}>
                <Animated.View
                    style={[
                        styles.progressBar,
                        {
                            width: progressWidth,
                        },
                    ]}
                />
            </View> */}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    zIndex: 999999,
  },
  imageContainer: {
    width: 'auto',
    height: 'auto',
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent", 
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  progressContainer: {
    width: "100%",
    height: 3,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginTop: 30,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#FF4757",
    borderRadius: 4,
  },
  dotsContainer: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#FF4757",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
});

export default FitnessLoader;
