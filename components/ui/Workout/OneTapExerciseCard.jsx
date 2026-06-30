import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

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

const OneTapExerciseCard = ({
  exercise,
  index,
  onViewGif,
  gender,
  selectedExercises,
  onToggleExercise,
  onAddSets,
  onEditSets,
}) => {
  const exerciseName = typeof exercise === "string" ? exercise : exercise.name;
  const exerciseData = exercise.exercise_data?.sets || [];
  const hasSets = exerciseData.length > 0;

  const [expanded, setExpanded] = useState(hasSets);
  const [expandAnimation] = useState(new Animated.Value(hasSets ? 1 : 0));
  const isExerciseSelected = selectedExercises?.[exerciseName] || false;

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

  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);

    Animated.timing(expandAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

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
          ? responsiveHeight(18 + exerciseData.length * 5 + 22)
          : responsiveHeight(12 + exerciseData.length * 4 + 18)
        : isTablet
        ? responsiveHeight(28)
        : responsiveHeight(22),
    ],
  });

  const getSetNumberColor = (index) => {
    const colors = ["#007BFF", "#007BFF", "#007BFF", "#007BFF", "#007BFF"];
    return colors[index % colors.length];
  };

  const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}.${seconds.toString().padStart(2, "0")}`;
  };

  const renderSetItem = ({ item: set, index: setIndex }) => {
    return (
      <View style={styles.newSetItem}>
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
                </View>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>{set.reps}</Text>
                </View>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>{set.calories}</Text>
                </View>
                {!isBodyWeightExercise && (
                  <View style={styles.setDataColumn}>
                    <Text style={[styles.setDataValue, { marginLeft: -15 }]}>
                      {set.weight}
                      <Text style={styles.setDataLabel}>kg</Text>
                    </Text>
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
                </View>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>{set.calories}</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

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
    const hasWeight = isMuscleGroupExercise && !isBodyWeightExercise;
    const headerFontSize = hasWeight ? 10 : 10;

    return (
      <View style={styles.setsHeaderContainer}>
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
      </View>
    );
  };

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
                  cachePolicy="none"
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
                  cachePolicy="none"
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
            <View style={styles.topRow}>
              <View style={styles.titleSection}>
                <Text style={styles.exerciseName}>{exerciseName}</Text>
                {muscleGroup ? (
                  <Text style={styles.muscleGroupText}>{muscleGroup}</Text>
                ) : null}
              </View>
              <View style={styles.rightControls}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={(e) => {
                    e.stopPropagation();
                    onToggleExercise(exerciseName);
                  }}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isExerciseSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isExerciseSelected && (
                      <Ionicons name="checkmark" size={18} color="#FFF" />
                    )}
                  </View>
                </TouchableOpacity>
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
            {expanded && (
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onAddSets(exercise);
                  }}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color="#007BFF"
                  />
                  <Text style={styles.actionButtonText}>Add Sets</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEditSets(exercise);
                  }}
                >
                  <Ionicons name="pencil-outline" size={18} color="#007BFF" />
                  <Text style={styles.actionButtonText}>Edit Sets</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {hasSets && !expanded && (
          <View style={styles.setsIndicator}>
            <Text style={styles.setsIndicatorText}>
              {exerciseData.length} {exerciseData.length === 1 ? "set" : "sets"}
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
                data={exerciseData}
                renderItem={renderSetItem}
                keyExtractor={(item, index) => `set-${index}`}
                horizontal={false}
                showsVerticalScrollIndicator={false}
                scrollEnabled={true}
                style={styles.setsList}
                contentContainerStyle={styles.setsContainer}
                initialNumToRender={50}
                maxToRenderPerBatch={50}
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
  gradientBackground: {
    flex: 1,
    borderRadius: responsiveWidth(3),
    opacity: 0.9,
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
    bottom: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  titleContainer: {
    flex: 1,
    flexDirection: "column",
    paddingTop: isTablet ? 30 : 25,
    paddingRight: isTablet ? responsiveWidth(2) : 0,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  titleSection: {
    flex: 1,
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkboxContainer: {
    padding: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#007BFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#007BFF",
  },
  exerciseName: {
    fontSize: responsiveFontSize(14),
    fontWeight: "bold",
    color: "#00000",
  },
  muscleGroupText: {
    fontSize: responsiveFontSize(11),
    color: "#656565",
    marginTop: 4,
  },
  expandButton: {
    padding: responsiveWidth(1),
  },
  setsIndicator: {
    position: "absolute",
    bottom: responsiveHeight(1),
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
    paddingBottom: responsiveWidth(3),
    paddingTop: responsiveHeight(1),
    zIndex: 2,
  },
  setsDisplayContainer: {
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
    backgroundColor: "rgba(255, 255, 255, 1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86bcf542",
    marginBottom: 0,
  },
  headerSetColumn: {
    width: responsiveWidth(18),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerDataContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: responsiveWidth(2),
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
  setRowContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  setNumberContainer: {
    width: responsiveWidth(18),
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
    paddingVertical: responsiveHeight(2),
    borderRadius: responsiveWidth(3),
    marginTop: responsiveHeight(1),
  },
  noSetsText: {
    color: "#666",
    fontSize: responsiveFontSize(14),
    fontStyle: "italic",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#007BFF",
    gap: 4,
  },
  actionButtonText: {
    fontSize: responsiveFontSize(11),
    fontWeight: "600",
    color: "#007BFF",
  },
});

export default OneTapExerciseCard;
