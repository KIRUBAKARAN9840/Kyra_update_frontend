import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";

const { width: screenWidth } = Dimensions.get("window");

// Base Shimmer Animation Hook
const useShimmerAnimation = (duration = 1500) => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, [shimmerValue, duration]);

  return shimmerValue;
};

// 1. Basic Shimmer Block Component
// const ShimmerBlock = ({
//   width = 100,
//   height = 20,
//   borderRadius = 4,
//   style = {},
//   backgroundColor = '#E1E9EE',
//   highlightColor = '#F2F8FC',
//   duration = 1500
// }) => {
//   const shimmerValue = useShimmerAnimation(duration);

//   const translateX = shimmerValue.interpolate({
//     inputRange: [0, 1],
//     outputRange: [-width, width],
//   });

//   const opacity = shimmerValue.interpolate({
//     inputRange: [0, 0.5, 1],
//     outputRange: [0.3, 1, 0.3],
//   });

//   return (
//     <View style={[
//       styles.shimmerContainer,
//       {
//         width,
//         height,
//         borderRadius,
//         backgroundColor
//       },
//       style
//     ]}>
//       <Animated.View
//         style={[
//           styles.shimmerOverlay,
//           {
//             opacity,
//             backgroundColor: highlightColor,
//             width: width * 0.7,
//             transform: [{ translateX }],
//           }
//         ]}
//       />
//     </View>
//   );
// };

