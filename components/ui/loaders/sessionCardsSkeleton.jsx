import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

const SessionCardsSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const SkeletonBox = ({ style }) => (
    <View style={[styles.skeletonBase, style]}>
      <Animated.View style={styles.skeletonContent} />
      <Animated.View
        style={[
          styles.shimmerOverlay,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );

  const renderSkeletonCard = (index) => (
    <View key={index} style={styles.card}>
      <SkeletonBox style={styles.cardImage} />
      <SkeletonBox style={styles.cardTitle} />
      <SkeletonBox style={styles.bookButton} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {renderSkeletonCard(0)}
        {renderSkeletonCard(1)}
      </View>
      <View style={styles.row}>
        {renderSkeletonCard(2)}
        {renderSkeletonCard(3)}
      </View>
      <View style={styles.row}>
        {renderSkeletonCard(4)}
        {renderSkeletonCard(5)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    paddingTop: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    width: "47%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginHorizontal: 6,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  skeletonBase: {
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
  },
  skeletonContent: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E1E9EE",
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
  cardImage: {
    width: "100%",
    height: 115,
  },
  cardTitle: {
    height: 16,
    marginHorizontal: 12,
    marginVertical: 12,
    borderRadius: 4,
  },
  bookButton: {
    height: 40,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
});

export default SessionCardsSkeleton;
