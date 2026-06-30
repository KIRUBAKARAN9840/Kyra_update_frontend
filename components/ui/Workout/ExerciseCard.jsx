import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  FlatList,
  ImageBackground,
  AppState,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");
const isTablet = width >= 768;
const scaleFactor = isTablet ? Math.min(width / 768, 1.5) : 1;

const responsiveWidth = (percentage) => {
  const baseWidth = width * (percentage / 100);
  return isTablet ? baseWidth * 0.8 : baseWidth;
};

const responsiveHeight = (percentage) => {
  const baseHeight = height * (percentage / 100);
  return isTablet ? baseHeight * 0.7 : baseHeight;
};

const responsiveFontSize = (fontSize) => {
  const standardScreenHeight = 820;
  const standardFontScale = fontSize / standardScreenHeight;
  const baseSize = Math.round(height * standardFontScale);
  return isTablet ? Math.round(baseSize * scaleFactor) : baseSize;
};

const BACKGROUND_TIME_KEY = "app_background_timestamp";
const ACCUMULATED_TIME_KEY = "accumulated_background_time";

const ExerciseCard = ({
  exercise,
  index,
  isInGym,
  activeExercises,
  onStartExercise,
  onStopExercise,
  onHistoricalExercise,
  onViewGif,
  onDeleteSet,
  gender,
}) => {
  const exerciseName = typeof exercise === "string" ? exercise : exercise.name;
  const exerciseState = activeExercises[exerciseName] || {};
  const hasSets = exerciseState.sets && exerciseState.sets.length > 0;
  const setReps = exercise?.setsReps || null;

  const [expanded, setExpanded] = useState(hasSets);
  const [expandAnimation] = useState(new Animated.Value(hasSets ? 1 : 0));
  const initialRenderRef = useRef(true);

  const [timer, setTimer] = useState(0);

  const timerIntervalRef = useRef(null);

  const muscleGroup = exercise.muscleGroup || "";
  const gifPath =
    gender?.toLowerCase() === "male"
      ? exercise.gifPath
      : exercise.gifPathFemale || null;
  const isCardioExercise = exercise.isCardio || false;
  const isMuscleGroupExercise = exercise.isMuscleGroup || false;
  const isBodyWeightExercise = exercise.isBodyWeight || false;
  const imagePath =
    gender?.toLowerCase() === "male"
      ? exercise.imgPath
      : exercise.imgPathFemale || null;
  const isActive = exerciseState.isActive;
  const isAnyExerciseActive = Object.values(activeExercises).some(
    (ex) => ex.isActive,
  );

  const [appState, setAppState] = useState(AppState.currentState);
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimeRef = useRef(0);
  const isActiveRef = useRef(isActive);
  const [prevSetsLength, setPrevSetsLength] = useState(0);

  // Update isActiveRef whenever isActive changes
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }

    const currentSetsLength = exerciseState.sets?.length || 0;

    // Auto-expand when sets are added to an exercise that previously had no sets
    // This handles both play button (1 set added) and + button (multiple sets added)
    if (hasSets && !expanded && prevSetsLength === 0 && currentSetsLength > 0) {
      setExpanded(true);
      Animated.timing(expandAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }

    // Update the previous sets length
    setPrevSetsLength(currentSetsLength);
  }, [hasSets, exerciseState.sets?.length, expanded, prevSetsLength]);

  const handleAppStateChange = useCallback(
    async (nextAppState) => {
      const currentIsActive = isActiveRef.current;

      if (
        appStateRef.current === "active" &&
        nextAppState.match(/inactive|background/) &&
        currentIsActive
      ) {
        const now = Date.now();
        try {
          await AsyncStorage.setItem(BACKGROUND_TIME_KEY, now.toString());
        } catch (error) {
          console.error("Failed to save background timestamp:", error);
        }
      }
      // App coming back to foreground
      else if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        currentIsActive
      ) {
        try {
          // Get the timestamp when app went to background
          const backgroundTimestamp =
            await AsyncStorage.getItem(BACKGROUND_TIME_KEY);

          if (backgroundTimestamp !== null) {
            const backgroundTime = parseInt(backgroundTimestamp, 10);
            const now = Date.now();
            const timeInBackground = Math.floor((now - backgroundTime) / 1000); // Time difference in seconds

            // Update timer by adding the background time
            setTimer((prevTimer) => prevTimer + timeInBackground);

            // Store the background time for future reference if needed
            backgroundTimeRef.current = timeInBackground;
          }
        } catch (error) {
          console.error("Failed to calculate background time:", error);
        }
      }

      appStateRef.current = nextAppState;
      setAppState(nextAppState);
    },
    [], // Now stable - uses ref instead of dependency
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    if (isActive) {
      setTimer(0);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      timerIntervalRef.current = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isActive]);

  const getCardColorGradient = (index) => {
    const colorSets = [
      ["#1E293B", "#334155"],
      ["#0F172A", "#1E293B"],
      ["#374151", "#4B5563"],
      ["#18181B", "#27272A"],
    ];

    return colorSets[index % colorSets.length];
  };

  const colorGradient = getCardColorGradient(index);

  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);

    Animated.timing(expandAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Function to handle image click for GIF viewing
  const handleImageClick = (e) => {
    e.stopPropagation();
    if (gifPath) {
      onViewGif(exerciseName, gifPath);
    }
  };

  const maxHeight = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isTablet ? responsiveHeight(20) : responsiveHeight(16),
      hasSets
        ? isTablet
          ? responsiveHeight(18 + (exerciseState.sets?.length || 0) * 5 + 20)
          : responsiveHeight(12 + (exerciseState.sets?.length || 0) * 4 + 15)
        : isTablet
          ? responsiveHeight(28)
          : responsiveHeight(19),
    ],
  });

  const getSetNumberColor = (index) => {
    // const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57"];
    const colors = ["#007BFF", "#007BFF", "#007BFF", "#007BFF", "#007BFF"];
    return colors[index % colors.length];
  };

  const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}.${seconds.toString().padStart(2, "0")}`;
  };

  const renderSetItem = useCallback(
    ({ item: set, index: setIndex }) => (
      <View style={styles.newSetItem}>
        <TouchableOpacity
          style={styles.deleteSetButton}
          onPress={() => onDeleteSet(exerciseName, setIndex)}
        >
          <Ionicons name="trash" size={isTablet ? 20 : 16} color="#FF6B6B" />
        </TouchableOpacity>

        <View style={styles.setRowContent}>
          <View style={styles.setNumberContainer}>
            <View
              style={[
                styles.setNumberCircle,
                { backgroundColor: getSetNumberColor(setIndex) },
              ]}
            >
              <Text style={styles.setNumber}>{setIndex + 1}</Text>
            </View>
          </View>

          <View style={styles.setDataContainer}>
            {isCardioExercise ? (
              <>
                <View style={styles.setDataColumn}>
                  <Text style={[styles.setDataValue, { marginLeft: 7 }]}>
                    {formatDuration(set.duration)}
                    <Text style={styles.setDataLabel}>&nbsp;min</Text>
                  </Text>
                  {/* <Text style={styles.setDataLabel}>minutes</Text> */}
                </View>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>{set.calories}</Text>
                </View>
              </>
            ) : isMuscleGroupExercise ? (
              <>
                <View style={styles.setDataColumn}>
                  <Text style={[styles.setDataValue, { marginLeft: 7 }]}>
                    {formatDuration(set.duration)}
                    <Text style={styles.setDataLabel}>&nbsp;min</Text>
                  </Text>
                  {/* <Text style={styles.setDataLabel}>minutes</Text> */}
                </View>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>{set.reps}</Text>
                </View>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>
                    {set.calories}
                    {/* <Text style={styles.setDataLabel}>kcal</Text> */}
                  </Text>
                </View>
                {!isBodyWeightExercise && (
                  <View style={styles.setDataColumn}>
                    <Text style={[styles.setDataValue, { marginLeft: -15 }]}>
                      {set.weight}
                      <Text style={styles.setDataLabel}>kg</Text>
                    </Text>
                    {/* <Text style={styles.setDataLabel}>kg</Text> */}
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.setDataColumn}>
                  <Text style={[styles.setDataValue, { marginLeft: 7 }]}>
                    {formatDuration(set.duration)}
                    <Text style={styles.setDataLabel}>&nbsp;min</Text>
                  </Text>
                  {/* <Text style={styles.setDataLabel}>minutes</Text> */}
                </View>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>{set.calories}</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    ),
    [
      exerciseName,
      isCardioExercise,
      isMuscleGroupExercise,
      isBodyWeightExercise,
      onDeleteSet,
    ],
  );

  const renderSetsHeader = () => {
    if (!hasSets) return null;

    const getHeaderColumns = () => {
      if (isCardioExercise) {
        return [
          { icon: "time", name: "Time", unit: "minutes", color: "#007BFF" },
          { icon: "flame", name: "kcal", unit: "kcal", color: "#007BFF" },
        ];
      } else if (isMuscleGroupExercise) {
        const columns = [
          { icon: "time", name: "Time", unit: "minutes", color: "#007BFF" },
          { icon: "repeat", name: "Reps", unit: "", color: "#007BFF" },
          { icon: "flame", name: "kcal", unit: "kcal", color: "#007BFF" },
        ];
        if (!isBodyWeightExercise) {
          columns.push({
            icon: "weight-kilogram",
            name: "Weight",
            unit: "kg",
            color: "#007BFF",
            isFA: true,
          });
        }
        return columns;
      } else {
        return [
          { icon: "time", name: "Time", unit: "minutes", color: "#007BFF" },
          { icon: "flame", name: "kcal", unit: "kcal", color: "#007BFF" },
        ];
      }
    };

    const headerColumns = getHeaderColumns();

    // Check if weight column exists to determine font size
    const hasWeight = isMuscleGroupExercise && !isBodyWeightExercise;
    const headerFontSize = hasWeight ? 11 : 11;
    const unitFontSize = hasWeight ? 8 : 9;

    return (
      <View style={styles.setsHeaderContainer}>
        {/* First row - Icons and titles */}
        <View style={styles.setsHeaderRow}>
          <View style={styles.headerSetColumn}>
            <Ionicons
              name="fitness"
              size={isTablet ? 20 : 16}
              color="#007BFF"
            />
            <Text
              style={[
                styles.headerText,
                { fontSize: responsiveFontSize(headerFontSize) },
              ]}
            >
              Sets
            </Text>
          </View>

          <View style={styles.headerDataContainer}>
            {headerColumns.map((column, index) => (
              <View key={index} style={styles.headerIconContainer}>
                <View style={styles.headerIconAndTitle}>
                  {column.isFA ? (
                    <MaterialCommunityIcons
                      name={column.icon}
                      size={isTablet ? 18 : 14}
                      color={column.color}
                    />
                  ) : (
                    <Ionicons
                      name={column.icon}
                      size={isTablet ? 18 : 14}
                      color={column.color}
                    />
                  )}
                  <Text
                    style={[
                      styles.headerText,
                      { fontSize: responsiveFontSize(headerFontSize) },
                    ]}
                  >
                    {column.name}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Second row - Units only */}
        {/* <View style={styles.setsHeaderUnitsRow}>
          <View style={styles.headerSetColumn}></View>

          <View style={styles.headerDataContainer}>
            {headerColumns.map((column, index) => (
              <View key={index} style={styles.headerIconContainer}>
                {column.unit && (
                  <Text
                    style={[
                      styles.headerUnitText,
                      { fontSize: responsiveFontSize(unitFontSize) },
                    ]}
                  >
                    {column.unit}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View> */}
      </View>
    );
  };

  // Render the card content
  const renderCardContent = () => (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={toggleExpand}
        style={styles.cardTouchable}
      >
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.exerciseImageContainer}
            onPress={handleImageClick}
            activeOpacity={0.8}
          >
            {expanded ? (
              <LinearGradient
                colors={["#B5D3EF", "#FFFFFF"]}
                style={styles.imageGradientBackground}
              >
                <Image
                  source={imagePath}
                  style={styles.exerciseImage}
                  cachePolicy="memory"
                  priority="high"
                  contentFit="cover"
                  transition={200}
                />
                {gifPath && (
                  <View style={styles.gifIndicator}>
                    <Ionicons
                      name="play-circle"
                      size={isTablet ? 28 : 20}
                      color="#007BFF"
                    />
                  </View>
                )}
              </LinearGradient>
            ) : (
              <View style={styles.imageGradientBackground}>
                <Image
                  source={imagePath}
                  style={styles.exerciseImage}
                  cachePolicy="memory"
                  priority="low"
                  contentFit="cover"
                  transition={200}
                />
                {gifPath && (
                  <View style={styles.gifIndicator}>
                    <Ionicons
                      name="play-circle"
                      size={isTablet ? 28 : 20}
                      color="#007BFF"
                    />
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <View>
              <Text style={styles.exerciseName}>{exerciseName}</Text>
              {muscleGroup ? (
                <Text style={styles.muscleGroupText}>{muscleGroup}</Text>
              ) : null}
              {setReps ? (
                <Text style={styles.muscleGroupText}>{setReps}</Text>
              ) : null}
            </View>
            <View style={styles.rightContainer}>
              {isInGym ? (
                // Existing in-gym logic
                <View style={styles.actionButtonsRow}>
                  {isActive && (
                    <View style={styles.activeTimerDisplay}>
                      <Text style={styles.activeTimerText}>
                        {formatTime(timer)}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.actionIconButton,
                      isActive && styles.stopButton,
                      !isActive && isAnyExerciseActive && styles.disabledButton,
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (isActive) {
                        onStopExercise(exerciseName);
                      } else if (!isAnyExerciseActive) {
                        onStartExercise(exerciseName);
                      }
                    }}
                    disabled={!isActive && isAnyExerciseActive}
                  >
                    <Text style={{ color: "#FFFFFF" }}>
                      {isActive ? "Stop" : "Start"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.actionButtonsRow}>
                    {isActive && (
                      <View style={styles.activeTimerDisplay}>
                        <Text style={styles.activeTimerText}>
                          {formatTime(timer)}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.actionIconButton,
                        isActive && styles.stopButton,
                        !isActive &&
                          isAnyExerciseActive &&
                          styles.disabledButton,
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (isActive) {
                          onStopExercise(exerciseName);
                        } else if (!isAnyExerciseActive) {
                          onStartExercise(exerciseName);
                        }
                      }}
                      disabled={!isActive && isAnyExerciseActive}
                    >
                      <Text style={{ color: "#FFFFFF" }}>
                        {isActive ? "Stop" : "Start"}
                      </Text>
                      {/* <Ionicons
                      name={isActive ? "stop-circle" : "play-circle"}
                      size={28}
                      color={
                        isActive
                          ? "#FF3B30"
                          : !isActive && isAnyExerciseActive
                          ? "#999"
                          : "#183243"
                      }
                    /> */}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.addIconButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      onHistoricalExercise(exerciseName);
                    }}
                  >
                    <Ionicons
                      name="add-circle"
                      size={isTablet ? 36 : 28}
                      color="#007BFF"
                    />
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.expandButton}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleExpand();
                }}
              >
                <Ionicons
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={isTablet ? 32 : 24}
                  color="#007BFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {hasSets && !expanded && (
          <View style={styles.setsIndicator}>
            <Text style={styles.setsIndicatorText}>
              {exerciseState.sets.length}{" "}
              {exerciseState.sets.length === 1 ? "set" : "sets"}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          {hasSets ? (
            <View style={styles.setsDisplayContainer}>
              {renderSetsHeader()}
              <FlatList
                data={exerciseState.sets}
                renderItem={renderSetItem}
                keyExtractor={(item, index) => `set-${exerciseName}-${index}`}
                horizontal={false}
                showsVerticalScrollIndicator={false}
                scrollEnabled={true}
                style={styles.setsList}
                contentContainerStyle={styles.setsContainer}
                initialNumToRender={5}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={100}
              />
            </View>
          ) : (
            <View style={styles.noSetsContainer}>
              <Text style={styles.noSetsText}>No sets recorded</Text>
            </View>
          )}
        </View>
      )}
    </>
  );

  return (
    <Animated.View style={[styles.cardContainer, { height: maxHeight }]}>
      {expanded ? (
        <View style={styles.expandedBackground}>{renderCardContent()}</View>
      ) : (
        <LinearGradient
          colors={["#EDEFEE", "#C2E2FE"].reverse()}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {renderCardContent()}
        </LinearGradient>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: responsiveWidth(3),
    marginBottom: isTablet ? 20 : 15,
    marginHorizontal: isTablet ? 0 : undefined,
    width: isTablet ? "95%" : undefined,
    alignSelf: isTablet ? "center" : undefined,
    overflow: "hidden",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  backgroundImageStyle: {
    borderRadius: responsiveWidth(3),
    opacity: 0.7,
  },
  gradientBackground: {
    flex: 1,
    borderRadius: responsiveWidth(3),
    opacity: 0.9,
  },
  whiteBackground: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: responsiveWidth(3),
    borderWidth: 1,
    borderColor: "#DDD",
  },
  expandedBackground: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: responsiveWidth(3),
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.3)",
  },
  cardTouchable: {
    paddingHorizontal: isTablet ? responsiveWidth(4) : responsiveWidth(3),
    justifyContent: "center",
    paddingVertical: responsiveHeight(1.5),
    height: isTablet ? responsiveHeight(16.5) : responsiveHeight(13),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    position: "relative",
  },
  exerciseImageContainer: {
    width: isTablet ? 150 : 100,
    height: isTablet ? 165 : 110,
    borderRadius: responsiveWidth(2),
    overflow: "hidden",
    position: "relative",
    marginRight: responsiveWidth(3),
    marginTop: isTablet ? 30 : 25,
  },
  imageGradientBackground: {
    width: "100%",
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderColor: "#ddddddb9",
    borderWidth: 1,
    borderRadius: responsiveWidth(2),
  },
  exerciseImage: {
    width: "100%",
    height: "100%",
    borderRadius: responsiveWidth(2),
  },
  gifIndicator: {
    position: "absolute",
    left: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  titleContainer: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    paddingTop: isTablet ? 30 : 25,
    paddingRight: isTablet ? responsiveWidth(2) : 0,
  },
  exerciseName: {
    fontSize: responsiveFontSize(14),
    fontWeight: "bold",
    color: "#00000",
    marginBottom: 4,
  },
  muscleGroupText: {
    fontSize: responsiveFontSize(11),
    color: "#656565",
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: responsiveWidth(0.5),
    position: "relative",
  },
  activeTimerDisplay: {
    position: "absolute",
    top: isTablet ? -30 : -20,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  activeTimerText: {
    fontSize: responsiveFontSize(12),
    fontWeight: "bold",
    color: "#000",
  },
  actionIconButton: {
    padding: responsiveWidth(1),
    marginHorizontal: responsiveWidth(1),
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1,
    backgroundColor: "#007BFF",
    paddingHorizontal: isTablet ? 35 : 26,
    paddingVertical: isTablet ? 8 : 4,
    borderRadius: isTablet ? 6 : 4,
  },
  stopButton: {
    backgroundColor: "#FF3B30",
  },
  addIconButton: {
    padding: responsiveWidth(1),
    marginHorizontal: responsiveWidth(1),
  },
  addButton: {
    marginRight: responsiveWidth(1),
    padding: responsiveWidth(1),
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1,
  },
  expandButton: {
    padding: responsiveWidth(1),
  },
  setsIndicator: {
    position: "absolute",
    top: responsiveHeight(0.5),
    right: responsiveWidth(4),
    backgroundColor: "#007BFF",
    paddingVertical: responsiveHeight(0.3),
    paddingHorizontal: responsiveWidth(2),
    borderRadius: responsiveWidth(5),
    zIndex: 5,
  },
  setsIndicatorText: {
    color: "white",
    fontSize: responsiveFontSize(10),
    fontWeight: "bold",
  },
  expandedContent: {
    paddingHorizontal: responsiveWidth(0),
    paddingBottom: responsiveWidth(6),
    paddingTop: responsiveHeight(1),
    zIndex: 2,
  },
  setsDisplayContainer: {
    // backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: responsiveWidth(3),
    padding: responsiveWidth(3),
    marginTop: responsiveHeight(1),
  },
  setsHeaderContainer: {
    marginBottom: responsiveHeight(1),
  },
  setsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsiveWidth(3),
    paddingVertical: responsiveHeight(0.8),
    // paddingBottom: 0,
    backgroundColor: "rgba(255, 255, 255, 1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86bcf542",
    // borderTopRightRadius: 8,
    marginBottom: 0,
  },
  headerSetColumn: {
    width: responsiveWidth(13),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerDataContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: responsiveWidth(6),
  },
  headerIconContainer: {
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: responsiveWidth(1),
  },
  headerIconAndTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  headerText: {
    fontWeight: "600",
    color: "#333",
    marginLeft: 1.5,
    textAlign: "center",
  },
  // setsList: {
  //   maxHeight: responsiveHeight(25),
  // },
  setsContainer: {
    paddingVertical: responsiveHeight(0.5),
  },
  newSetItem: {
    position: "relative",
    paddingVertical: isTablet ? responsiveHeight(1.8) : responsiveHeight(1.2),
    paddingHorizontal: responsiveWidth(0.5),
    marginBottom: isTablet ? responsiveHeight(0.8) : responsiveHeight(0.5),
    backgroundColor: "rgba(255, 255, 255, 1)",
    borderRadius: responsiveWidth(2),
    borderWidth: 1,
    borderColor: "#86bcf542",
  },
  deleteSetButton: {
    position: "absolute",
    top: responsiveHeight(1.2),
    right: responsiveWidth(1.5),
    padding: responsiveWidth(0.5),
    zIndex: 10,
  },
  setRowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: responsiveWidth(6), // Space for delete button
  },
  setNumberContainer: {
    width: responsiveWidth(13),
    alignItems: "center",
  },
  setNumberCircle: {
    width: isTablet ? responsiveWidth(5) : responsiveWidth(4),
    height: isTablet ? responsiveWidth(5) : responsiveWidth(4),
    borderRadius: isTablet ? responsiveWidth(5) : responsiveWidth(4),
    justifyContent: "center",
    alignItems: "center",
  },
  setNumber: {
    color: "white",
    fontSize: responsiveFontSize(9),
    fontWeight: "bold",
  },
  setDataContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 5,
  },
  setDataColumn: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: responsiveWidth(1),
  },
  setDataValue: {
    fontSize: responsiveFontSize(12),
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  setDataLabel: {
    fontSize: responsiveFontSize(9),
    color: "#666",
    marginTop: 2,
    textAlign: "center",
  },
  noSetsContainer: {
    alignItems: "center",
    paddingVertical: responsiveHeight(1),

    // backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: responsiveWidth(3),
    marginTop: responsiveHeight(1),
  },
  noSetsText: {
    color: "#666",
    fontSize: responsiveFontSize(14),
    fontStyle: "italic",
  },
  disabledButton: {
    opacity: 0.5,
  },
  timerContainer: {
    position: "absolute",
    bottom: responsiveHeight(0.5),
    right: responsiveWidth(4),
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: responsiveHeight(0.4),
    paddingHorizontal: responsiveWidth(2.5),
    borderRadius: responsiveWidth(4),
    zIndex: 5,
  },
  timerContainerOutGym: {
    right: responsiveWidth(12),
  },
  timerText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: responsiveFontSize(12),
    marginLeft: responsiveWidth(1),
  },
  headerTextContainer: {
    flexDirection: "column",
    alignItems: "center",
    marginLeft: 4,
  },
  headerUnitText: {
    fontWeight: "400",
    color: "#666",
    textAlign: "center",
    marginLeft: 6,
    marginTop: -3,
    // marginTop: 1,
  },
  setsHeaderUnitsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsiveWidth(3),
    paddingVertical: responsiveHeight(0.3),
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
});

export default ExerciseCard;
