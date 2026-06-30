import { useRef, useCallback, useEffect, useState } from "react";
import { PanResponder, Animated, Platform, Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

// Configuration constants
const DEFAULT_CONFIG = {
  edgeSwipeThreshold: 30,
  swipeMinDistance: 50,
  swipeMinVelocity: 0.3,
  maxSwipeWidth: width * 0.8,
  animationDuration: 200,
  temporaryDisableDuration: 300,
  preventIOSBackSwipe: true,
};

/**
 * Custom hook for handling left edge swipe gestures (iOS only)
 * with React Navigation gesture conflict prevention
 */
export const useEdgeSwipe = ({
  onSwipeComplete,
  isEnabled = true,
  isBlocked = false,
  config = {},
}) => {
  const isIOS = Platform.OS === "ios";
  const swipeConfig = { ...DEFAULT_CONFIG, ...config };

  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [isTemporarilyDisabled, setIsTemporarilyDisabled] = useState(false);

  const swipeAnimatedValue = useRef(new Animated.Value(0)).current;
  const temporaryDisableTimeout = useRef(null);

  const effectivelyEnabled = isEnabled && !isTemporarilyDisabled;

  const resetSwipe = useCallback(() => {
    swipeAnimatedValue.setValue(0);
    setIsSwipeActive(false);
  }, [swipeAnimatedValue]);

  const temporarilyDisableSwipe = useCallback(
    (duration = swipeConfig.temporaryDisableDuration) => {
      setIsTemporarilyDisabled(true);

      if (temporaryDisableTimeout.current) {
        clearTimeout(temporaryDisableTimeout.current);
      }

      temporaryDisableTimeout.current = setTimeout(() => {
        setIsTemporarilyDisabled(false);
        temporaryDisableTimeout.current = null;
      }, duration);
    },
    [swipeConfig.temporaryDisableDuration]
  );

  const completeSwipe = useCallback(
    (shouldComplete = true) => {
      const toValue = shouldComplete ? swipeConfig.maxSwipeWidth : 0;

      Animated.timing(swipeAnimatedValue, {
        toValue,
        duration: swipeConfig.animationDuration,
        useNativeDriver: false,
      }).start(() => {
        if (shouldComplete && onSwipeComplete) {
          onSwipeComplete();
        }
        resetSwipe();
      });
    },
    [swipeAnimatedValue, swipeConfig, onSwipeComplete, resetSwipe]
  );

  // Create pan responder with aggressive gesture handling
  const createPanResponder = useCallback(() => {
    if (!isIOS) {
      return null;
    }

    return PanResponder.create({
      // Be very aggressive about capturing edge touches
      onStartShouldSetPanResponderCapture: (evt, gestureState) => {
        const isFromEdge =
          evt.nativeEvent.pageX <= swipeConfig.edgeSwipeThreshold;
        const shouldCapture =
          isScreenFocused && effectivelyEnabled && !isBlocked && isFromEdge;

        if (__DEV__ && shouldCapture) {
        }

        return shouldCapture;
      },

      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        const isFromEdge =
          evt.nativeEvent.pageX <= swipeConfig.edgeSwipeThreshold;
        const isHorizontal =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const isRightward = gestureState.dx > 5; // Any rightward movement from edge

        const shouldCapture =
          isScreenFocused &&
          effectivelyEnabled &&
          !isBlocked &&
          isFromEdge &&
          isHorizontal &&
          isRightward;

        if (__DEV__ && shouldCapture) {
        }

        return shouldCapture;
      },

      // Also set the regular responders
      onStartShouldSetPanResponder: (evt, gestureState) => {
        const isFromEdge =
          evt.nativeEvent.pageX <= swipeConfig.edgeSwipeThreshold;
        const shouldStart =
          isScreenFocused &&
          effectivelyEnabled &&
          !isBlocked &&
          !isSwipeActive &&
          isFromEdge &&
          Math.abs(gestureState.dy) < 50;

        return shouldStart;
      },

      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const isFromEdge =
          evt.nativeEvent.pageX <= swipeConfig.edgeSwipeThreshold;
        const isHorizontal =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const isRightward = gestureState.dx > 0;

        const shouldMove =
          isScreenFocused &&
          effectivelyEnabled &&
          !isBlocked &&
          isFromEdge &&
          isHorizontal &&
          isRightward;

        return shouldMove;
      },

      onPanResponderGrant: (evt, gestureState) => {
        setIsSwipeActive(true);
        swipeAnimatedValue.setValue(0);
      },

      onPanResponderMove: (evt, gestureState) => {
        if (
          gestureState.dx > 0 &&
          gestureState.dx <= swipeConfig.maxSwipeWidth
        ) {
          swipeAnimatedValue.setValue(gestureState.dx);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        const { dx, vx } = gestureState;

        const shouldComplete =
          dx > swipeConfig.swipeMinDistance ||
          (dx > 20 && vx > swipeConfig.swipeMinVelocity);

        completeSwipe(shouldComplete);
      },

      onPanResponderTerminate: () => {
        completeSwipe(false);
      },

      // Prevent other gesture recognizers from taking over
      onPanResponderTerminationRequest: () => false,

      // Handle simultaneous gestures
      onShouldBlockNativeResponder: () => true,
    });
  }, [
    isIOS,
    isScreenFocused,
    effectivelyEnabled,
    isBlocked,
    isSwipeActive,
    swipeConfig,
    swipeAnimatedValue,
    completeSwipe,
  ]);

  const panResponder = useRef(createPanResponder());

  useEffect(() => {
    if (isIOS) {
      panResponder.current = createPanResponder();
    }
  }, [createPanResponder, isIOS]);

  // Handle screen focus with navigation gesture disabling
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      resetSwipe();

      if (isIOS) {
        panResponder.current = createPanResponder();
      }

      return () => {
        setIsScreenFocused(false);
        resetSwipe();

        if (temporaryDisableTimeout.current) {
          clearTimeout(temporaryDisableTimeout.current);
          temporaryDisableTimeout.current = null;
          setIsTemporarilyDisabled(false);
        }
      };
    }, [isIOS, createPanResponder, resetSwipe])
  );

  useEffect(() => {
    return () => {
      swipeAnimatedValue.stopAnimation();
      resetSwipe();

      if (temporaryDisableTimeout.current) {
        clearTimeout(temporaryDisableTimeout.current);
        temporaryDisableTimeout.current = null;
      }
    };
  }, [swipeAnimatedValue, resetSwipe]);

  const SwipeIndicator = useCallback(
    ({ style = {} }) => {
      if (!isIOS || !effectivelyEnabled) return null;

      const opacity = swipeAnimatedValue.interpolate({
        inputRange: [0, 50, swipeConfig.maxSwipeWidth],
        outputRange: [0, 0.3, 0.5],
        extrapolate: "clamp",
      });

      return (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              width: 4,
              height: "100%",
              backgroundColor: "#007AFF",
              zIndex: 1000,
              opacity,
            },
            style,
          ]}
          pointerEvents="none"
        />
      );
    },
    [isIOS, effectivelyEnabled, swipeAnimatedValue, swipeConfig.maxSwipeWidth]
  );

  return {
    panHandlers:
      isIOS && panResponder.current ? panResponder.current.panHandlers : {},
    swipeAnimatedValue,
    resetSwipe,
    completeSwipe,
    temporarilyDisableSwipe,
    isSwipeActive,
    isEnabled: isIOS && effectivelyEnabled,
    isTemporarilyDisabled,
    SwipeIndicator,
    debug: {
      isIOS,
      isScreenFocused,
      isSwipeActive,
      isTemporarilyDisabled,
      effectivelyEnabled,
      config: swipeConfig,
    },
  };
};

export default useEdgeSwipe;
