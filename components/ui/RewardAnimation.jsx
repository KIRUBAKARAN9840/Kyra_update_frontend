import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * XpRewardAnimation - A reusable component for showing XP rewards with animation
 * 
 * @param {Object} props
 * @param {number} props.xpAmount - Amount of XP to display
 * @param {boolean} props.visible - Whether the animation should be visible
 * @param {Function} props.onAnimationComplete - Callback when animation completes
 * @param {Object} props.startPosition - Starting position {x, y} relative to screen
 * @param {Object} props.endPosition - End position {x, y} relative to screen (usually header XP position)
 * @param {string} props.color - Optional custom color for XP bubble (default: #FF5757)
 */
const XpRewardAnimation = ({
    xpAmount = 0,
    visible = false,
    onAnimationComplete = () => { },
    startPosition = { x: width / 2, y: height * 0.6 },
    endPosition = { x: width * 0.8, y: 20 },
    color = '#FF5757'
}) => {
    // Animation values
    const animProgress = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const scale = useRef(new Animated.Value(1)).current;

    // Calculate animation distance
    const xDistance = endPosition.x - startPosition.x;
    const yDistance = endPosition.y - startPosition.y;

    useEffect(() => {
        if (visible) {
            // Reset animation values when becoming visible
            animProgress.setValue(0);
            opacity.setValue(1);
            scale.setValue(1);

            // Start animation sequence
            Animated.sequence([
                // 1. Initial pop-in effect
                Animated.spring(scale, {
                    toValue: 1.5,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true,
                }),

                // 2. Brief pause for visibility
                Animated.delay(600),

                // 3. Travel to destination with simultaneous effects
                Animated.parallel([
                    // Move along path
                    Animated.timing(animProgress, {
                        toValue: 1,
                        duration: 1200,
                        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                        useNativeDriver: true,
                    }),

                    // Shrink as it moves
                    Animated.timing(scale, {
                        toValue: 0.6,
                        duration: 1200,
                        useNativeDriver: true,
                    }),

                    // Fade out near destination
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 1200,
                        delay: 800,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start(() => {
                // Callback when animation completes
                onAnimationComplete();
            });
        }
    }, [visible]);

    // Create path with slight arc for more natural motion
    const translateX = animProgress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, xDistance * 0.3, xDistance],
    });

    const translateY = animProgress.interpolate({
        inputRange: [0, 0.7, 1],
        // Move slightly upward before going to destination for arc effect
        outputRange: [0, yDistance * 0.6, yDistance],
    });

    if (!visible) return null;
    if (xpAmount == 0) return null
    return (
        <Animated.View
            style={[
                styles.container,
                {
                    left: startPosition.x,
                    top: startPosition.y,
                    transform: [
                        { translateX },
                        { translateY },
                        { scale }
                    ],
                    opacity,
                },
            ]}
        >
            <View style={[styles.xpBubble, { backgroundColor: color }]}>
                <Text style={styles.xpText}>+{xpAmount} XP</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
        // Using negative values to center the bubble on the coordinate
        marginLeft: -40,
        marginTop: -20,
    },
    xpBubble: {
        backgroundColor: '#FF5757',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 2,
        borderColor: '#4CAF50',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    xpText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
});

export default XpRewardAnimation;