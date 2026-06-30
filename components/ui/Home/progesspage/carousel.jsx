import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  PanResponder,
} from "react-native";
import { MaskedText } from "../../MaskedText";
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const ITEM_WIDTH = screenWidth - 10;

const Carousel = ({
  data,
  autoPlayInterval = 3000,
  onChangeTab,
  gender,
  useManualPosters = false,
  deviceIsTablet = false,
}) => {
  // Create infinite loop data by duplicating first and last items
  const loopData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    if (data.length === 1) return data;
    return [data[data.length - 1], ...data, data[0]];
  }, [data]);

  const [activeIndex, setActiveIndex] = useState(1); // Start at index 1 (real first item)
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(screenWidth)).current; // Start at first real item
  const router = useRouter();
  const isScrolling = useRef(false);
  const autoScrollTimer = useRef(null);
  const transitionTimers = useRef([]);

  // Auto-play functionality
  useEffect(() => {
    if (!data || data.length <= 1) return;

    autoScrollTimer.current = setInterval(() => {
      if (!isScrolling.current && flatListRef.current) {
        const nextIndex = activeIndex + 1;
        if (nextIndex < loopData.length) {
          try {
            flatListRef.current.scrollToIndex({
              animated: true,
              index: nextIndex,
            });
          } catch (error) {
            // Ignore scroll errors
          }
        }
      }
    }, autoPlayInterval);

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
        autoScrollTimer.current = null;
      }
    };
  }, [activeIndex, data.length, loopData.length]);

  // Handle infinite loop transitions
  useEffect(() => {
    if (!data || data.length <= 1 || !loopData || loopData.length <= 1) return;

    const listener = scrollX.addListener(({ value }) => {
      const index = Math.round(value / screenWidth);

      // If we're at the last duplicate (first real item copy)
      if (index === loopData.length - 1 && !isScrolling.current) {
        const timer = setTimeout(() => {
          isScrolling.current = true;
          if (flatListRef.current) {
            try {
              flatListRef.current.scrollToIndex({
                animated: false,
                index: 1, // Jump to real first item
              });
              setActiveIndex(1);
              const innerTimer = setTimeout(() => {
                isScrolling.current = false;
              }, 50);
              transitionTimers.current.push(innerTimer);
            } catch (error) {
              isScrolling.current = false;
            }
          }
        }, 100);
        transitionTimers.current.push(timer);
      }
      // If we're at the first duplicate (last real item copy)
      else if (index === 0 && !isScrolling.current) {
        const timer = setTimeout(() => {
          isScrolling.current = true;
          if (flatListRef.current) {
            const targetIndex = loopData.length - 2;
            if (targetIndex >= 0 && targetIndex < loopData.length) {
              try {
                flatListRef.current.scrollToIndex({
                  animated: false,
                  index: targetIndex, // Jump to real last item
                });
                setActiveIndex(targetIndex);
                const innerTimer = setTimeout(() => {
                  isScrolling.current = false;
                }, 50);
                transitionTimers.current.push(innerTimer);
              } catch (error) {
                isScrolling.current = false;
              }
            }
          }
        }, 100);
        transitionTimers.current.push(timer);
      }
    });

    return () => {
      scrollX.removeListener(listener);
      // Clear all transition timers
      transitionTimers.current.forEach((timer) => clearTimeout(timer));
      transitionTimers.current = [];
    };
  }, [data.length, loopData.length]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        if (isScrolling.current || !event?.nativeEvent) return;

        const slideIndex = Math.round(
          event.nativeEvent.contentOffset.x / screenWidth,
        );

        if (
          slideIndex !== activeIndex &&
          slideIndex >= 0 &&
          slideIndex < loopData.length
        ) {
          setActiveIndex(slideIndex);
        }
      },
    },
  );

  const onScrollBeginDrag = () => {
    isScrolling.current = true;
  };

  const onScrollEndDrag = () => {
    setTimeout(() => {
      isScrolling.current = false;
    }, 100);
  };

  const goToPage = (path) => {
    switch (path) {
      case "workout":
        router.push("/client/workout");
        return;
      case "iphone":
        router.push("/client/rewardprogram");
        return;
      case "diet":
        router.push("/client/diet");
        return;
      case "feed":
        router.push("/client/feed");
        return;
      case "nearby_gyms":
        onChangeTab("Fitness Studios");
        return;
      case "session":
        onChangeTab("Fitness Studios");
        return;
      case "personal_trainer":
        onChangeTab("Fitness Studios");
        return;
      case "dailypass":
        onChangeTab("Fitness Studios");
        return;
      case "bnpl":
        onChangeTab("Fitness Studios");
        return;
      case "couple_membership":
        onChangeTab("Fitness Studios");
        return;
      case "no_cost_emi":
        onChangeTab("Fitness Studios");
        return;
      case "general_analysis":
        onChangeTab("Analysis");
        return;
      case "reminders":
        onChangeTab("Reminders");
        return;
      case "rewards":
        onChangeTab("My Rewards");
      case "kyraai":
        router.push("/client/(workout)/kyraAI");
        return;
      case "gym_buddy":
        onChangeTab("Gym Buddy");
        return;
      case "water":
        onChangeTab("Reminders");
        return;
      case "membership":
        onChangeTab("Fitness Studios");
        return;
      case "live_gym":
        onChangeTab("My Gym");
        return;
    }
    return null;
  };

  const renderItem = ({ item, index }) => {
    if (!item || !item.url) return null;

    // Check if URL is a string (remote URL from backend) or a require() result (local image)
    const imageSource =
      typeof item.url === "string" ? { uri: item.url } : item.url;

    return (
      <TouchableOpacity onPress={() => goToPage(item.description)}>
        <View style={styles.slideOuter}>
          <View style={styles.slide}>
            <Image
              source={imageSource}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render progress indicators (only for original data length)
  const renderIndicators = () => {
    if (!data || data.length <= 1) return null;

    return (
      <View style={styles.indicatorContainer}>
        {data.map((_, index) => {
          // Calculate which real item is currently active
          let realActiveIndex = activeIndex - 1;
          if (activeIndex === 0) realActiveIndex = data.length - 1; // Last duplicate shows last real item
          if (activeIndex === loopData.length - 1) realActiveIndex = 0; // First duplicate shows first real item

          const isActive = index === realActiveIndex;

          return (
            <View
              key={index}
              style={[
                styles.indicator,
                {
                  width: isActive ? 25 : 10,
                  opacity: isActive ? 1 : 0.5,
                  backgroundColor: isActive ? "#FF5757" : "#D3D3D3",
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  // Initialize scroll position on mount and cleanup on unmount
  useEffect(() => {
    let initTimer = null;
    if (data && data.length > 1 && loopData && loopData.length > 1) {
      initTimer = setTimeout(() => {
        if (flatListRef.current) {
          try {
            flatListRef.current.scrollToIndex({
              animated: false,
              index: 1, // Start at first real item
            });
          } catch (error) {
            // Ignore scroll errors on initial mount
          }
        }
      }, 100);
    }

    return () => {
      // Cleanup all timers
      if (initTimer) clearTimeout(initTimer);
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
        autoScrollTimer.current = null;
      }
      transitionTimers.current.forEach((timer) => clearTimeout(timer));
      transitionTimers.current = [];
    };
  }, []);

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={loopData}
        renderItem={renderItem}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        scrollEventThrottle={16}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.flatlistContent}
        getItemLayout={(data, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />
      {renderIndicators()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    // overflow: "hidden",
    marginVertical: 10,
  },
  gradient: {
    paddingVertical: 7,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333333",
    marginLeft: 20,
  },
  flatlistContent: {
    alignItems: "center",
  },
  slideOuter: {
    width: screenWidth,
    height: screenWidth >= 786 ? 320 : 150,
    paddingHorizontal: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  slide: {
    width: ITEM_WIDTH,
    height: screenWidth >= 786 ? 320 : 150,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
    paddingBottom: 50,
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  description: {
    color: "white",
    fontSize: 16,
  },
  indicatorContainer: {
    position: "absolute",
    bottom: -15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  indicator: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FF5757",
    marginHorizontal: 4,
  },
});

export default Carousel;
