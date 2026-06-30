import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Svg, { Circle, Line } from "react-native-svg";
import { Color } from "../../../GlobalStyles";

const CircularProgressBar = ({
  size = 200,
  width = 15,
  initialValue = 55,
  minValue = 0,
  maxValue = 100,
  tintColor = Color.rgPrimary,
  backgroundColor = "#888",
  unit = "kg",
  onProgressChange,
  style,
}) => {
  const [fill, setFill] = useState(initialValue);
  const scrollViewRef = useRef(null);
  const itemHeight = 50;
  const visibleItems = 5;

  // Simplified scroll state tracking like age selector
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Generate numbers array
  const numbers = Array.from(
    { length: maxValue - minValue + 1 },
    (_, i) => i + minValue
  );

  // Update fill when initialValue changes (when coming back from next page)
  useEffect(() => {
    setFill(initialValue);
  }, [initialValue]);

  // Initialize component
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Scroll to correct position when fill changes
  useEffect(() => {
    if (!isInitialized || !scrollViewRef.current) return;

    const scrollToPosition = () => {
      const index = fill - minValue; // Direct calculation instead of findIndex

      if (index >= 0 && index < numbers.length && !isScrollingRef.current) {
        scrollViewRef.current.scrollTo({
          y: index * itemHeight,
          animated: false,
        });
      }
    };

    // Add a small delay to ensure ScrollView is ready
    const timeout = setTimeout(scrollToPosition, 100);
    return () => clearTimeout(timeout);
  }, [fill, isInitialized, minValue, itemHeight, numbers.length]);

  // Simplified scroll handler like age selector
  const handleScroll = useCallback(
    (event) => {
      isScrollingRef.current = true;
      const offsetY = event.nativeEvent.contentOffset.y;
      const currentIndex = Math.round(offsetY / itemHeight);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      const currentOffsetY = offsetY;
      scrollTimeoutRef.current = setTimeout(() => {
        const finalIndex = Math.round(currentOffsetY / itemHeight);
        const newValue = Math.max(
          minValue,
          Math.min(maxValue, finalIndex + minValue)
        );

        if (
          finalIndex >= 0 &&
          finalIndex < numbers.length &&
          newValue !== fill
        ) {
          setFill(newValue);
          if (onProgressChange) {
            onProgressChange(newValue);
          }
        }

        isScrollingRef.current = false;
      }, 150);
    },
    [minValue, maxValue, itemHeight, onProgressChange, numbers.length, fill]
  );

  // Simplified momentum scroll end handler like age selector
  const handleMomentumScrollEnd = useCallback(
    (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const currentIndex = Math.round(offsetY / itemHeight);
      const newValue = Math.max(
        minValue,
        Math.min(maxValue, currentIndex + minValue)
      );

      if (
        currentIndex >= 0 &&
        currentIndex < numbers.length &&
        newValue !== fill
      ) {
        setFill(newValue);
        if (onProgressChange) {
          onProgressChange(newValue);
        }
      }

      isScrollingRef.current = false;
    },
    [minValue, maxValue, itemHeight, onProgressChange, numbers.length, fill]
  );

  // Handle direct item press like age selector
  const handleItemPress = useCallback(
    (value, index) => {
      if (isScrollingRef.current) return;

      setFill(value);
      if (onProgressChange) {
        onProgressChange(value);
      }

      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: index * itemHeight,
          animated: true,
        });
      }
    },
    [onProgressChange, itemHeight]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Generate ticks for speedometer (memoized for performance)
  const renderTicks = useCallback(() => {
    const ticks = [];
    const totalTicks = 30;
    const startAngle = -90;
    const sweepAngle = 180;
    const radius = size / 2;

    for (let i = 0; i <= totalTicks; i++) {
      const angle = startAngle + (sweepAngle * i) / totalTicks;
      const radians = angle * (Math.PI / 180);
      const isLargeTick = i % 5 === 0;
      const innerRadius = isLargeTick ? radius - 30 : radius - 20;

      const x1 = radius + innerRadius * Math.cos(radians);
      const y1 = radius + innerRadius * Math.sin(radians);
      const x2 = radius + radius * Math.cos(radians);
      const y2 = radius + radius * Math.sin(radians);

      ticks.push(
        <Line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#FFFFFF"
          strokeWidth={isLargeTick ? 3 : 1}
        />
      );
    }

    return ticks;
  }, [size]);

  return (
    <View style={[styles.container, style]}>
      <Text
        style={[
          styles.valueText,
          {
            fontSize: size / 5,
            color: tintColor,
          },
        ]}
      >
        {`${Math.round(fill)} ${unit}`}
      </Text>

      <AnimatedCircularProgress
        size={size}
        width={width}
        fill={((fill - minValue) / (maxValue - minValue)) * 100}
        tintColor={tintColor}
        backgroundColor={backgroundColor}
        arcSweepAngle={180}
        rotation={-90}
        lineCap="round"
        padding={5}
        renderBackground={() => (
          <Svg
            style={[
              StyleSheet.absoluteFill,
              styles.ticksOverlay,
              { zIndex: 100 },
            ]}
          >
            {renderTicks()}
          </Svg>
        )}
        renderCap={({ center }) => (
          <Circle cx={center.x} cy={center.y} r="10" fill={tintColor} />
        )}
      >
        {() => (
          <View style={styles.contentContainer}>
            <View
              style={[
                styles.scrollContainer,
                { height: itemHeight * visibleItems },
              ]}
            >
              {/* Selection highlight like age selector */}
              <View style={styles.selectionHighlight} />

              <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={[
                  styles.scrollContent,
                  {
                    paddingVertical:
                      (visibleItems * itemHeight - itemHeight) / 2,
                  },
                ]}
                onScroll={handleScroll}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                snapToInterval={itemHeight}
                decelerationRate="fast"
                bounces={false}
                overScrollMode="never"
              >
                {numbers.map((number, index) => (
                  <TouchableOpacity
                    key={number}
                    style={[styles.itemContainer, { height: itemHeight }]}
                    onPress={() => handleItemPress(number, index)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.numberItem,
                        number === fill && styles.activeNumber,
                      ]}
                    >
                      {number}
                      {number === fill ? ` ${unit}` : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </AnimatedCircularProgress>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  ticksOverlay: {
    zIndex: 100,
    position: "absolute",
  },
  scrollContainer: {
    overflow: "hidden",
    position: "relative",
  },
  scrollView: {
    width: "100%",
  },
  scrollContent: {
    alignItems: "center",
  },
  selectionHighlight: {
    position: "absolute",
    top: "40%",
    bottom: "40%",
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: Color.rgPrimary,
    zIndex: 1,
    pointerEvents: "none",
  },
  itemContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  numberItem: {
    fontSize: 18,
    textAlign: "center",
    textAlignVertical: "center",
    color: "#b9b9b9",
    fontWeight: "500",
    lineHeight: 50,
  },
  activeNumber: {
    fontSize: 22,
    color: Color.rgPrimary,
    fontWeight: "bold",
  },
  valueText: {
    fontWeight: "bold",
    marginBottom: 10,
    color: Color.rgPrimary,
  },
});

export default CircularProgressBar;
