import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");

const MuscleGroupCarousel = ({
  muscleGroups = [],
  containerWidth = 140,
  containerHeight = 130,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const isScrolling = useRef(false);



  const muscleGroupImages = {
    male: [
      {
        id: 1,
        muscle_group: "ABS",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/MALE/ABS_M_NEW.png",
      },
      {
        id: 3,
        muscle_group: "Leg",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/MALE/LEGS_M_NEW.png",
      },
      {
        id: 5,
        muscle_group: "Back",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/MALE/BACK_M_NEW.png",
      },
      {
        id: 7,
        muscle_group: "Chest",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/MALE/CHEST_M_NEW.png",
      },
      {
        id: 9,
        muscle_group: "Biceps",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/MALE/BICEPS_M_NEW.png",
      },
      {
        id: 11,
        muscle_group: "Cardio",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/MALE/CARDIO_M_NEW.png",
      },
      {
        id: 13,
        muscle_group: "Triceps",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/MALE/TRICEPS_M_NEW.png",
      },
      {
        id: 15,
        muscle_group: "Forearms",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/MALE/FOREARM_M_NEW.png",
      },
      {
        id: 17,
        muscle_group: "Shoulder",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/MALE/SHOULDERS_M_NEW.png",
      },
      {
        id: 19,
        muscle_group: "Core",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/MALE/CORE+MALE.png",
      },
      {
        id: 21,
        muscle_group: "Cycling",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/MALE/CYCLING_M.png",
      },
      {
        id: 23,
        muscle_group: "Treadmill",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/MALE/TREADMILL_M_NEW.png",
      },
    ],
    female: [
      {
        id: 2,
        muscle_group: "ABS",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/FEMALE/ABS_F.png",
      },
      {
        id: 4,
        muscle_group: "Leg",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/FEMALE/LEGS_F.png",
      },
      {
        id: 6,
        muscle_group: "Back",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/FEMALE/BACK_F.png",
      },
      {
        id: 8,
        muscle_group: "Chest",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/FEMALE/CHEST_F.png",
      },
      {
        id: 10,
        muscle_group: "Biceps",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/FEMALE/BICEPS_F.png",
      },
      {
        id: 12,
        muscle_group: "Cardio",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/FEMALE/CARDIO_F.png",
      },
      {
        id: 14,
        muscle_group: "Triceps",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/FEMALE/TRICEPS_F.png",
      },
      {
        id: 16,
        muscle_group: "Forearms",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/FEMALE/FOREARM_F.png",
      },
      {
        id: 18,
        muscle_group: "Shoulder",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/FEMALE/SHOULDERS_F.png",
      },
      {
        id: 20,
        muscle_group: "Core",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/FEMALE/CORE+FEMALE+(1).png",
      },
      {
        id: 22,
        muscle_group: "Cycling",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/FEMALE/CYCLING_F.png",
      },
      {
        id: 24,
        muscle_group: "Treadmill",
        url: "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/muscle_group/FEMALE/TREADMILL_F.png",
      },
    ],
  };

  // Function to get muscle group image URL
  const getMuscleGroupImageUrl = (muscleGroup, gender = "male") => {
    const genderImages = muscleGroupImages[gender] || muscleGroupImages.male;
    const found = genderImages.find((img) => img.muscle_group === muscleGroup);
    const url = found
      ? found.url
      : genderImages.find((img) => img.muscle_group === "Chest")?.url;

  

    return { uri: url };
  };

  // Create infinite loop data only if there are multiple items
  const createInfiniteData = () => {
    if (muscleGroups.length <= 1) return muscleGroups;

    // Add copies at the beginning and end for infinite effect
    const lastItem = muscleGroups[muscleGroups.length - 1];
    const firstItem = muscleGroups[0];
    return [lastItem, ...muscleGroups, firstItem];
  };

  const infiniteData = createInfiniteData();
  const hasInfiniteLoop = muscleGroups.length > 1;

  // Set initial scroll position to show the first real item (skip the duplicate at index 0)
  useEffect(() => {
    if (hasInfiniteLoop && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollTo({
          x: containerWidth,
          animated: false,
        });
      }, 100);
    }
  }, [muscleGroups, containerWidth]);

  const handleScroll = (event) => {
    if (isScrolling.current) return;

    const offsetX = event.nativeEvent.contentOffset.x;

    if (hasInfiniteLoop) {
      const index = Math.round(offsetX / containerWidth);

      // Calculate the real index (excluding duplicates)
      let realIndex;
      if (index === 0) {
        realIndex = muscleGroups.length - 1;
      } else if (index === infiniteData.length - 1) {
        realIndex = 0;
      } else {
        realIndex = index - 1;
      }

      setCurrentIndex(realIndex);
    } else {
      const index = Math.round(offsetX / containerWidth);
      setCurrentIndex(index);
    }
  };

  const handleMomentumScrollEnd = (event) => {
    if (!hasInfiniteLoop) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / containerWidth);

    // Reset position for infinite loop
    if (index === 0) {
      // At the duplicate of last item, jump to actual last item
      isScrolling.current = true;
      scrollViewRef.current.scrollTo({
        x: containerWidth * muscleGroups.length,
        animated: false,
      });
      setTimeout(() => {
        isScrolling.current = false;
      }, 50);
    } else if (index === infiniteData.length - 1) {
      // At the duplicate of first item, jump to actual first item
      isScrolling.current = true;
      scrollViewRef.current.scrollTo({
        x: containerWidth,
        animated: false,
      });
      setTimeout(() => {
        isScrolling.current = false;
      }, 50);
    }
  };

  if (!muscleGroups || muscleGroups.length === 0) {
    return (
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: containerWidth,
            height: containerHeight,
            borderRadius: 8,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "#ddd",
            marginTop: 10,
          }}
        >
          <LinearGradient
            colors={["#FFFFFF", "#FFFFFF", "#FFFFFF", "rgba(103,197,251,0.3)"]}
            style={{
              width: containerWidth,
              height: containerHeight,
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 12,
            }}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={getMuscleGroupImageUrl("Chest")}
                style={{
                  width: containerWidth - 20,
                  height: containerHeight - 50,
                }}
                contentFit="contain"
              />
            </View>
            <View style={{ paddingHorizontal: 8 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#333",
                  textAlign: "center",
                  fontWeight: "600",
                  maxWidth: containerWidth - 16,
                }}
                numberOfLines={1}
              >
                Workout
              </Text>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  }

  if (muscleGroups.length === 1) {
    return (
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: containerWidth,
            height: containerHeight,
            borderRadius: 8,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "#ddd",
            marginTop: 10,
          }}
        >
          <LinearGradient
            colors={["#FFFFFF", "#FFFFFF", "#FFFFFF", "rgba(103,197,251,0.3)"]}
            style={{
              width: containerWidth,
              height: containerHeight,
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 12,
            }}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 5,
              }}
            >
              <Image
                source={getMuscleGroupImageUrl(muscleGroups[0])}
                style={{
                  width: containerWidth - 20,
                  height: containerHeight - 40,
                }}
                contentFit="contain"
              />
            </View>
            <View style={{ paddingHorizontal: 8 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#333",
                  textAlign: "center",
                  fontWeight: "600",
                  maxWidth: containerWidth - 16,
                }}
                numberOfLines={1}
              >
                {muscleGroups[0]}
              </Text>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: containerWidth,
          height: containerHeight,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#ddd",
          marginTop: 10,
        }}
      >
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          contentContainerStyle={{
            width: containerWidth * infiniteData.length,
            height: containerHeight,
          }}
        >
          {infiniteData.map((muscleGroup, index) => (
            <View
              key={`${muscleGroup}-${index}`}
              style={{
                width: containerWidth,
                height: containerHeight,
              }}
            >
              <LinearGradient
                colors={[
                  "#FFFFFF",
                  "#FFFFFF",
                  "#FFFFFF",
                  "rgba(103,197,251,0.3)",
                ]}
                style={{
                  width: containerWidth,
                  height: containerHeight,
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderRadius: 8,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 5,
                  }}
                >
                  <Image
                    source={getMuscleGroupImageUrl(muscleGroup)}
                    style={{
                      width: containerWidth - 20,
                      height: containerHeight - 40,
                    }}
                    contentFit="contain"
                  />
                </View>
                <View style={{ paddingHorizontal: 8 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#333",
                      textAlign: "center",
                      fontWeight: "600",
                      maxWidth: containerWidth - 16,
                    }}
                    numberOfLines={1}
                  >
                    {muscleGroup}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          ))}
        </ScrollView>

        {/* Pagination dots - only show for original muscle groups */}
        {muscleGroups.length > 1 && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              position: "absolute",
              bottom: -10,
              width: "100%",
            }}
          >
            {muscleGroups.map((_, index) => (
              <View
                key={index}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor:
                    currentIndex === index ? "#006FAD" : "rgba(0,0,0,0.3)",
                  marginHorizontal: 1,
                }}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const TemplateList = ({
  template,
  setCurrentTemplate,
  openEditModal,
  handleAddWorkout,
  deleteTemplate,
  handleTemplateSelect,
}) => {
  const [dropdownOpenId, setDropdownOpenId] = useState(null);

  const muscleGroups = Object.keys(template.exercise_data).length
    ? Object.keys(template.exercise_data)
    : ["Workout"];

  const totalExercises = Object.values(template.exercise_data).reduce(
    (sum, group) => sum + group.exercises.length,
    0
  );

  const handleMenuPress = () => {
    setDropdownOpenId(dropdownOpenId === template.id ? null : template.id);
  };

  const handleDropdownClose = () => {
    setDropdownOpenId(null);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <View style={styles.routineHeader}>
            <View style={styles.titleSection}>
              <Text style={styles.routineTitle}>{template.name}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.muscleGroupText}>
                  {muscleGroups.join(", ")}
                </Text>
                <Text style={styles.exerciseCount}>
                  {totalExercises} Exercise{totalExercises !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>

            <MuscleGroupCarousel
              muscleGroups={muscleGroups}
              containerWidth={100}
              containerHeight={100}
            />

            <View style={styles.rightSection}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={handleMenuPress}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={handleTemplateSelect}
            style={styles.actionButton}
          >
            <LinearGradient
              colors={["#D8ECFF", "#D8ECFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBackground}
            >
              <View style={styles.buttonContentWrapper}>
                <Ionicons name="eye" size={18} color="#007BFF" />
                <Text style={[styles.buttonText]}> View Workout</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleAddWorkout}
            style={styles.actionButton}
          >
            <LinearGradient
              colors={["#D8ECFF", "#D8ECFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBackground}
            >
              <View style={styles.buttonContentWrapper}>
                <Ionicons name="add-circle" size={18} color="#007BFF" />
                <Text style={[styles.buttonText]}> Add Exercise</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Overlay to close dropdown when clicking outside */}
      {dropdownOpenId === template.id && (
        <>
          <TouchableWithoutFeedback onPress={handleDropdownClose}>
            <View style={styles.overlay} pointerEvents="auto" />
          </TouchableWithoutFeedback>
          <View style={styles.dropdownModal}>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                openEditModal(template);
                setTimeout(() => {
                  handleDropdownClose();
                }, 100);
              }}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color="#333"
                style={styles.modalOptionIcon}
              />
              <Text style={styles.modalOptionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                handleDropdownClose();
                deleteTemplate();
              }}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color="#f44336"
                style={styles.modalOptionIcon}
              />
              <Text style={[styles.modalOptionText, { color: "#f44336" }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    marginVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 7,
    elevation: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 6,
  },
  routineHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    position: "relative",
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
    marginTop: 7,
  },
  routineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  muscleGroupText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    lineHeight: 18,
  },
  exerciseCount: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
    paddingVertical: 3,
    paddingHorizontal: 10,
    backgroundColor: "#E9E9E9",
    borderRadius: 8,
    marginTop: 2,
  },
  rightSection: {
    alignItems: "center",
    position: "absolute",
    top: -10,
    right: 0,
  },
  menuButton: {
    marginBottom: 8,
    borderRadius: 12,
    alignSelf: "flex-end",
  },
  dropdownModal: {
    position: "absolute",
    right: 15,
    top: 30,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    zIndex: 1001,
    minWidth: 120,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalOptionIcon: {
    marginRight: 8,
  },
  modalOptionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 5,
    marginTop: 6,
  },
  actionButton: {
    height: 28,
    justifyContent: "center",
    marginHorizontal: 10,
    marginVertical: 5,
  },
  buttonContentWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
    paddingVertical: 4,
  },
  gradientBackground: {
    height: "100%",
    justifyContent: "center",
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#007BFF",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 999,
  },
});

export default TemplateList;