const ShimmerBlock = ({
  width = 100,
  height = 20,
  borderRadius = 4,
  style = {},
  backgroundColor = "#E1E9EE",
  highlightColor = "#F2F8FC",
  duration = 1500,
}) => {
  const shimmerValue = useShimmerAnimation(duration);

  // Function to get numeric width for animations
  const getAnimationWidth = (width) => {
    if (typeof width === "string" && width.includes("%")) {
      const percentage = parseFloat(width.replace("%", ""));
      // Use screen width as base for percentage calculations in animations
      const { width: screenWidth } = Dimensions.get("window");
      return (screenWidth * percentage) / 100;
    }
    return typeof width === "string" ? parseFloat(width) || 100 : width;
  };

  const animationWidth = getAnimationWidth(width);

  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-animationWidth, animationWidth],
  });

  const opacity = shimmerValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  return (
    <View
      style={[
        styles.shimmerContainer,
        {
          width, // Original width (can be string like "70%" or number)
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmerOverlay,
          {
            opacity,
            backgroundColor: highlightColor,
            width: animationWidth * 0.7, // Use numeric width for overlay
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

// 2. Card Shimmer Component
const ShimmerCard = ({
  style = {},
  showImage = true,
  imageHeight = 150,
  titleLines = 1,
  descriptionLines = 2,
  padding = 16,
  borderRadius = 8,
  backgroundColor = "#FFFFFF",
  shimmerColor = "#E1E9EE",
  highlightColor = "#F2F8FC",
}) => {
  return (
    <View
      style={[
        styles.cardContainer,
        {
          padding,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    >
      {showImage && (
        <ShimmerBlock
          width="100%"
          height={imageHeight}
          borderRadius={borderRadius}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
          style={{ marginBottom: 12 }}
        />
      )}

      {Array.from({ length: titleLines }).map((_, index) => (
        <ShimmerBlock
          key={`title-${index}`}
          width={index === titleLines - 1 ? "70%" : "100%"}
          height={18}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
          style={{ marginBottom: 8 }}
        />
      ))}

      {Array.from({ length: descriptionLines }).map((_, index) => (
        <ShimmerBlock
          key={`desc-${index}`}
          width={index === descriptionLines - 1 ? "60%" : "100%"}
          height={14}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
          style={{ marginBottom: 6 }}
        />
      ))}
    </View>
  );
};

// 3. List Item Shimmer Component
const ShimmerListItem = ({
  showAvatar = true,
  avatarSize = 40,
  titleWidth = "70%",
  subtitleWidth = "50%",
  style = {},
  rightContent = false,
  backgroundColor = "#FFFFFF",
  shimmerColor = "#E1E9EE",
  highlightColor = "#F2F8FC",
  padding = 16,
}) => {
  return (
    <View
      style={[
        styles.listItemContainer,
        {
          backgroundColor,
          paddingVertical: padding * 0.75,
          paddingHorizontal: padding,
        },
        style,
      ]}
    >
      {showAvatar && (
        <ShimmerBlock
          width={avatarSize}
          height={avatarSize}
          borderRadius={avatarSize / 2}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
          style={{ marginRight: 12 }}
        />
      )}

      <View style={styles.listItemContent}>
        <ShimmerBlock
          width={titleWidth}
          height={16}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
          style={{ marginBottom: 6 }}
        />
        <ShimmerBlock
          width={subtitleWidth}
          height={12}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
        />
      </View>

      {rightContent && (
        <ShimmerBlock
          width={60}
          height={20}
          borderRadius={10}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
        />
      )}
    </View>
  );
};

// 4. Profile Header Shimmer
const ShimmerProfileHeader = ({
  showCoverImage = true,
  coverHeight = 120,
  avatarSize = 80,
  style = {},
  backgroundColor = "#FFFFFF",
  shimmerColor = "#E1E9EE",
  highlightColor = "#F2F8FC",
}) => {
  return (
    <View style={[styles.profileContainer, { backgroundColor }, style]}>
      {showCoverImage && (
        <ShimmerBlock
          width="100%"
          height={coverHeight}
          borderRadius={0}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
          style={{ marginBottom: -avatarSize / 2 }}
        />
      )}

      <View style={styles.profileContent}>
        <ShimmerBlock
          width={avatarSize}
          height={avatarSize}
          borderRadius={avatarSize / 2}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
          style={{
            alignSelf: "center",
            marginBottom: 16,
            marginTop: showCoverImage ? avatarSize / 2 : 0,
          }}
        />

        <ShimmerBlock
          width="60%"
          height={20}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
          style={{ alignSelf: "center", marginBottom: 8 }}
        />

        <ShimmerBlock
          width="40%"
          height={14}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
          style={{ alignSelf: "center", marginBottom: 16 }}
        />

        <View style={styles.profileStats}>
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={index} style={styles.statItem}>
              <ShimmerBlock
                width={30}
                height={16}
                backgroundColor={shimmerColor}
                highlightColor={highlightColor}
                style={{ marginBottom: 4 }}
              />
              <ShimmerBlock
                width={50}
                height={12}
                backgroundColor={shimmerColor}
                highlightColor={highlightColor}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// 5. News Article Shimmer
const ShimmerNewsArticle = ({
  showImage = true,
  imagePosition = "top", // 'top', 'left', 'right'
  style = {},
  backgroundColor = "#FFFFFF",
  shimmerColor = "#E1E9EE",
  highlightColor = "#F2F8FC",
}) => {
  const renderContent = () => (
    <View style={styles.newsContent}>
      <ShimmerBlock
        width="100%"
        height={18}
        backgroundColor={shimmerColor}
        highlightColor={highlightColor}
        style={{ marginBottom: 8 }}
      />
      <ShimmerBlock
        width="85%"
        height={18}
        backgroundColor={shimmerColor}
        highlightColor={highlightColor}
        style={{ marginBottom: 12 }}
      />
      <ShimmerBlock
        width="100%"
        height={14}
        backgroundColor={shimmerColor}
        highlightColor={highlightColor}
        style={{ marginBottom: 6 }}
      />
      <ShimmerBlock
        width="90%"
        height={14}
        backgroundColor={shimmerColor}
        highlightColor={highlightColor}
        style={{ marginBottom: 6 }}
      />
      <ShimmerBlock
        width="60%"
        height={14}
        backgroundColor={shimmerColor}
        highlightColor={highlightColor}
        style={{ marginBottom: 12 }}
      />

      <View style={styles.newsFooter}>
        <ShimmerBlock
          width={80}
          height={12}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
        />
        <ShimmerBlock
          width={60}
          height={12}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
        />
      </View>
    </View>
  );

  const renderImage = () =>
    showImage && (
      <ShimmerBlock
        width={imagePosition === "top" ? "100%" : 100}
        height={imagePosition === "top" ? 150 : 80}
        borderRadius={6}
        backgroundColor={shimmerColor}
        highlightColor={highlightColor}
        style={{
          marginBottom: imagePosition === "top" ? 12 : 0,
          marginRight: imagePosition === "left" ? 12 : 0,
          marginLeft: imagePosition === "right" ? 12 : 0,
        }}
      />
    );

  if (imagePosition === "top") {
    return (
      <View style={[styles.newsContainer, { backgroundColor }, style]}>
        {renderImage()}
        {renderContent()}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.newsContainer,
        styles.newsHorizontal,
        { backgroundColor },
        style,
      ]}
    >
      {imagePosition === "left" && renderImage()}
      <View style={{ flex: 1 }}>{renderContent()}</View>
      {imagePosition === "right" && renderImage()}
    </View>
  );
};

// 6. Grid Shimmer Component
const ShimmerGrid = ({
  columns = 2,
  itemCount = 6,
  itemHeight = 120,
  spacing = 12,
  style = {},
  backgroundColor = "#FFFFFF",
  shimmerColor = "#E1E9EE",
  highlightColor = "#F2F8FC",
}) => {
  const itemWidth = (screenWidth - spacing * (columns + 1)) / columns;

  return (
    <View
      style={[
        styles.gridContainer,
        {
          padding: spacing / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      {Array.from({ length: itemCount }).map((_, index) => (
        <ShimmerBlock
          key={index}
          width={itemWidth}
          height={itemHeight}
          borderRadius={8}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
          style={{
            margin: spacing / 2,
          }}
        />
      ))}
    </View>
  );
};

// 7. Text Lines Shimmer (for paragraphs)
const ShimmerTextLines = ({
  lines = 3,
  lineHeight = 14,
  lineSpacing = 6,
  lastLineWidth = "60%",
  style = {},
  shimmerColor = "#E1E9EE",
  highlightColor = "#F2F8FC",
}) => {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <ShimmerBlock
          key={index}
          width={index === lines - 1 ? lastLineWidth : "100%"}
          height={lineHeight}
          backgroundColor={shimmerColor}
          highlightColor={highlightColor}
          style={{ marginBottom: index !== lines - 1 ? lineSpacing : 0 }}
        />
      ))}
    </View>
  );
};

// 8. Button Shimmer
const ShimmerButton = ({
  width = 120,
  height = 40,
  borderRadius = 8,
  style = {},
  shimmerColor = "#E1E9EE",
  highlightColor = "#F2F8FC",
}) => {
  return (
    <ShimmerBlock
      width={width}
      height={height}
      borderRadius={borderRadius}
      backgroundColor={shimmerColor}
      highlightColor={highlightColor}
      style={style}
    />
  );
};

// Styles
const styles = StyleSheet.create({
  shimmerContainer: {
    overflow: "hidden",
  },
  shimmerOverlay: {
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },

  // Card Styles
  cardContainer: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // List Item Styles
  listItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  listItemContent: {
    flex: 1,
  },

  // Profile Styles
  profileContainer: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileContent: {
    padding: 16,
  },
  profileStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },

  // News Styles
  newsContainer: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  newsHorizontal: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  newsContent: {
    flex: 1,
  },
  newsFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Grid Styles
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});

export {
  ShimmerBlock,
  ShimmerCard,
  ShimmerListItem,
  ShimmerProfileHeader,
  ShimmerNewsArticle,
  ShimmerGrid,
  ShimmerTextLines,
  ShimmerButton,
  useShimmerAnimation,
};
