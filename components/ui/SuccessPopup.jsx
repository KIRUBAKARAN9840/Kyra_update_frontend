import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';

const ToastNotification = ({
    visible = false,
    message = "Success!",
    duration = 2000,
    onClose = () => { }, // This MUST set visible to false in parent component
    type = "success", // success, error, warning, info
    position = "top", // top, bottom
}) => {
    // Color themes based on type
    const themes = {
        success: {
            icon: "#4CAF50", // Green
            border: "#4CAF50",
            background: "#FFFFFF",
            text: "#333333"
        },
        error: {
            icon: "#F44336", // Red
            border: "#F44336",
            background: "#FFFFFF",
            text: "#333333"
        },
        warning: {
            icon: "#FF9800", // Orange
            border: "#FF9800",
            background: "#FFFFFF",
            text: "#333333"
        },
        info: {
            icon: "#2196F3", // Blue
            border: "#2196F3",
            background: "#FFFFFF",
            text: "#333333"
        }
    };

    const theme = themes[type] || themes.success;

    // Animation values
    const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const checkmarkStroke = useRef(new Animated.Value(0)).current;
    const circleScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset animations
            opacity.setValue(0);
            translateY.setValue(position === 'top' ? -100 : 100);
            checkmarkStroke.setValue(0);
            circleScale.setValue(0);

            // Start animations
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.back(1.5)),
                }),
                Animated.timing(circleScale, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                }),
                Animated.timing(checkmarkStroke, {
                    toValue: 1,
                    duration: 400,
                    delay: 200,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.cubic),
                }),
            ]).start();

            // Auto hide after duration
            if (duration > 0) {
                const timer = setTimeout(() => {
                    hideToast();
                }, duration);
                return () => clearTimeout(timer);
            }
        }
    }, [visible]);

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: position === 'top' ? -100 : 100,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Call onClose which should set visible to false in the parent component
            onClose();
        });
    };

    // Get different icon paths based on type
    const getIconPath = () => {
        switch (type) {
            case 'success':
                return "M14,26 L 22,34 L 38,16"; // Checkmark
            case 'error':
                return "M16,16 L 34,34 M 34,16 L 16,34"; // X
            case 'warning':
                return "M25,16 L 25,28 M 25,32 L 25,34"; // Exclamation
            case 'info':
                return "M25,16 L 25,28 M 25,32 L 25,34"; // Info dot
            default:
                return "M14,26 L 22,34 L 38,16"; // Default to checkmark
        }
    };

    const iconPath = getIconPath();
    const pathLength = type === 'success' ? 38 : type === 'error' ? 48 : 24;

    const animatedStrokeDashoffset = checkmarkStroke.interpolate({
        inputRange: [0, 1],
        outputRange: [pathLength, 0],
    });

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                styles[position],
                {
                    opacity,
                    transform: [{ translateY }],
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    borderLeftWidth: 4, // Modern toast often has a colored left border
                }
            ]}
        >
            <TouchableOpacity
                style={styles.touchable}
                activeOpacity={0.9}
                onPress={hideToast}
            >
                <View style={styles.contentContainer}>
                    <View style={styles.iconContainer}>
                        <Animated.View style={{
                            transform: [{ scale: circleScale }],
                        }}>
                            <Svg height="24" width="24" viewBox="0 0 50 50">
                                <Circle
                                    cx="25"
                                    cy="25"
                                    r="20"
                                    fill={theme.icon}
                                    opacity="0.8"
                                />
                                <Animated.View>
                                    <Svg height="24" width="24" viewBox="0 0 50 50">
                                        <Path
                                            d={iconPath}
                                            stroke="white"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            fill="none"
                                            strokeDasharray={pathLength}
                                            strokeDashoffset={animatedStrokeDashoffset}
                                        />
                                    </Svg>
                                </Animated.View>
                            </Svg>
                        </Animated.View>
                    </View>
                    <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
                </View>

                {/* Close button (X) */}
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        hideToast();
                    }}
                >
                    <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
};

const { width } = Dimensions.get('window');
const safeArea = Platform.OS === 'ios' ? 50 : 10;

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        alignSelf: 'center',
        width: width - 32, // Leave margins on the sides
        maxWidth: 600,     // Cap width for tablets/web
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 1000,
        borderWidth: 1,
        borderColor: '#E0E0E0',

    },
    top: {
        top: safeArea + 25,
    },
    bottom: {
        bottom: safeArea + 10,
    },
    touchable: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        height: 24,
        width: 24,
    },
    message: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    closeButtonText: {
        fontSize: 24,
        lineHeight: 24,
        color: '#757575',
        fontWeight: 'bold',
    }
});

export default ToastNotification;