import { Ionicons, FontAwesome5, Entypo } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { toIndianISOString } from "../../utils/basicUtilFunctions";
import { safeParseJSON } from "../../utils/safeHelpers";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  Keyboard,
  AppState,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import YoutubeIframe from "react-native-youtube-iframe";
import {
  addClientWorkoutAPI,
  logWorkoutSetAPI,
  getInStatusAPI,
  getExercisesAPI,
  getEquipmentHistoryAPI,
} from "../../services/clientApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import CustomPicker from "../../components/ui/CustomPicker";
import ExerciseCard from "../../components/ui/Workout/ExerciseCard";
import OneTapExerciseCard from "../../components/ui/Workout/OneTapExerciseCard";
import { showToast } from "../../utils/Toaster";
import GrainConfettiAnimation from "../../components/ui/ConfettiAnimation";
import UnsavedChangesBackHandler from "../../components/WorkoutHardwareBackHandler";
import ExerciseScreenSkeleton from "../../components/ui/Workout/skeletonExercise";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  isPureFreemium,
  isFittbotPremium,
  isOnlyFree,
} from "../../config/access";
import { useUser } from "../../context/UserContext";

const { width, height } = Dimensions.get("window");
const isTablet = width >= 768;
const responsiveWidth = (percentage) => width * (percentage / 100);
const responsiveHeight = (percentage) => height * (percentage / 100);
const responsiveFontSize = (fontSize) => {
  const standardScreenHeight = 820;
  const standardFontScale = fontSize / standardScreenHeight;
  return Math.round(height * standardFontScale);
};

const ExerciseScreen = () => {
  const {
    muscleGroup,
    templateId,
    exercises,
    myExercises,
    isQR,
    qrExercises,
    templateExercises,
    myTemplateExercise,
    isTemplate,
    isMuscleGroup,
    isCardio,
    isDefaultWorkouts,
    level,
    isTrainerTemplate,
    home = false,
    machineName,
    isMachine,
  } = useLocalSearchParams();
  const parsedExercises = safeParseJSON(exercises, []);

  const myTemplateExercises = safeParseJSON(myExercises, []);
  const parsedQRExercises = safeParseJSON(qrExercises, []);
  const parsedTemplates = safeParseJSON(myTemplateExercise, []);
  const parsedtemplateMuscleGroups = safeParseJSON(templateExercises, []);
  const [isInGym, setIsInGym] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeExercises, setActiveExercises] = useState({});
  const [currentExercise, setCurrentExercise] = useState(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState(null); // Default YouTube video ID
  const [playVideo, setPlayVideo] = useState(false); // Control video playback
  const youtubePlayerRef = useRef(null); // YouTube player ref
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [inputModalVisible, setInputModalVisible] = useState(false);
  const [historicalInputVisible, setHistoricalInputVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentSets, setCurrentSets] = useState([
    { reps: "", weight: "", duration: "" },
  ]);
  const [currentReps, setCurrentReps] = useState("");
  const [isBackConfirmModalVisible, setIsBackConfirmModalVisible] =
    useState(false);
  const [currentWeight, setCurrentWeight] = useState("");
  const [currentDuration, setCurrentDuration] = useState("");
  const [userWeight, setUserWeight] = useState(70);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [scrollViewRef, setScrollViewRef] = useState(null);
  const [xpRewardVisible, setXpRewardVisible] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);

  const { plan, userType, registrationSteps } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [change, setChange] = useState(false);
  const tabScrollViewRef = useRef(null);
  const [MET, setMET] = useState(() => {
    if (parsedExercises && parsedExercises[muscleGroup]) {
      return parsedExercises[muscleGroup].isMuscleGroup ? 6 : 10;
    }
    return isMuscleGroup == "true" ? 6 : 10;
  });
  const [durationUnits, setDurationUnits] = useState({});
  const hasScrolledInitially = useRef(false);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return days[today.getDay()];
  });
  const [isDefaultWorkout, setIsDefaultWorkout] = useState(false);
  const [gender, setGender] = useState(null);
  const [machineExercises, setMachineExercises] = useState([]);
  const [filteredMachineExercises, setFilteredMachineExercises] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState([]);
  const [oneTapExercises, setOneTapExercises] = useState([]);
  const [oneTapLoading, setOneTapLoading] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);

  // Refs for timeout cleanup
  const xpTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const navigationTimeoutRef = useRef(null);

  const muscleGroups = [
    "Chest",
    "Shoulder",
    "Leg",
    "Back",
    "ABS",
    "Biceps",
    "Cardio",
    "Core",
    "Cycling",
    "Forearms",
    "Treadmill",
    "Triceps",
  ];

  // Helper function to check and handle premium/guest access
  // Returns true if access is granted, false if blocked
  const checkPremiumAccess = useCallback(() => {
    if (isPureFreemium(plan)) {
      if (Platform.OS === "ios") {
        setPremiumModalVisible(true);
      } else {
        router.push("/client/subscription");
      }
      return false;
    } else if (userType === "guest") {
      setGuestModalVisible(true);
      return false;
    }
    return true;
  }, [plan, userType]);

  const getGender = async () => {
    try {
      const gender = await AsyncStorage.getItem("gender");
      setGender(gender);
    } catch (err) {
      setGender("male");
    }
  };

  useFocusEffect(
    useCallback(() => {
      getGender();
    }, []),
  );

  // Pause YouTube video when app goes to background (Play Store compliance)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background") {
        setPlayVideo(false);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const fetchUserWeight = async () => {
      try {
        const weight = await AsyncStorage.getItem("user_weight");

        if (weight) {
          setUserWeight(parseFloat(weight) || 60);
        }
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Error Fetching User weight",
        });
      }
    };

    fetchUserWeight();
  }, []);

  useEffect(() => {
    const checkIfDefaultWorkout = () => {
      if (isDefaultWorkouts === "true") {
        setIsDefaultWorkout(true);
      }
    };

    checkIfDefaultWorkout();
  }, []);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (xpTimeoutRef.current) {
        clearTimeout(xpTimeoutRef.current);
        xpTimeoutRef.current = null;
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchMachineExercises = async () => {
      if (isMachine === "true" && machineName) {
        setLoading(true);
        try {
          const response = await getExercisesAPI(machineName);

          if (response?.status === 200) {
            const exercisesData = response?.data || [];
            setMachineExercises(exercisesData);
            setFilteredMachineExercises(exercisesData);
          } else {
            showToast({
              type: "error",
              title: "Error",
              desc: "Failed to fetch exercises",
            });
          }
        } catch (error) {
          showToast({
            type: "error",
            title: "Error",
            desc: "Something went wrong. Please try again later",
          });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMachineExercises();
  }, [isMachine, machineName]);

  const fetchOneTapData = async () => {
    if (isMachine === "true" && machineName) {
      setOneTapLoading(true);
      try {
        const client_id = await AsyncStorage.getItem("client_id");
        if (!client_id) {
          showToast({
            type: "error",
            title: "Error",
            desc: "Client ID not found",
          });
          setOneTapLoading(false);
          return;
        }
        const response = await getEquipmentHistoryAPI(machineName, client_id);
        if (response?.status === 200) {
          const exercisesData = response?.data || [];
          setOneTapExercises(exercisesData);
        } else {
          showToast({
            type: "error",
            title: "Error",
            desc: "Failed to fetch exercise history",
          });
        }
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
      } finally {
        setOneTapLoading(false);
      }
    }
  };

  const handleToggleExercise = (exerciseName) => {
    setSelectedExercises((prev) => ({
      ...prev,
      [exerciseName]: !prev[exerciseName],
    }));
  };

  const handleAddSets = (exercise) => {
    setIsEditMode(false);
    setCurrentExercise(exercise.name);
    setCurrentSets([{ reps: "", weight: "", duration: "" }]);
    setHistoricalInputVisible(true);
  };

  const handleEditSets = (exercise) => {
    setIsEditMode(true);
    setCurrentExercise(exercise.name);

    // Pre-populate currentSets with existing sets from exercise_data
    const existingSets = exercise.exercise_data?.sets || [];
    if (existingSets.length > 0) {
      const formattedSets = existingSets.map((set) => ({
        reps: set.reps?.toString() || "",
        weight: set.weight?.toString() || "",
        duration: set.duration?.toString() || "",
      }));
      setCurrentSets(formattedSets);
    } else {
      setCurrentSets([{ reps: "", weight: "", duration: "" }]);
    }

    setHistoricalInputVisible(true);
  };

  // Clear image cache periodically during usage and on unmount to prevent memory leaks
  useEffect(() => {
    // Clear cache every 5 minutes during active use
    const imageCacheCleanup = setInterval(() => {
      Image.clearMemoryCache();
    }, 300000); // 5 minutes

    return () => {
      clearInterval(imageCacheCleanup);
      Image.clearMemoryCache();
    };
  }, []);

  const calculateCalories = (met, duration, weight) => {
    return Math.round(met * weight * (duration / 3600) * 100) / 100;
  };

  const saveWorkout = async () => {
    // Check premium access before saving workout
    if (!checkPremiumAccess()) {
      return;
    }

    try {
      const clientId = await AsyncStorage.getItem("client_id");
      const gym_id = await AsyncStorage.getItem("gym_id");
      if (!clientId) {
        showToast({
          type: "error",
          title: "Save Failed",
          desc: "An error occurred while saving the workout.",
        });
        return;
      }
      let workoutData = {
        client_id: Number(clientId),
        date: toIndianISOString(selectedDate).split("T")[0],
        workout_details: [],
        live_status: isInGym,
        gym_id: gym_id ? Number(gym_id) : null,
      };

      if (isQR === "true" && myTemplateExercises) {
        const groupedExercises = {};

        Object.entries(activeExercises).forEach(
          ([exerciseName, exerciseData]) => {
            for (const [group, groupData] of Object.entries(
              myTemplateExercises,
            )) {
              if (groupData.exercises) {
                const foundExercise = groupData.exercises.find(
                  (ex) => ex.name === exerciseName,
                );
                if (foundExercise) {
                  if (!groupedExercises[group]) {
                    groupedExercises[group] = [];
                  }
                  groupedExercises[group].push({
                    name: exerciseName,
                    sets: exerciseData.sets || [],
                  });
                  break;
                }
              }
            }
          },
        );

        workoutData.workout_details = [groupedExercises];
      } else if (isTemplate === "true" && parsedTemplates) {
        const groupedExercises = {};

        Object.entries(activeExercises).forEach(
          ([exerciseName, exerciseData]) => {
            for (const [group, groupData] of Object.entries(parsedTemplates)) {
              if (groupData.exercises) {
                const foundExercise = groupData.exercises.find(
                  (ex) => ex.name === exerciseName,
                );
                if (foundExercise) {
                  if (!groupedExercises[group]) {
                    groupedExercises[group] = [];
                  }
                  groupedExercises[group].push({
                    name: exerciseName,
                    sets: exerciseData.sets || [],
                  });
                  break;
                }
              }
            }
          },
        );

        workoutData.workout_details = [groupedExercises];
      } else if (isDefaultWorkouts === "true" && parsedExercises) {
        const groupedExercises = {};

        Object.entries(activeExercises).forEach(
          ([exerciseName, exerciseData]) => {
            for (const [group, groupData] of Object.entries(parsedExercises)) {
              if (groupData.exercises) {
                const foundExercise = groupData.exercises.find(
                  (ex) => ex.name === exerciseName,
                );
                if (foundExercise) {
                  if (!groupedExercises[group]) {
                    groupedExercises[group] = [];
                  }
                  groupedExercises[group].push({
                    name: exerciseName,
                    sets: exerciseData.sets || [],
                  });
                  break;
                }
              }
            }
          },
        );

        workoutData.workout_details = [groupedExercises];
      } else if (isMachine === "true" && machineExercises) {
        const groupedExercises = {};

        Object.entries(activeExercises).forEach(
          ([exerciseName, exerciseData]) => {
            const foundExercise = machineExercises.find(
              (ex) => ex.name === exerciseName,
            );
            if (foundExercise) {
              const group = foundExercise.muscle_group;
              if (!groupedExercises[group]) {
                groupedExercises[group] = [];
              }
              groupedExercises[group].push({
                name: exerciseName,
                sets: exerciseData.sets || [],
              });
            }
          },
        );

        workoutData.workout_details = [groupedExercises];
      } else if (muscleGroup) {
        workoutData.workout_details = [
          {
            [muscleGroup]: Object.entries(activeExercises).map(
              ([exerciseName, exerciseData]) => ({
                name: exerciseName,
                sets: exerciseData.sets || [],
              }),
            ),
          },
        ];
      } else if (myTemplateExercises) {
        let groupedExercises = {};

        Object.entries(activeExercises).forEach(
          ([exerciseName, exerciseData]) => {
            Object.entries(myTemplateExercises).forEach(
              ([group, exercises]) => {
                if (
                  Array.isArray(exercises) &&
                  exercises.includes(exerciseName)
                ) {
                  if (!groupedExercises[group]) {
                    groupedExercises[group] = [];
                  }
                  groupedExercises[group].push({
                    name: exerciseName,
                    sets: exerciseData.sets || [],
                  });
                } else if (
                  exercises.exercises &&
                  exercises.exercises.includes(exerciseName)
                ) {
                  if (!groupedExercises[group]) {
                    groupedExercises[group] = [];
                  }
                  groupedExercises[group].push({
                    name: exerciseName,
                    sets: exerciseData.sets || [],
                  });
                }
              },
            );
          },
        );

        workoutData.workout_details = [groupedExercises];
      }

      const response = await addClientWorkoutAPI(workoutData);

      if (response?.status === 200) {
        // Calculate total calories burned
        let totalCaloriesBurned = 0;
        Object.values(activeExercises).forEach((exerciseData) => {
          if (exerciseData.sets) {
            exerciseData.sets.forEach((set) => {
              if (set.calories) {
                totalCaloriesBurned += set.calories;
              }
            });
          }
        });
        totalCaloriesBurned = Math.round(totalCaloriesBurned * 100) / 100;

        setActiveExercises({});

        const earnedXp = response?.reward_point || 0;
        const showFeedbackModal = response?.feedback || false;

        if (earnedXp) {
          setXpAmount(earnedXp);
          setXpRewardVisible(true);
        }
        if (!earnedXp) {
          showToast({
            type: "success",
            title: "Success",
            desc: "Reward is not available for Out of the Gym workout logs and for logs above 50Xp",
          });
          router.push({
            pathname: "/client/workout",
            params: {
              task: "exercise added",
              caloriesBurned: totalCaloriesBurned.toString(),
              showFeedback: showFeedbackModal ? "true" : "false",
            },
          });
          setIsBackConfirmModalVisible(false);
          setIsSaveModalVisible(false);
          setXpRewardVisible(false);
        } else {
          if (navigationTimeoutRef.current) {
            clearTimeout(navigationTimeoutRef.current);
          }
          navigationTimeoutRef.current = setTimeout(() => {
            router.push({
              pathname: "/client/workout",
              params: {
                task: "exercise added",
                caloriesBurned: totalCaloriesBurned.toString(),
                showFeedback: showFeedbackModal ? "true" : "false",
              },
            });
            setIsBackConfirmModalVisible(false);
            setIsSaveModalVisible(false);
            setXpRewardVisible(false);
            navigationTimeoutRef.current = null;
          }, 3000);
        }
      } else {
        showToast({
          type: "error",
          title: "Save Failed",
          desc: "Unable to save workout. Please try again.",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Save Failed",
        desc: "An error occurred while saving the workout.",
      });
    }
  };

  const saveOneTapWorkouts = async () => {
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      const gymId = await AsyncStorage.getItem("gym_id");

      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Client ID not found",
        });
        return;
      }

      // Check if any exercises are selected
      const hasSelectedExercises = Object.values(selectedExercises).some(
        (isSelected) => isSelected,
      );

      if (!hasSelectedExercises) {
        showToast({
          type: "error",
          title: "No Exercises Selected",
          desc: "Please select at least one exercise to save",
        });
        return;
      }

      const groupedExercises = {};

      oneTapExercises.forEach((exercise) => {
        const exerciseName = exercise.name;
        const isSelected = selectedExercises[exerciseName];

        if (isSelected && exercise.exercise_data?.sets) {
          const muscleGroup = exercise.muscle_group || "General";

          if (!groupedExercises[muscleGroup]) {
            groupedExercises[muscleGroup] = [];
          }

          // Get all sets for the selected exercise
          const allSets = exercise.exercise_data.sets || [];

          groupedExercises[muscleGroup].push({
            name: exerciseName,
            sets: allSets,
          });
        }
      });

      const workoutData = {
        client_id: Number(clientId),
        date: toIndianISOString(new Date()).split("T")[0],
        workout_details: [groupedExercises],
        live_status: isInGym,
        gym_id: gymId ? Number(gymId) : null,
      };

      const response = await addClientWorkoutAPI(workoutData);

      if (response?.status === 200) {
        let totalCaloriesBurned = 0;

        oneTapExercises.forEach((exercise) => {
          const exerciseName = exercise.name;
          const isSelected = selectedExercises[exerciseName];

          if (isSelected && exercise.exercise_data?.sets) {
            exercise.exercise_data.sets.forEach((set) => {
              if (set?.calories) {
                totalCaloriesBurned += set.calories;
              }
            });
          }
        });

        totalCaloriesBurned = Math.round(totalCaloriesBurned * 100) / 100;

        setSelectedExercises({});

        const earnedXp = response?.reward_point || 0;
        const showFeedbackModal = response?.feedback || false;

        if (earnedXp) {
          setXpAmount(earnedXp);
          setXpRewardVisible(true);
        }

        if (!earnedXp) {
          showToast({
            type: "success",
            title: "Success",
            desc: "Workout saved successfully!",
          });
          router.push({
            pathname: "/client/workout",
            params: {
              task: "exercise added",
              caloriesBurned: totalCaloriesBurned.toString(),
              showFeedback: showFeedbackModal ? "true" : "false",
            },
          });
          setIsSaveModalVisible(false);
        } else {
          if (xpTimeoutRef.current) {
            clearTimeout(xpTimeoutRef.current);
          }
          xpTimeoutRef.current = setTimeout(() => {
            router.push({
              pathname: "/client/workout",
              params: {
                task: "exercise added",
                caloriesBurned: totalCaloriesBurned.toString(),
                showFeedback: showFeedbackModal ? "true" : "false",
              },
            });
            setIsSaveModalVisible(false);
            setXpRewardVisible(false);
            xpTimeoutRef.current = null;
          }, 3000);
        }
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to save workout",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    }
  };

  const handleAnimationComplete = () => {
    setXpRewardVisible(false);
  };

  useEffect(() => {
    checkGymPresence();
  }, []);

  const checkGymPresence = async () => {
    const clientId = await AsyncStorage.getItem("client_id");
    try {
      const response = await getInStatusAPI(clientId);
      setIsInGym(
        response?.status === 200 ? response?.attendance_status : false,
      );
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Error checking Gym Presence",
      });
      setIsInGym(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleMuscleGroupSelection = (group) => {
    setSelectedMuscleGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  };

  const applyMuscleGroupFilter = () => {
    if (selectedMuscleGroups.length === 0) {
      setFilteredMachineExercises(machineExercises);
    } else {
      const filtered = machineExercises.filter((ex) =>
        selectedMuscleGroups.includes(ex.muscle_group),
      );
      setFilteredMachineExercises(filtered);
    }
    setFilterModalVisible(false);
  };

  const clearFilters = () => {
    setSelectedMuscleGroups([]);
    setFilteredMachineExercises(machineExercises);
    setFilterModalVisible(false);
  };

  const handleStartExercise = (exercise) => {
    // Check premium access before starting exercise
    if (!checkPremiumAccess()) {
      return;
    }

    setActiveExercises((prev) => ({
      ...prev,
      [exercise]: {
        ...prev[exercise],
        startTime: new Date(),
        isActive: true,
        sets: [...(prev[exercise]?.sets || [])],
      },
    }));
    showToast({
      type: "success",
      title: "Success",
      desc: "🎯 Workout Started! Let's crush it! 💪",
    });
  };

  const handleStopExercise = (exercise) => {
    const endTime = new Date();
    const exerciseState = activeExercises[exercise];
    const duration = Math.round((endTime - exerciseState.startTime) / 1000);
    setCurrentDuration(duration.toString());
    setCurrentExercise(exercise);

    let isCurrentExerciseCardio = false;
    let isCurrentExerciseBodyWeight = false;

    if (isMachine === "true" && filteredMachineExercises) {
      const foundExercise = filteredMachineExercises.find(
        (ex) => ex.name === exercise,
      );
      if (foundExercise) {
        isCurrentExerciseCardio = foundExercise.isCardio || false;
        isCurrentExerciseBodyWeight = foundExercise.isBodyWeight || false;
      }
    } else if (isQR === "true" && myTemplateExercises) {
      for (const [group, groupData] of Object.entries(myTemplateExercises)) {
        if (groupData.exercises) {
          const foundExercise = groupData.exercises.find(
            (ex) => ex.name === exercise,
          );
          if (foundExercise) {
            isCurrentExerciseCardio = groupData.isCardio || false;
            isCurrentExerciseBodyWeight = groupData.isBodyWeight || false;
            break;
          }
        }
      }
    } else if (isTemplate === "true" && parsedTemplates) {
      for (const [group, groupData] of Object.entries(parsedTemplates)) {
        if (groupData.exercises) {
          const foundExercise = groupData.exercises.find(
            (ex) => ex.name === exercise,
          );
          if (foundExercise) {
            isCurrentExerciseCardio = groupData.isCardio || false;
            isCurrentExerciseBodyWeight = groupData.isBodyWeight || false;
            break;
          }
        }
      }
    } else if (isDefaultWorkouts === "true" && parsedExercises) {
      for (const [group, groupData] of Object.entries(parsedExercises)) {
        if (groupData.exercises) {
          const foundExercise = groupData.exercises.find(
            (ex) => ex.name === exercise,
          );
          if (foundExercise) {
            isCurrentExerciseCardio = groupData.isCardio || false;
            isCurrentExerciseBodyWeight = groupData.isBodyWeight || false;
            break;
          }
        }
      }
    } else if (parsedExercises && muscleGroup && parsedExercises[muscleGroup]) {
      isCurrentExerciseCardio =
        parsedExercises[muscleGroup].isCardio || isCardio === "true";
      isCurrentExerciseBodyWeight = parsedExercises[muscleGroup].isBodyWeight;
    }

    if (isCurrentExerciseCardio) {
      setMET(8);

      const caloriesBurned = calculateCalories(8, duration, userWeight);

      const newSet = {
        setNumber: (exerciseState?.sets?.length || 0) + 1,
        startTime: exerciseState.startTime,
        endTime: endTime,
        reps: 0,
        weight: 0,
        duration: duration,
        MET: 8,
        calories: caloriesBurned,
      };

      setActiveExercises((prev) => ({
        ...prev,
        [exercise]: {
          ...prev[exercise],
          isActive: false,
          sets: [...(prev[exercise]?.sets || []), newSet],
        },
      }));
      showToast({
        type: "success",
        title: "Success",
        desc: `🎯 Set completed! Burned ${caloriesBurned} calories! 💪`,
      });
    } else {
      setInputModalVisible(true);
    }
  };

  const validateInputs = (inputs) => {
    const errors = {};

    let isCurrentExerciseMuscleGroup = false;
    let isCurrentExerciseBodyWeight = false;

    if (isMachine === "true" && filteredMachineExercises) {
      const foundExercise = filteredMachineExercises.find(
        (ex) => ex.name === currentExercise,
      );
      if (foundExercise) {
        isCurrentExerciseMuscleGroup = foundExercise.isMuscleGroup || false;
        isCurrentExerciseBodyWeight = foundExercise.isBodyWeight || false;
      }
    } else if (isQR === "true" && myTemplateExercises) {
      for (const [group, groupData] of Object.entries(myTemplateExercises)) {
        if (groupData.exercises) {
          const foundExercise = groupData.exercises.find(
            (ex) => ex.name === currentExercise,
          );
          if (foundExercise) {
            isCurrentExerciseMuscleGroup = groupData.isMuscleGroup || false;
            isCurrentExerciseBodyWeight = groupData.isBodyWeight || false;
            break;
          }
        }
      }
    } else if (isTemplate === "true" && parsedTemplates) {
      for (const [group, groupData] of Object.entries(parsedTemplates)) {
        if (groupData.exercises) {
          const foundExercise = groupData.exercises.find(
            (ex) => ex.name === currentExercise,
          );
          if (foundExercise) {
            isCurrentExerciseMuscleGroup = groupData.isMuscleGroup || false;
            isCurrentExerciseBodyWeight = groupData.isBodyWeight || false;
            break;
          }
        }
      }
    } else if (isDefaultWorkouts === "true" && parsedExercises) {
      for (const [group, groupData] of Object.entries(parsedExercises)) {
        if (groupData.exercises) {
          const foundExercise = groupData.exercises.find(
            (ex) => ex.name === currentExercise,
          );
          if (foundExercise) {
            isCurrentExerciseMuscleGroup = groupData.isMuscleGroup || false;
            isCurrentExerciseBodyWeight = groupData.isBodyWeight || false;
            break;
          }
        }
      }
    } else if (parsedExercises && muscleGroup && parsedExercises[muscleGroup]) {
      isCurrentExerciseMuscleGroup =
        parsedExercises[muscleGroup].isMuscleGroup || isMuscleGroup === "true";
      isCurrentExerciseBodyWeight =
        parsedExercises[muscleGroup].isBodyWeight || false;
    }

    if (isCurrentExerciseMuscleGroup) {
      if (!inputs.reps || isNaN(inputs.reps) || inputs.reps <= 0) {
        errors.reps = "Please enter a valid number of reps";
      }
      if (!isCurrentExerciseBodyWeight) {
        if (!inputs.weight || isNaN(inputs.weight) || inputs.weight <= 0) {
          errors.weight = "Please enter a valid weight";
        }
      }
    }

    if (
      inputs.duration !== undefined &&
      (!inputs.duration || isNaN(inputs.duration) || inputs.duration <= 0)
    ) {
      errors.duration = "Please enter a valid duration";
    }

    return errors;
  };

  const handleSetComplete = () => {
    let isCurrentExerciseCardio = false;
    let isCurrentExerciseBodyWeight = false;

    if (isMachine === "true" && filteredMachineExercises) {
      const foundExercise = filteredMachineExercises.find(
        (ex) => ex.name === currentExercise,
      );
      if (foundExercise) {
        isCurrentExerciseCardio = foundExercise.isCardio || false;
        isCurrentExerciseBodyWeight = foundExercise.isBodyWeight || false;
      }
    } else if (isQR === "true" && myTemplateExercises) {
      for (const [group, groupData] of Object.entries(myTemplateExercises)) {
        if (groupData.exercises) {
          const foundExercise = groupData.exercises.find(
            (ex) => ex.name === currentExercise,
          );
          if (foundExercise) {
            isCurrentExerciseCardio = groupData.isCardio || false;
            isCurrentExerciseBodyWeight = groupData.isBodyWeight || false;
            break;
          }
        }
      }
    } else if (isTemplate === "true" && parsedTemplates) {
      for (const [group, groupData] of Object.entries(parsedTemplates)) {
        if (groupData.exercises) {
          const foundExercise = groupData.exercises.find(
            (ex) => ex.name === currentExercise,
          );
          if (foundExercise) {
            isCurrentExerciseCardio = groupData.isCardio || false;
            isCurrentExerciseBodyWeight = groupData.isBodyWeight || false;
            break;
          }
        }
      }
    } else if (isDefaultWorkouts === "true" && parsedExercises) {
      for (const [group, groupData] of Object.entries(parsedExercises)) {
        if (groupData.exercises) {
          const foundExercise = groupData.exercises.find(
            (ex) => ex.name === currentExercise,
          );
          if (foundExercise) {
            isCurrentExerciseCardio = groupData.isCardio || false;
            isCurrentExerciseBodyWeight = groupData.isBodyWeight || false;
            break;
          }
        }
      }
    } else if (parsedExercises && muscleGroup && parsedExercises[muscleGroup]) {
      isCurrentExerciseCardio =
        parsedExercises[muscleGroup].isCardio || isCardio === "true";
      isCurrentExerciseBodyWeight =
        parsedExercises[muscleGroup].isBodyWeight || false;
    }

    const errors = isCurrentExerciseCardio
      ? {}
      : isCurrentExerciseBodyWeight
        ? validateInputs({ reps: currentReps })
        : validateInputs({ reps: currentReps, weight: currentWeight });
    if (Object.keys(errors).length > 0) {
      alert(
        Object.values(errors).join("\n") ||
          "Something went wrong. Please try again later",
      );

      return;
    }

    const endTime = new Date();
    const exerciseState = activeExercises[currentExercise];

    const selectedMET = MET || (isCurrentExerciseCardio ? 8 : 6);
    const duration = parseInt(currentDuration);
    const caloriesBurned = calculateCalories(selectedMET, duration, userWeight);

    const newSet = {
      setNumber: (exerciseState?.sets?.length || 0) + 1,
      startTime: exerciseState.startTime,
      endTime: endTime,
      reps: parseInt(currentReps) || 0,
      weight: parseFloat(currentWeight) || 0,
      duration: duration,
      MET: selectedMET,
      calories: caloriesBurned,
    };

    setActiveExercises((prev) => ({
      ...prev,
      [currentExercise]: {
        ...prev[currentExercise],
        isActive: false,
        sets: [...(prev[currentExercise]?.sets || []), newSet],
      },
    }));

    setInputModalVisible(false);
    resetInputs();
    showToast({
      type: "success",
      title: "Success",
      desc: `🎯 Set completed! Burned ${caloriesBurned} calories! 💪`,
    });
  };

  const deleteHistoricalSet = (setIndex) => {
    setCurrentSets((prev) => prev.filter((_, index) => index !== setIndex));
    const newUnits = {};
    Object.keys(durationUnits).forEach((key) => {
      const keyIndex = parseInt(key);
      if (keyIndex < setIndex) {
        newUnits[key] = durationUnits[key];
      } else if (keyIndex > setIndex) {
        newUnits[keyIndex - 1] = durationUnits[key];
      }
    });
    setDurationUnits(newUnits);
  };

  const handleHistoricalExercise = (exercise) => {
    // Check premium access before opening historical exercise
    if (!checkPremiumAccess()) {
      return;
    }

    setCurrentExercise(exercise);
    setSelectedDate(new Date());
    setCurrentSets([{ reps: "", weight: "", duration: "" }]);
    setDurationUnits({}); // Reset duration units
    setShowDatePicker(false);
    setHistoricalInputVisible(true);
  };

  const addHistoricalSet = () => {
    // Check premium access before adding set
    if (!checkPremiumAccess()) {
      return;
    }

    setCurrentSets((prev) => [...prev, { reps: "", weight: "", duration: "" }]);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      if (scrollViewRef) {
        scrollViewRef.scrollToEnd({ animated: true });
      }
      scrollTimeoutRef.current = null;
    }, 100);
  };

  const updateHistoricalSet = (index, field, value) => {
    const updatedSets = [...currentSets];
    updatedSets[index] = { ...updatedSets[index], [field]: value };
    setCurrentSets(updatedSets);
  };

  const handleHistoricalSave = () => {
    let isCurrentExerciseCardio = false;
    let isCurrentExerciseBodyWeight = false;

    if (isMachine === "true" && filteredMachineExercises) {
      const foundExercise = filteredMachineExercises.find(
        (ex) => ex.name === currentExercise,
      );
      if (foundExercise) {
        isCurrentExerciseCardio = foundExercise.isCardio || false;
        isCurrentExerciseBodyWeight = foundExercise.isBodyWeight || false;
      }
    } else if (isQR === "true" && myTemplateExercises) {
      for (const [group, groupData] of Object.entries(myTemplateExercises)) {
        if (groupData.exercises) {
          const foundExercise = groupData.exercises.find(
            (ex) => ex.name === currentExercise,
          );
          if (foundExercise) {
            isCurrentExerciseCardio = groupData.isCardio || false;
            isCurrentExerciseBodyWeight = groupData.isBodyWeight || false;
            break;
          }
        }
      }
    } else if (isTemplate === "true" && parsedTemplates) {
      for (const [group, groupData] of Object.entries(parsedTemplates)) {
        if (groupData.exercises) {
          const foundExercise = groupData.exercises.find(
            (ex) => ex.name === currentExercise,
          );
          if (foundExercise) {
            isCurrentExerciseCardio = groupData.isCardio || false;
            isCurrentExerciseBodyWeight = groupData.isBodyWeight || false;
            break;
          }
        }
      }
    } else if (isDefaultWorkouts === "true" && parsedExercises) {
      for (const [group, groupData] of Object.entries(parsedExercises)) {
        if (groupData.exercises) {
          const foundExercise = groupData.exercises.find(
            (ex) => ex.name === currentExercise,
          );
          if (foundExercise) {
            isCurrentExerciseCardio = groupData.isCardio || false;
            isCurrentExerciseBodyWeight = groupData.isBodyWeight || false;
            break;
          }
        }
      }
    } else if (parsedExercises && muscleGroup && parsedExercises[muscleGroup]) {
      isCurrentExerciseCardio =
        parsedExercises[muscleGroup].isCardio || isCardio === "true";
      isCurrentExerciseBodyWeight =
        parsedExercises[muscleGroup].isBodyWeight || false;
    }

    let hasErrors = false;
    const errors = currentSets.map((set) => {
      if (isCurrentExerciseCardio) {
        return validateInputs({
          duration: set.duration,
        });
      } else if (isCurrentExerciseBodyWeight) {
        return validateInputs({
          reps: set.reps,
          duration: set.duration,
        });
      }
      return validateInputs({
        reps: set.reps,
        weight: set.weight,
        duration: set.duration,
      });
    });

    errors.forEach((error, index) => {
      if (Object.keys(error).length > 0) {
        hasErrors = true;
        alert(
          `Set ${index + 1} has the following errors:\n${Object.values(
            error,
          ).join("\n")}`,
        );
      }
    });

    if (hasErrors) return;

    const formattedSets = currentSets.map((set, index) => {
      // Convert duration to seconds if unit is minutes
      let durationInSeconds = parseInt(set.duration) || 0;
      const unit = durationUnits[index] || "seconds";
      if (unit === "minutes") {
        durationInSeconds = durationInSeconds * 60;
      }

      const selectedMET = parseInt(MET);
      const caloriesBurned = calculateCalories(
        selectedMET,
        durationInSeconds,
        userWeight,
      );

      return {
        setNumber: index + 1,
        startTime: selectedDate,
        endTime: new Date(selectedDate.getTime() + durationInSeconds * 1000),
        reps: parseInt(set.reps) || 0,
        weight: parseFloat(set.weight) || 0,
        duration: durationInSeconds, // Always store in seconds
        MET: selectedMET,
        calories: caloriesBurned,
      };
    });

    setActiveExercises((prev) => ({
      ...prev,
      [currentExercise]: {
        sets: [...(prev[currentExercise]?.sets || []), ...formattedSets],
      },
    }));

    setHistoricalInputVisible(false);
    resetInputs();
  };

  const resetInputs = () => {
    setCurrentReps("");
    setCurrentWeight("");
    setCurrentDuration("");
    setCurrentSets([{ reps: "", weight: "", duration: "" }]);
    setDurationUnits({}); // Reset duration units
  };

  const handleOneTapSave = () => {
    // Find the exercise details from oneTapExercises
    const exercise = oneTapExercises.find((ex) => ex.name === currentExercise);
    if (!exercise) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Exercise not found",
      });
      return;
    }

    const isCurrentExerciseCardio = exercise.isCardio || false;
    const isCurrentExerciseBodyWeight = exercise.isBodyWeight || false;

    let hasErrors = false;
    const errors = currentSets.map((set) => {
      if (isCurrentExerciseCardio) {
        return validateInputs({
          duration: set.duration,
        });
      } else if (isCurrentExerciseBodyWeight) {
        return validateInputs({
          reps: set.reps,
          duration: set.duration,
        });
      }
      return validateInputs({
        reps: set.reps,
        weight: set.weight,
        duration: set.duration,
      });
    });

    errors.forEach((error, index) => {
      if (Object.keys(error).length > 0) {
        hasErrors = true;
        alert(
          `Set ${index + 1} has the following errors:\n${Object.values(
            error,
          ).join("\n")}`,
        );
      }
    });

    if (hasErrors) return;

    const formattedSets = currentSets.map((set, index) => {
      // Convert duration to seconds if unit is minutes
      let durationInSeconds = parseInt(set.duration) || 0;
      const unit = durationUnits[index] || "seconds";
      if (unit === "minutes") {
        durationInSeconds = durationInSeconds * 60;
      }

      const selectedMET = parseInt(MET);
      const caloriesBurned = calculateCalories(
        selectedMET,
        durationInSeconds,
        userWeight,
      );

      return {
        setNumber: index + 1,
        startTime: new Date(),
        endTime: new Date(Date.now() + durationInSeconds * 1000),
        reps: parseInt(set.reps) || 0,
        weight: parseFloat(set.weight) || 0,
        duration: durationInSeconds,
        MET: selectedMET,
        calories: caloriesBurned,
      };
    });

    // Update oneTapExercises with new/edited sets
    setOneTapExercises((prev) => {
      return prev.map((ex) => {
        if (ex.name === currentExercise) {
          const existingSets = ex.exercise_data?.sets || [];
          return {
            ...ex,
            exercise_data: {
              ...ex.exercise_data,
              sets: isEditMode
                ? formattedSets
                : [...existingSets, ...formattedSets], // Append in add mode, replace in edit mode
            },
          };
        }
        return ex;
      });
    });

    setHistoricalInputVisible(false);
    resetInputs();
    setIsEditMode(false);

    showToast({
      type: "success",
      title: "Success",
      desc: isEditMode
        ? "Sets updated successfully"
        : "Sets added successfully",
    });
  };

  const deleteSet = (exerciseName, setIndex) => {
    setActiveExercises((prev) => ({
      ...prev,
      [exerciseName]: {
        ...prev[exerciseName],
        sets: prev[exerciseName].sets.filter((_, index) => index !== setIndex),
      },
    }));
  };

  const prepareExercises = () => {
    if (isMachine === "true" && filteredMachineExercises) {
      return filteredMachineExercises.map((exercise) => ({
        name: exercise.name,
        muscleGroup: exercise.muscle_group,
        gifPath: exercise.gifPath || null,
        gifPathFemale: exercise.gifPathFemale || null,
        imgPath: exercise.imgPath || null,
        imgPathFemale: exercise.imgPathFemale || null,
        isCardio: exercise.isCardio || false,
        isMuscleGroup: exercise.isMuscleGroup || false,
        isBodyWeight: exercise.isBodyWeight || false,
      }));
    }

    if (isQR === "true" && myTemplateExercises) {
      const allExercises = [];

      Object.entries(myTemplateExercises).forEach(([group, groupData]) => {
        if (groupData.exercises) {
          const filteredExercises = isDefaultWorkout
            ? groupData.exercises.filter(
                (exercise) => exercise.day === selectedDay,
              )
            : groupData.exercises;
          filteredExercises.forEach((exercise) => {
            allExercises.push({
              name: exercise.name,
              muscleGroup: group,
              gifPath: exercise.gifPath || null,
              gifPathFemale: exercise.gifPathFemale || null,
              imgPath: exercise.imgPath || null,
              imgPathFemale: exercise.imgPathFemale || null,
              isCardio: groupData.isCardio || false,
              isMuscleGroup: groupData.isMuscleGroup || false,
              isBodyWeight: groupData.isBodyWeight || false,
            });
          });
        }
      });

      return allExercises;
    }

    if (isTemplate === "true" && parsedTemplates) {
      const allExercises = [];
      Object.entries(parsedTemplates).forEach(([group, groupData]) => {
        if (groupData.exercises) {
          const filteredExercises = isDefaultWorkout
            ? groupData.exercises.filter(
                (exercise) => exercise.day === selectedDay,
              )
            : groupData.exercises;
          filteredExercises.forEach((exercise) => {
            allExercises.push({
              name: exercise.name,
              muscleGroup: group,
              gifPath: exercise.gifPath || null,
              gifPathFemale: exercise.gifPathFemale || null,
              imgPath: exercise.imgPath || null, // Add imgPath here
              imgPathFemale: exercise.imgPathFemale || null,

              isCardio: groupData.isCardio || false,
              isMuscleGroup: groupData.isMuscleGroup || false,
              isBodyWeight: groupData.isBodyWeight || false,
            });
          });
        }
      });

      return allExercises;
    }

    if (isDefaultWorkouts === "true" && parsedExercises) {
      const allExercises = [];

      Object.entries(parsedExercises).forEach(([group, groupData]) => {
        if (groupData.exercises) {
          const filteredExercises = isDefaultWorkout
            ? groupData.exercises.filter(
                (exercise) => exercise.day === selectedDay,
              )
            : groupData.exercises;
          filteredExercises.forEach((exercise) => {
            allExercises.push({
              name: exercise.name,
              muscleGroup: group,
              gifPath: exercise.gifPath || null,
              gifPathFemale: exercise.gifPathFemale || null,
              imgPath: exercise.imgPath || null,
              imgPathFemale: exercise.imgPathFemale || null,
              setsReps: exercise?.setsReps || null,
              isCardio: groupData.isCardio || false,
              isMuscleGroup: groupData.isMuscleGroup || false,
              isBodyWeight: groupData.isBodyWeight || false,
            });
          });
        }
      });

      return allExercises;
    }

    if (
      parsedExercises &&
      muscleGroup &&
      parsedExercises[muscleGroup] &&
      parsedExercises[muscleGroup].exercises
    ) {
      const filteredExercises = isDefaultWorkout
        ? parsedExercises[muscleGroup].exercises.filter(
            (exercise) => exercise.day === selectedDay,
          )
        : parsedExercises[muscleGroup].exercises;
      return filteredExercises.map((exercise) => ({
        name: exercise.name,
        muscleGroup: muscleGroup,
        gifPath: exercise.gifPath || null,
        gifPathFemale: exercise.gifPathFemale || null,

        imgPath: exercise.imgPath || null, // Add imgPath here
        imgPathFemale: exercise.imgPathFemale || null,

        isCardio: parsedExercises[muscleGroup].isCardio || false,
        isMuscleGroup: parsedExercises[muscleGroup].isMuscleGroup || false,
        isBodyWeight: parsedExercises[muscleGroup].isBodyWeight || false,
      }));
    }

    return parsedExercises;
  };

  const renderDayTabs = () => {
    if (!isDefaultWorkout) return null;

    const { width } = Dimensions.get("window");

    const days = [
      { name: "Monday", value: "monday" },
      { name: "Tuesday", value: "tuesday" },
      { name: "Wednesday", value: "wednesday" },
      { name: "Thursday", value: "thursday" },
      { name: "Friday", value: "friday" },
      { name: "Saturday", value: "saturday" },
      { name: "Sunday", value: "sunday" },
    ];

    const scrollToTab = (tabName) => {
      const index = days.findIndex((day) => day.value === tabName);
      if (index !== -1 && tabScrollViewRef.current) {
        const approximateTabWidth = 100;
        const scrollToX = Math.max(
          0,
          index * approximateTabWidth - width / 2 + approximateTabWidth / 2,
        );
        tabScrollViewRef.current.scrollTo({ x: scrollToX, animated: true });
      }
    };

    const handleTabPress = (tabValue) => {
      // Check premium access before switching tabs
      if (!checkPremiumAccess()) {
        return;
      }
      setSelectedDay(tabValue);
      scrollToTab(tabValue);
    };

    return (
      <ScrollView
        ref={tabScrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayTabsContainer}
        contentContainerStyle={styles.dayTabsContent}
        onLayout={() => {
          if (
            !hasScrolledInitially.current &&
            isDefaultWorkout &&
            tabScrollViewRef.current
          ) {
            const days = [
              { name: "Monday", value: "monday" },
              { name: "Tuesday", value: "tuesday" },
              { name: "Wednesday", value: "wednesday" },
              { name: "Thursday", value: "thursday" },
              { name: "Friday", value: "friday" },
              { name: "Saturday", value: "saturday" },
              { name: "Sunday", value: "sunday" },
            ];

            const index = days.findIndex((day) => day.value === selectedDay);
            if (index !== -1) {
              const { width } = Dimensions.get("window");
              const approximateTabWidth = 100;
              const scrollToX = Math.max(
                0,
                index * approximateTabWidth -
                  width / 2 +
                  approximateTabWidth / 2,
              );

              tabScrollViewRef.current.scrollTo({
                x: scrollToX,
                animated: true,
              });
              hasScrolledInitially.current = true;
            }
          }
        }}
      >
        {days.map((day) => (
          <TouchableOpacity
            key={day.value}
            style={[
              styles.dayTab,
              selectedDay === day.value && styles.selectedDayTab,
            ]}
            onPress={() => handleTabPress(day.value)}
          >
            <Text
              style={[
                styles.dayTabText,
                selectedDay === day.value && styles.selectedDayTabText,
              ]}
            >
              {day.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const getHeaderTitle = () => {
    if (isMachine === "true") {
      return "Machine Workouts";
    } else if (isTrainerTemplate === "true") {
      return "Trainer Workout";
    } else if (templateId) {
      return isQR === "true" ? "QR Workout" : "Template Workout";
    } else if (isDefaultWorkouts == "true") {
      return `${level.toUpperCase()}`;
    } else {
      return `${muscleGroup} Exercises`;
    }
  };

  const getBackNavigation = () => {
    if (isTrainerTemplate === "true") {
      return "/client/gymTemplate";
    } else if (isDefaultWorkouts == "true") {
      return "/client/workout";
    } else if (isTemplate == "true") {
      return "/client/(workout)/personalTemplate";
    } else if (home == "true") {
      return "/client/homeWorkoutPage";
    } else if (isMachine == "true") {
      return "/client/(workout)/machine";
    } else {
      return "/client/fittbotWorkoutPage";
    }
  };

  const hasUnsavedSets = () => {
    return Object.values(activeExercises).some(
      (exercise) => exercise.sets && exercise.sets.length > 0,
    );
  };

  const handleBackNavigation = () => {
    if (hasUnsavedSets()) {
      setIsBackConfirmModalVisible(true);
    } else {
      router.push(getBackNavigation());
    }
  };

  const handleConfirmBackNavigation = () => {
    setActiveExercises({});
    setIsBackConfirmModalVisible(false);
    router.push(getBackNavigation());
  };

  useEffect(() => {
    if (isDefaultWorkout && tabScrollViewRef.current) {
      const days = [
        { name: "Monday", value: "monday" },
        { name: "Tuesday", value: "tuesday" },
        { name: "Wednesday", value: "wednesday" },
        { name: "Thursday", value: "thursday" },
        { name: "Friday", value: "friday" },
        { name: "Saturday", value: "saturday" },
        { name: "Sunday", value: "sunday" },
      ];

      const index = days.findIndex((day) => day.value === selectedDay);
      if (index !== -1) {
        const { width } = Dimensions.get("window");
        const approximateTabWidth = 100;
        const scrollToX = Math.max(
          0,
          index * approximateTabWidth - width / 2 + approximateTabWidth / 2,
        );

        // Use requestAnimationFrame for better timing
        requestAnimationFrame(() => {
          setTimeout(() => {
            tabScrollViewRef.current?.scrollTo({
              x: scrollToX,
              animated: true,
            });
          }, 200); // Increased delay
        });
      }
    }
  }, [selectedDay, isDefaultWorkout, tabScrollViewRef]);

  if (loading) {
    return <ExerciseScreenSkeleton priority="high" />;
  }

  const exercisesToDisplay = prepareExercises();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <UnsavedChangesBackHandler
        hasUnsavedChanges={hasUnsavedSets()}
        enabled={true}
        onShowConfirmModal={() => setIsBackConfirmModalVisible(true)}
        routePath={getBackNavigation()}
        useBackInsteadOfPush={true}
      />

      {toast.visible && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBackNavigation} // Changed from direct router.push
        >
          <Ionicons
            name="arrow-back"
            size={responsiveFontSize(20)}
            color="#000"
          />
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        </TouchableOpacity>
        {isMachine === "true" ? (
          <TouchableOpacity
            style={styles.filterIconButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons
              name="filter"
              size={24}
              color={selectedMuscleGroups.length > 0 ? "#007BFF" : "#333"}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.gymStatus}>
            {!home && (
              <View
                style={[
                  styles.statusDot,
                  isInGym ? styles.inGym : styles.outGym,
                ]}
              />
            )}
            {home ? (
              ""
            ) : (
              <Text style={styles.statusText}>
                {isInGym ? "In Gym" : "Out of Gym"}
              </Text>
            )}
          </View>
        )}
      </View>

      {isMachine === "true" && (
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            paddingVertical: 16,
            paddingBottom: 0,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{ flex: 1, marginRight: 8 }}
            onPress={() => setActiveTab("all")}
          >
            <LinearGradient
              colors={
                activeTab === "all"
                  ? ["#007BFF", "#007BFF"]
                  : ["transparent", "transparent"]
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: activeTab === "all" ? "#007BFF" : "#007BFF",
              }}
            >
              <Ionicons
                name="list"
                size={20}
                color={activeTab === "all" ? "#FFF" : "#666"}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: activeTab === "all" ? "#FFF" : "#666",
                }}
              >
                All Workouts
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, marginLeft: 8 }}
            onPress={() => {
              if (!checkPremiumAccess()) return;
              setActiveTab("onetap");
              if (isMachine === "true" && oneTapExercises.length === 0) {
                fetchOneTapData();
              }
            }}
          >
              <LinearGradient
                colors={
                  activeTab === "onetap"
                    ? ["#007BFF", "#007BFF"]
                    : ["transparent", "transparent"]
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: activeTab === "onetap" ? "#007BFF" : "#007BFF",
                }}
              >
                <Ionicons
                  name="flash"
                  size={20}
                  color={activeTab === "onetap" ? "#FFF" : "#666"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: activeTab === "onetap" ? "#FFF" : "#666",
                  }}
                >
                  One Tap Log
                </Text>
              </LinearGradient>
            </TouchableOpacity>
        </View>
      )}

      <View style={{ marginTop: 15 }}>{renderDayTabs()}</View>

      {isMachine === "true" && activeTab === "onetap" ? (
        oneTapLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading exercises...</Text>
          </View>
        ) : oneTapExercises && oneTapExercises.length > 0 ? (
          <>
            <FlatList
              data={oneTapExercises}
              keyExtractor={(item, index) =>
                item.id?.toString() || index.toString()
              }
              renderItem={({ item, index }) => (
                <OneTapExerciseCard
                  exercise={{
                    name: item.name,
                    gifPath: item.gifPath,
                    imgPath: item.imgPath,
                    gifPathFemale: item.gifPathFemale,
                    imgPathFemale: item.imgPathFemale,
                    isCardio: item.isCardio,
                    isBodyWeight: item.isBodyWeight,
                    isMuscleGroup: item.isMuscleGroup,
                    muscleGroup: item.muscle_group,
                    exercise_data: item.exercise_data || {},
                  }}
                  index={index}
                  onViewGif={(exerciseName, gifPath) => {
                    setCurrentExercise(exerciseName);
                    setYoutubeVideoId(gifPath); // Set YouTube video ID directly
                    setPlayVideo(true);
                    setInfoModalVisible(true);
                  }}
                  gender={gender}
                  selectedExercises={selectedExercises}
                  onToggleExercise={handleToggleExercise}
                  onAddSets={handleAddSets}
                  onEditSets={handleEditSets}
                />
              )}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity
              style={styles.saveWorkoutButton}
              onPress={() => {
                const hasSelectedExercises = Object.values(
                  selectedExercises,
                ).some((isSelected) => isSelected);

                if (hasSelectedExercises) {
                  setIsSaveModalVisible(true);
                } else {
                  showToast({
                    type: "error",
                    title: "No Exercises Selected",
                    desc: "Please select at least one exercise to save.",
                  });
                }
              }}
            >
              <Text style={styles.saveWorkoutButtonText}>SAVE WORKOUT</Text>
              <Ionicons
                name="save-outline"
                size={20}
                color="#fff"
                style={styles.saveButtonIcon}
              />
            </TouchableOpacity>
            {isDefaultWorkouts === "true" && (
              <View style={styles.disclaimerContainer}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color="#888"
                />
                <Text style={styles.disclaimerText}>
                  This Workout Plan is for General Fitness guidance only.
                  Consult a healthcare professional for medical advice,
                  diagnosis, or treatment.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <FontAwesome5
              name="dumbbell"
              size={responsiveFontSize(50)}
              color="#CCCCCC"
            />
            <Text style={styles.emptyTitle}>No Exercises Available</Text>
            <Text style={styles.emptySubtitle}>
              Your Previously Logged Exercises from Machineries Will Appear
              Here.
            </Text>
          </View>
        )
      ) : exercisesToDisplay && exercisesToDisplay.length > 0 ? (
        <>
          <FlatList
            data={exercisesToDisplay}
            renderItem={({ item, index }) => (
              <ExerciseCard
                exercise={item}
                index={index}
                isInGym={isInGym}
                activeExercises={activeExercises}
                onStartExercise={handleStartExercise}
                onStopExercise={handleStopExercise}
                onHistoricalExercise={handleHistoricalExercise}
                onViewGif={(exerciseName, gifPath) => {
                  // Check premium access before viewing video

                  setCurrentExercise(exerciseName);
                  setYoutubeVideoId(gifPath); // Set YouTube video ID directly
                  setPlayVideo(true);
                  setInfoModalVisible(true);
                }}
                onDeleteSet={deleteSet}
                gender={gender}
              />
            )}
            keyExtractor={(item, index) => {
              const name = typeof item === "string" ? item : item.name;
              return `exercise-item-${name || index}-${index}`;
            }}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity
            style={styles.saveWorkoutButton}
            onPress={() => {
              const hasSets = Object.values(activeExercises).some(
                (exercise) => exercise.sets && exercise.sets.length > 0,
              );

              if (hasSets) {
                setIsSaveModalVisible(true);
              } else {
                showToast({
                  type: "error",
                  title: "No Workout Data",
                  desc: "Please log at least one set before saving.",
                });
              }
            }}
          >
            <Text style={styles.saveWorkoutButtonText}>SAVE WORKOUT</Text>
            <Ionicons
              name="save-outline"
              size={20}
              color="#fff"
              style={styles.saveButtonIcon}
            />
          </TouchableOpacity>
          {isDefaultWorkouts === "true" && (
            <View style={styles.disclaimerContainer}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color="#888"
              />
              <Text style={styles.disclaimerText}>
                This Workout Plan is for General Fitness guidance only. Consult
                a healthcare professional for medical advice, diagnosis, or
                treatment.
              </Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <FontAwesome5
            name="dumbbell"
            size={responsiveFontSize(50)}
            color="#CCCCCC"
          />
          <Text style={styles.emptyTitle}>
            {isDefaultWorkouts == "true"
              ? "Rest day"
              : "No Exercises Available"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isDefaultWorkouts == "true"
              ? "Come back tomorrow for new exercises"
              : " Check back soon for new exercises"}
          </Text>
        </View>
      )}

      <Modal visible={infoModalVisible} transparent animationType="fade">
        <View style={exerciseVisualModalStyles.exrMdlBackdropOverlay}>
          <LinearGradient
            colors={["#B5D3EF", "#FFFFFF"]}
            style={exerciseVisualModalStyles.exrMdlMainContainerWrapper}
          >
            <View style={exerciseVisualModalStyles.exrMdlHeaderRegion}>
              <TouchableOpacity
                style={exerciseVisualModalStyles.exrMdlDismissButtonArea}
                onPress={() => {
                  setInfoModalVisible(false);
                  setPlayVideo(false);
                  setYoutubeVideoId(null);
                }}
              >
                <Ionicons
                  name="close"
                  size={responsiveFontSize(24)}
                  color="#000000"
                />
              </TouchableOpacity>
            </View>

            <View style={exerciseVisualModalStyles.exrMdlContentSection}>
              {youtubeVideoId ? (
                <View
                  style={exerciseVisualModalStyles.exrMdlAnimationEnclosure}
                >
                  <YoutubeIframe
                    key={youtubeVideoId}
                    ref={youtubePlayerRef}
                    videoId={youtubeVideoId}
                    height={isTablet ? 180 : 165}
                    width="100%"
                    play={playVideo}
                    forceAndroidAutoplay={true}
                    mute={true}
                    onChangeState={(event) => {
                      if (event === "ended") {
                        setPlayVideo(false);
                      }
                    }}
                    webViewStyle={{
                      width: "100%",
                      height: "100%",
                    }}
                    webViewProps={{
                      androidLayerType: "hardware",
                    }}
                    viewContainerStyle={{
                      width: "100%",
                      height: isTablet ? 180 : 165,
                      borderRadius: isTablet ? 16 : 12,
                      overflow: "hidden",
                      backgroundColor: "#000",
                    }}
                    initialPlayerParams={{
                      controls: true,
                      modestbranding: true,
                      preventFullScreen: false,
                    }}
                  />
                </View>
              ) : (
                <View
                  style={exerciseVisualModalStyles.exrMdlPlaceholderEnclosure}
                >
                  <FontAwesome5
                    name="dumbbell"
                    size={responsiveFontSize(20)}
                    color="#A0A0A0"
                  />
                  <Text
                    style={
                      exerciseVisualModalStyles.exrMdlPlaceholderNotification
                    }
                  >
                    Animation Coming Soon!
                  </Text>
                </View>
              )}

              <Text style={exerciseVisualModalStyles.exrMdlTitleElement}>
                {currentExercise}
              </Text>

              {youtubeVideoId && (
                <Text style={exerciseVisualModalStyles.exrMdlDisclosureText}>
                  Video content follows{" "}
                  <Text
                    style={exerciseVisualModalStyles.exrMdlDisclosureLink}
                    onPress={() => {
                      if (Linking) {
                        Linking.openURL(
                          "https://www.youtube.com/static?template=terms",
                        );
                      }
                    }}
                  >
                    YouTube's Terms of Service
                  </Text>{" "}
                  .
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* Input Modal - for entering set details */}
      <Modal visible={inputModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContentSave}>
                <Text style={styles.modalTitle2}>Enter Set Details</Text>
                <Text style={styles.exerciseSubtitle}>{currentExercise}</Text>

                {(() => {
                  let isMuscleGroupExercise = false;
                  let isBodyWeightExercise = false;

                  if (isMachine === "true" && filteredMachineExercises) {
                    const foundExercise = filteredMachineExercises.find(
                      (ex) => ex.name === currentExercise,
                    );
                    if (foundExercise) {
                      isMuscleGroupExercise =
                        foundExercise.isMuscleGroup || false;
                      isBodyWeightExercise =
                        foundExercise.isBodyWeight || false;
                    }
                  } else if (
                    isQR === "true" &&
                    myTemplateExercises &&
                    currentExercise
                  ) {
                    for (const [group, groupData] of Object.entries(
                      myTemplateExercises,
                    )) {
                      if (groupData.exercises) {
                        const foundExercise = groupData.exercises.find(
                          (ex) => ex.name === currentExercise,
                        );
                        if (foundExercise) {
                          isMuscleGroupExercise =
                            groupData.isMuscleGroup || false;
                          isBodyWeightExercise =
                            groupData.isBodyWeight || false;
                          break;
                        }
                      }
                    }
                  }
                  if (
                    isTemplate === "true" &&
                    parsedTemplates &&
                    currentExercise
                  ) {
                    for (const [group, groupData] of Object.entries(
                      parsedTemplates,
                    )) {
                      if (groupData.exercises) {
                        const foundExercise = groupData.exercises.find(
                          (ex) => ex.name === currentExercise,
                        );
                        if (foundExercise) {
                          isMuscleGroupExercise =
                            groupData.isMuscleGroup || false;
                          isBodyWeightExercise =
                            groupData.isBodyWeight || false;
                          break;
                        }
                      }
                    }
                  }
                  if (
                    isDefaultWorkouts === "true" &&
                    parsedExercises &&
                    currentExercise
                  ) {
                    for (const [group, groupData] of Object.entries(
                      parsedExercises,
                    )) {
                      if (groupData.exercises) {
                        const foundExercise = groupData.exercises.find(
                          (ex) => ex.name === currentExercise,
                        );
                        if (foundExercise) {
                          isMuscleGroupExercise =
                            groupData.isMuscleGroup || false;
                          isBodyWeightExercise =
                            groupData.isBodyWeight || false;
                          break;
                        }
                      }
                    }
                  } else if (
                    parsedExercises &&
                    muscleGroup &&
                    parsedExercises[muscleGroup]
                  ) {
                    isMuscleGroupExercise =
                      parsedExercises[muscleGroup].isMuscleGroup ||
                      isMuscleGroup === "true";
                    isBodyWeightExercise =
                      parsedExercises[muscleGroup].isBodyWeight || false;
                  }

                  return isMuscleGroupExercise ? (
                    <View style={styles.inputFieldsContainer}>
                      <View style={styles.inputField}>
                        <Ionicons
                          name="repeat"
                          size={20}
                          color="#007BFF"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Number of Reps"
                          keyboardType="phone-pad"
                          value={currentReps}
                          onChangeText={setCurrentReps}
                          placeholderTextColor="#999"
                        />
                      </View>

                      {!isBodyWeightExercise && (
                        <View style={styles.inputField}>
                          <FontAwesome5
                            name="weight"
                            size={18}
                            color="#007BFF"
                            style={styles.inputIcon}
                          />
                          <TextInput
                            style={styles.input}
                            placeholder="Weight (kg)"
                            keyboardType="phone-pad"
                            value={currentWeight}
                            onChangeText={setCurrentWeight}
                            placeholderTextColor="#999"
                          />
                        </View>
                      )}
                    </View>
                  ) : null;
                })()}

                <View>
                  <Text style={styles.intensityLabel}>Workout Intensity</Text>
                  <View style={styles.pickerContainer}>
                    <CustomPicker
                      placeholder="Select Intensity"
                      onValueChange={(value) => setMET(value)}
                      value={MET}
                      items={
                        (() => {
                          let isMuscleGroupExercise = false;
                          let isBodyWeightExercise = false;

                          if (
                            isMachine === "true" &&
                            filteredMachineExercises
                          ) {
                            const foundExercise = filteredMachineExercises.find(
                              (ex) => ex.name === currentExercise,
                            );
                            if (foundExercise) {
                              isMuscleGroupExercise =
                                foundExercise.isMuscleGroup || false;
                              isBodyWeightExercise =
                                foundExercise.isBodyWeight || false;
                            }
                          } else if (
                            isQR === "true" &&
                            myTemplateExercises &&
                            currentExercise
                          ) {
                            for (const [group, groupData] of Object.entries(
                              myTemplateExercises,
                            )) {
                              if (groupData.exercises) {
                                const foundExercise = groupData.exercises.find(
                                  (ex) => ex.name === currentExercise,
                                );
                                if (foundExercise) {
                                  isMuscleGroupExercise =
                                    groupData.isMuscleGroup || false;
                                  isBodyWeightExercise =
                                    groupData.isBodyWeight || false;
                                  break;
                                }
                              }
                            }
                          }
                          if (
                            isTemplate === "true" &&
                            parsedTemplates &&
                            currentExercise
                          ) {
                            for (const [group, groupData] of Object.entries(
                              parsedTemplates,
                            )) {
                              if (groupData.exercises) {
                                const foundExercise = groupData.exercises.find(
                                  (ex) => ex.name === currentExercise,
                                );
                                if (foundExercise) {
                                  isMuscleGroupExercise =
                                    groupData.isMuscleGroup || false;
                                  isBodyWeightExercise =
                                    groupData.isBodyWeight || false;
                                  break;
                                }
                              }
                            }
                          }

                          if (
                            isDefaultWorkouts === "true" &&
                            parsedExercises &&
                            currentExercise
                          ) {
                            for (const [group, groupData] of Object.entries(
                              parsedExercises,
                            )) {
                              if (groupData.exercises) {
                                const foundExercise = groupData.exercises.find(
                                  (ex) => ex.name === currentExercise,
                                );
                                if (foundExercise) {
                                  isMuscleGroupExercise =
                                    groupData.isMuscleGroup || false;
                                  isBodyWeightExercise =
                                    groupData.isBodyWeight || false;
                                  break;
                                }
                              }
                            }
                          } else if (
                            parsedExercises &&
                            muscleGroup &&
                            parsedExercises[muscleGroup]
                          ) {
                            isMuscleGroupExercise =
                              parsedExercises[muscleGroup].isMuscleGroup ||
                              isMuscleGroup === "true";
                            isBodyWeightExercise =
                              parsedExercises[muscleGroup].isBodyWeight ||
                              false;
                          }

                          return isMuscleGroupExercise;
                        })()
                          ? [
                              { label: "Low Intensity", value: 4 },
                              { label: "Moderate Intensity", value: 6 },
                              { label: "High Intensity", value: 8 },
                            ]
                          : [
                              { label: "Low Intensity", value: 8 },
                              { label: "Moderate Intensity", value: 10 },
                              { label: "High Intensity", value: 12 },
                            ]
                      }
                    />
                  </View>
                </View>

                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setInputModalVisible(false);
                      resetInputs();
                    }}
                  >
                    <Text style={styles.modalButtonText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleSetComplete}
                  >
                    <Text style={styles.modalButtonText}>SAVE SET</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Historical Input Modal */}
      <Modal visible={historicalInputVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSave}>
            <Text style={styles.modalTitle}>Log Historical Workout</Text>
            <Text style={styles.exerciseSubtitle}>{currentExercise}</Text>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color="#007BFF"
                style={styles.dateIcon}
              />
              <Text style={styles.dateButtonText}>
                {selectedDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                themeVariant="light"
                textColor="#000000"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setSelectedDate(date);
                }}
                maximumDate={new Date()}
              />
            )}

            <ScrollView
              ref={(ref) => setScrollViewRef(ref)}
              style={styles.setsContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {currentSets.map((set, index) => {
                let showMuscleGroupInputs = false;
                let isBodyWeightExercise = false;

                if (isMachine === "true" && filteredMachineExercises) {
                  const foundExercise = filteredMachineExercises.find(
                    (ex) => ex.name === currentExercise,
                  );
                  if (foundExercise) {
                    showMuscleGroupInputs =
                      foundExercise.isMuscleGroup || false;
                    isBodyWeightExercise = foundExercise.isBodyWeight || false;
                  }
                } else if (
                  isQR === "true" &&
                  myTemplateExercises &&
                  currentExercise
                ) {
                  for (const [group, groupData] of Object.entries(
                    myTemplateExercises,
                  )) {
                    if (groupData.exercises) {
                      const foundExercise = groupData.exercises.find(
                        (ex) => ex.name === currentExercise,
                      );
                      if (foundExercise) {
                        showMuscleGroupInputs =
                          groupData.isMuscleGroup || false;
                        isBodyWeightExercise = groupData.isBodyWeight || false;
                        break;
                      }
                    }
                  }
                } else if (
                  isTemplate === "true" &&
                  parsedTemplates &&
                  currentExercise
                ) {
                  for (const [group, groupData] of Object.entries(
                    parsedTemplates,
                  )) {
                    if (groupData.exercises) {
                      const foundExercise = groupData.exercises.find(
                        (ex) => ex.name === currentExercise,
                      );
                      if (foundExercise) {
                        showMuscleGroupInputs =
                          groupData.isMuscleGroup || false;
                        isBodyWeightExercise = groupData.isBodyWeight || false;
                        break;
                      }
                    }
                  }
                } else if (
                  isDefaultWorkouts === "true" &&
                  parsedExercises &&
                  currentExercise
                ) {
                  for (const [group, groupData] of Object.entries(
                    parsedExercises,
                  )) {
                    if (groupData.exercises) {
                      const foundExercise = groupData.exercises.find(
                        (ex) => ex.name === currentExercise,
                      );
                      if (foundExercise) {
                        showMuscleGroupInputs =
                          groupData.isMuscleGroup || false;
                        isBodyWeightExercise = groupData.isBodyWeight || false;
                        break;
                      }
                    }
                  }
                } else if (
                  parsedExercises &&
                  muscleGroup &&
                  parsedExercises[muscleGroup]
                ) {
                  showMuscleGroupInputs =
                    parsedExercises[muscleGroup].isMuscleGroup ||
                    isMuscleGroup === "true";
                  isBodyWeightExercise =
                    parsedExercises[muscleGroup].isBodyWeight || false;
                }

                return (
                  <View
                    key={`set-input-${index}`}
                    style={styles.setInputContainer}
                  >
                    <View style={styles.setHeaderRow}>
                      <Text style={styles.setLabel}>Set {index + 1}</Text>
                      {index > 0 && (
                        <TouchableOpacity
                          onPress={() => deleteHistoricalSet(index)}
                          style={styles.deleteSetIcon}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={24}
                            color="#FF5757"
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    {showMuscleGroupInputs && (
                      <>
                        <View style={styles.inputField}>
                          <Ionicons
                            name="repeat"
                            size={20}
                            color="#007BFF"
                            style={styles.inputIcon}
                          />
                          <TextInput
                            style={styles.input}
                            placeholder="Number of Reps"
                            keyboardType="phone-pad"
                            value={set.reps}
                            onChangeText={(value) =>
                              updateHistoricalSet(index, "reps", value)
                            }
                            placeholderTextColor="#999"
                          />
                        </View>

                        {!isBodyWeightExercise && (
                          <View style={styles.inputField}>
                            <FontAwesome5
                              name="weight"
                              size={18}
                              color="#007BFF"
                              style={styles.inputIcon}
                            />
                            <TextInput
                              style={styles.input}
                              placeholder="Weight (kg)"
                              keyboardType="phone-pad"
                              value={set.weight}
                              onChangeText={(value) =>
                                updateHistoricalSet(index, "weight", value)
                              }
                              placeholderTextColor="#999"
                            />
                          </View>
                        )}
                      </>
                    )}

                    <View style={styles.durationContainer}>
                      <View style={styles.durationHeader}>
                        <Text style={styles.durationLabel}>Duration</Text>
                      </View>

                      <View style={styles.radioButtonContainer}>
                        <TouchableOpacity
                          style={styles.radioButton}
                          onPress={() => {
                            const newUnits = { ...durationUnits };
                            newUnits[index] = "seconds";
                            setDurationUnits(newUnits);
                          }}
                        >
                          <View
                            style={[
                              styles.radioCircle,
                              (durationUnits[index] || "seconds") ===
                                "seconds" && styles.radioCircleSelected,
                            ]}
                          >
                            {(durationUnits[index] || "seconds") ===
                              "seconds" && (
                              <View style={styles.radioInnerCircle} />
                            )}
                          </View>
                          <Text style={styles.radioLabel}>Seconds</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.radioButton}
                          onPress={() => {
                            const newUnits = { ...durationUnits };
                            newUnits[index] = "minutes";
                            setDurationUnits(newUnits);
                          }}
                        >
                          <View
                            style={[
                              styles.radioCircle,
                              durationUnits[index] === "minutes" &&
                                styles.radioCircleSelected,
                            ]}
                          >
                            {durationUnits[index] === "minutes" && (
                              <View style={styles.radioInnerCircle} />
                            )}
                          </View>
                          <Text style={styles.radioLabel}>Minutes</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.inputField}>
                        <Ionicons
                          name="stopwatch-outline"
                          size={20}
                          color="#007BFF"
                          style={styles.inputIcon}
                        />

                        <TextInput
                          style={styles.input}
                          placeholder={`Enter ${
                            durationUnits[index] || "seconds"
                          }`}
                          keyboardType="phone-pad"
                          value={set.duration}
                          onChangeText={(value) =>
                            updateHistoricalSet(index, "duration", value)
                          }
                          placeholderTextColor="#999"
                        />
                      </View>
                    </View>
                    <View>
                      <Text style={styles.intensityLabel}>
                        Workout Intensity
                      </Text>
                      <View style={styles.pickerContainer}>
                        <CustomPicker
                          placeholder="Select Intensity"
                          onValueChange={(value) => setMET(value)}
                          value={MET}
                          items={
                            (() => {
                              let isMuscleGroupExercise = false;
                              let isBodyWeightExercise = false;

                              if (
                                isMachine === "true" &&
                                filteredMachineExercises
                              ) {
                                const foundExercise =
                                  filteredMachineExercises.find(
                                    (ex) => ex.name === currentExercise,
                                  );
                                if (foundExercise) {
                                  isMuscleGroupExercise =
                                    foundExercise.isMuscleGroup || false;
                                  isBodyWeightExercise =
                                    foundExercise.isBodyWeight || false;
                                }
                              } else if (
                                isQR === "true" &&
                                myTemplateExercises &&
                                currentExercise
                              ) {
                                for (const [group, groupData] of Object.entries(
                                  myTemplateExercises,
                                )) {
                                  if (groupData.exercises) {
                                    const foundExercise =
                                      groupData.exercises.find(
                                        (ex) => ex.name === currentExercise,
                                      );
                                    if (foundExercise) {
                                      isMuscleGroupExercise =
                                        groupData.isMuscleGroup || false;
                                      isBodyWeightExercise =
                                        groupData.isBodyWeight || false;
                                      break;
                                    }
                                  }
                                }
                              }
                              if (
                                isTemplate === "true" &&
                                parsedTemplates &&
                                currentExercise
                              ) {
                                for (const [group, groupData] of Object.entries(
                                  parsedTemplates,
                                )) {
                                  if (groupData.exercises) {
                                    const foundExercise =
                                      groupData.exercises.find(
                                        (ex) => ex.name === currentExercise,
                                      );
                                    if (foundExercise) {
                                      isMuscleGroupExercise =
                                        groupData.isMuscleGroup || false;
                                      isBodyWeightExercise =
                                        groupData.isBodyWeight || false;
                                      break;
                                    }
                                  }
                                }
                              }

                              if (
                                isDefaultWorkouts === "true" &&
                                parsedExercises &&
                                currentExercise
                              ) {
                                for (const [group, groupData] of Object.entries(
                                  parsedExercises,
                                )) {
                                  if (groupData.exercises) {
                                    const foundExercise =
                                      groupData.exercises.find(
                                        (ex) => ex.name === currentExercise,
                                      );
                                    if (foundExercise) {
                                      isMuscleGroupExercise =
                                        groupData.isMuscleGroup || false;
                                      isBodyWeightExercise =
                                        groupData.isBodyWeight || false;
                                      break;
                                    }
                                  }
                                }
                              } else if (
                                parsedExercises &&
                                muscleGroup &&
                                parsedExercises[muscleGroup]
                              ) {
                                isMuscleGroupExercise =
                                  parsedExercises[muscleGroup].isMuscleGroup ||
                                  isMuscleGroup === "true";
                                isBodyWeightExercise =
                                  parsedExercises[muscleGroup].isBodyWeight ||
                                  false;
                              }

                              return isMuscleGroupExercise;
                            })()
                              ? [
                                  { label: "Low Intensity", value: 4 },
                                  { label: "Moderate Intensity", value: 6 },
                                  { label: "High Intensity", value: 8 },
                                ]
                              : [
                                  { label: "Low Intensity", value: 8 },
                                  {
                                    label: "Moderate Intensity",
                                    value: 10,
                                  },
                                  {
                                    label: "High Intensity",
                                    value: 12,
                                  },
                                ]
                          }
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.addSetButton}
              onPress={addHistoricalSet}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color="#FFF"
                style={styles.addButtonIcon}
              />
              <Text style={styles.addSetButtonText}>ADD SET</Text>
            </TouchableOpacity>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setHistoricalInputVisible(false);
                  resetInputs();
                }}
              >
                <Text style={styles.modalButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={
                  isMachine === "true" && activeTab === "onetap"
                    ? handleOneTapSave
                    : handleHistoricalSave
                }
              >
                <Text style={styles.modalButtonText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Save Workout Modal */}
      <Modal visible={isSaveModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlaySave}>
          <View style={styles.modalContentSave}>
            <View style={styles.saveModalHeader}>
              <FontAwesome5
                name="check-circle"
                size={responsiveFontSize(40)}
                color="#FF5757"
              />
              <Text style={styles.saveModalTitle}>Save Workout</Text>
            </View>

            <Text style={styles.saveModalText}>
              Ready to save your workout? Your progress will be recorded{" "}
              {isInGym ? "and you'll earn XP rewards!" : "for your analysis"}
            </Text>

            {xpRewardVisible ? (
              <GrainConfettiAnimation
                numberOfPieces={150}
                xpPoints={xpAmount}
              />
            ) : (
              ""
            )}
            {/* <XpRewardAnimation
              xpAmount={xpAmount}
              visible={xpRewardVisible}
              onAnimationComplete={handleAnimationComplete}
              startPosition={startPosition}
              endPosition={endPosition}
              color="#4CAF50"
            /> */}

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsSaveModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={
                  isMachine === "true" && activeTab === "onetap"
                    ? saveOneTapWorkouts
                    : saveWorkout
                }
              >
                <Text style={styles.modalButtonText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isBackConfirmModalVisible}
        transparent
        animationType="slide"
      >
        <TouchableWithoutFeedback
          onPress={() => setIsBackConfirmModalVisible(false)}
        >
          <View style={styles.modalOverlaySave}>
            <TouchableWithoutFeedback
              onPress={(e) => {
                e.stopPropagation();
              }}
            >
              <View style={styles.modalContentSave}>
                {/* Header with X button */}
                <View style={styles.modalHeaderDiscard}>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setIsBackConfirmModalVisible(false)}
                  >
                    <Ionicons
                      name="close"
                      size={responsiveFontSize(20)}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.saveModalHeader}>
                  <Ionicons
                    name="warning-outline"
                    size={responsiveFontSize(40)}
                    color="#FF9500"
                  />
                  <Text style={styles.saveModalTitle}>Unsaved Changes</Text>
                </View>

                <Text style={styles.saveModalText}>
                  You have unsaved workout data. Do you want to save your
                  progress before leaving?
                </Text>

                {/* Action buttons */}
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={handleConfirmBackNavigation}
                  >
                    <Text style={styles.modalButtonText}>DISCARD</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={saveWorkout}
                  >
                    <Text style={styles.modalButtonText}>SAVE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Filter Modal for Machines */}
      <Modal visible={isFilterModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
          <View style={styles.modalOverlaySave}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContentSave}>
                <View style={styles.filterModalHeader}>
                  <Text style={styles.filterModalTitle}>
                    Filter by Muscle Group
                  </Text>
                  <TouchableOpacity
                    onPress={() => setFilterModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.filterOptionsContainer}>
                  {muscleGroups.map((group) => (
                    <TouchableOpacity
                      key={group}
                      style={[
                        styles.filterOption,
                        selectedMuscleGroups.includes(group) &&
                          styles.filterOptionSelected,
                      ]}
                      onPress={() => toggleMuscleGroupSelection(group)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedMuscleGroups.includes(group) &&
                            styles.filterOptionTextSelected,
                        ]}
                      >
                        {group}
                      </Text>
                      {selectedMuscleGroups.includes(group) && (
                        <Ionicons name="checkmark" size={20} color="#007BFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.filterModalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={clearFilters}
                  >
                    <Text style={styles.modalButtonText}>CLEAR ALL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={applyMuscleGroupFilter}
                  >
                    <Text style={styles.modalButtonText}>APPLY</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Premium Modal for iOS */}
      <Modal
        visible={premiumModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPremiumModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPremiumModalVisible(false)}>
          <View style={styles.premiumModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.premiumModalContent}>
                <Text style={styles.premiumModalText}>
                  This feature requires a Premium subscription
                </Text>
                <TouchableOpacity
                  style={styles.premiumModalButton}
                  onPress={() => setPremiumModalVisible(false)}
                >
                  <Text style={styles.premiumModalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Guest Modal */}
      <Modal
        visible={guestModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setGuestModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setGuestModalVisible(false)}>
          <View style={styles.premiumModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.premiumModalContent}>
                <Text style={[styles.premiumModalText, { fontWeight: "bold" }]}>
                  Finish Setting Up Your Account to Access This Feature
                </Text>
                <TouchableOpacity
                  style={styles.premiumModalButton}
                  onPress={() => {
                    setGuestModalVisible(false);
                    let pathname = "/register/age-selector";

                    if (registrationSteps) {
                      if (!registrationSteps.dob) {
                        pathname = "/register/age-selector";
                      } else if (
                        registrationSteps.dob &&
                        !registrationSteps.goal
                      ) {
                        pathname = "/register/seventh-step";
                      } else if (
                        registrationSteps.dob &&
                        registrationSteps.goal &&
                        !registrationSteps.height
                      ) {
                        pathname = "/register/fourth-step";
                      } else if (
                        registrationSteps.dob &&
                        registrationSteps.goal &&
                        registrationSteps.height &&
                        !registrationSteps.weight
                      ) {
                        pathname = "/register/fifth-step";
                      } else if (
                        registrationSteps.dob &&
                        registrationSteps.goal &&
                        registrationSteps.height &&
                        registrationSteps.weight &&
                        !registrationSteps.body_shape
                      ) {
                        pathname = "/register/body-shape-current";
                      } else if (
                        registrationSteps.dob &&
                        registrationSteps.goal &&
                        registrationSteps.height &&
                        registrationSteps.weight &&
                        registrationSteps.body_shape &&
                        !registrationSteps.lifestyle
                      ) {
                        pathname = "/register/sixth-step";
                      }
                    }

                    router.push({
                      pathname,
                      params: {
                        tab: "My Progress",
                        gender: gender || "male",
                      },
                    });
                  }}
                >
                  <Text style={styles.premiumModalButtonText}>
                    Complete Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    marginBottom: Platform.OS === "ios" ? 0 : 0,
  },
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  premiumModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: width * 0.8,
    maxWidth: 400,
  },
  premiumModalText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  premiumModalButton: {
    backgroundColor: "#FF5757",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  premiumModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    paddingHorizontal: responsiveWidth(5),
    paddingBottom: responsiveWidth(1),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
    marginLeft: 8,
  },
  gymStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: responsiveWidth(3),
    paddingVertical: responsiveHeight(0.8),
    borderRadius: responsiveWidth(5),
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  inGym: {
    backgroundColor: "#4CAF50",
  },
  outGym: {
    backgroundColor: "#FF5757",
  },
  statusText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  headerInfoContainer: {
    marginHorizontal: responsiveWidth(4),
    marginBottom: responsiveHeight(2),
  },
  promoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: responsiveWidth(3),
    padding: responsiveWidth(4),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  promoTextContainer: {
    flex: 1,
  },
  promoTitle: {
    color: "#FFF",
    fontSize: responsiveFontSize(18),
    fontWeight: "bold",
    marginBottom: responsiveHeight(0.5),
  },
  promoSubtitle: {
    color: "#FFF",
    fontSize: responsiveFontSize(14),
    opacity: 0.9,
  },
  promoIconContainer: {
    width: responsiveWidth(12),
    height: responsiveWidth(12),
    borderRadius: responsiveWidth(6),
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: responsiveWidth(4),
    paddingBottom: responsiveHeight(10),
  },
  exerciseCard: {
    marginBottom: responsiveHeight(2.5),
    borderRadius: responsiveWidth(3),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    height: "auto",
    minHeight: responsiveHeight(20),
  },
  exerciseImage: {
    width: "100%",
    height: "100%",
  },
  exerciseImageStyle: {
    borderRadius: responsiveWidth(3),
  },
  gradientBackground: {
    width: "100%",
    height: "100%",
    padding: responsiveWidth(4),
    borderRadius: responsiveWidth(3),
  },
  exerciseTag: {
    position: "absolute",
    top: responsiveHeight(1),
    right: responsiveWidth(4),
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: responsiveWidth(3),
    paddingVertical: responsiveHeight(0.5),
    borderRadius: responsiveWidth(2),
  },
  exerciseTagText: {
    color: "#333",
    fontSize: responsiveFontSize(12),
    fontWeight: "bold",
  },
  exerciseContent: {
    flex: 1,
    marginTop: responsiveHeight(3),
  },
  exerciseIconContainer: {
    width: responsiveWidth(10),
    height: responsiveWidth(10),
    borderRadius: responsiveWidth(5),
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: responsiveHeight(1),
  },
  exerciseHeaderContainer: {
    marginBottom: responsiveHeight(1.5),
  },
  exerciseName: {
    color: "#FFF",
    fontSize: responsiveFontSize(18),
    fontWeight: "bold",
  },
  exerciseSubtitle: {
    color: "#FFF",
    fontSize: responsiveFontSize(14),
    opacity: 0.9,
    marginTop: responsiveHeight(0.5),
  },
  watchDemoButton: {
    position: "absolute",
    right: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: responsiveWidth(3),
    paddingVertical: responsiveHeight(0.5),
    borderRadius: responsiveWidth(2),
  },
  watchDemoText: {
    color: "#FFF",
    fontSize: responsiveFontSize(12),
    marginRight: responsiveWidth(1),
  },
  setInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: responsiveWidth(3),
    borderRadius: responsiveWidth(2),
    marginVertical: responsiveHeight(0.6),
  },
  setContent: {
    flex: 1,
  },
  setText: {
    color: "#FFF",
    fontSize: responsiveFontSize(14),
  },
  setNumber: {
    fontWeight: "bold",
  },
  deleteSetButton: {
    padding: responsiveWidth(1),
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: responsiveWidth(5),
  },
  actionButtonsContainer: {
    marginTop: responsiveHeight(2),
    flexDirection: "row",
    justifyContent: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: responsiveHeight(1),
    paddingHorizontal: responsiveWidth(5),
    borderRadius: responsiveWidth(5),
    minWidth: responsiveWidth(40),
  },
  startButton: {
    backgroundColor: "#4CAF50",
  },
  stopButton: {
    backgroundColor: "#FF3B30",
  },
  historicalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: responsiveHeight(1),
    paddingHorizontal: responsiveWidth(5),
    borderRadius: responsiveWidth(5),
    backgroundColor: "#1E293B",
    minWidth: responsiveWidth(40),
  },
  buttonText: {
    color: "#FFF",
    fontSize: responsiveFontSize(14),
    fontWeight: "bold",
  },
  buttonIcon: {
    marginLeft: responsiveWidth(2),
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: "#999",
  },
  saveWorkoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007BFF",
    // backgroundColor: 'rgba(76, 175, 80, 0.8)',
    padding: responsiveWidth(3),
    marginHorizontal: responsiveWidth(4),
    marginVertical: responsiveHeight(1.5),
    borderRadius: responsiveWidth(3),
    shadowColor: "#374151",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  saveWorkoutButtonText: {
    color: "#fff",
    fontSize: responsiveFontSize(14),
    fontWeight: "bold",
  },
  saveButtonIcon: {
    marginLeft: responsiveWidth(2),
  },
  toastContainer: {
    position: "absolute",
    top: responsiveHeight(12),
    left: 0,
    right: 0,
    backgroundColor: "#4CAF50",
    margin: responsiveWidth(4),
    padding: responsiveWidth(4),
    borderRadius: responsiveWidth(3),
    alignItems: "center",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: "#FFF",
    fontSize: responsiveFontSize(14),
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlaySave: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContentSave: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    width: width * 0.9,
    maxHeight: height * 0.9,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: responsiveWidth(6),
    borderTopRightRadius: responsiveWidth(6),
    height: responsiveHeight(75),
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: responsiveWidth(4),
    backgroundColor: "#FF5757",
  },
  modalHeaderDiscard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // backgroundColor: "#FF5757",
  },
  modalTitle: {
    color: "#000",
    fontSize: responsiveFontSize(16),
    fontWeight: 400,
    textAlign: "center",
  },
  modalTitle2: {
    color: "#000",
    fontSize: responsiveFontSize(16),
    fontWeight: 400,
    textAlign: "center",
  },
  closeButton: {
    width: responsiveWidth(10),
    height: responsiveWidth(10),
    borderRadius: responsiveWidth(5),
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContentContainer: {
    flex: 1,
    padding: responsiveWidth(4),
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseGif: {
    width: "100%",
    height: responsiveHeight(45),
    marginVertical: responsiveHeight(2),
  },
  noGifContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: responsiveWidth(6),
  },
  noGifText: {
    fontSize: responsiveFontSize(16),
    color: "#666",
    marginTop: responsiveHeight(2),
  },
  closeModalButton: {
    backgroundColor: "#FF5757",
    paddingHorizontal: responsiveWidth(8),
    paddingVertical: responsiveHeight(1.5),
    borderRadius: responsiveWidth(3),
    marginTop: responsiveHeight(2),
  },
  closeModalButtonText: {
    color: "#FFF",
    fontSize: responsiveFontSize(16),
    fontWeight: "bold",
  },
  inputModalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: responsiveWidth(6),
    borderTopRightRadius: responsiveWidth(6),
    padding: responsiveWidth(5),
    maxHeight: responsiveHeight(70),
  },
  inputFieldsContainer: {
    marginVertical: responsiveHeight(0.5),
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: responsiveWidth(2),
    marginBottom: responsiveHeight(1.5),
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  inputIcon: {
    paddingHorizontal: responsiveWidth(3),
  },
  inputIcon2: {
    paddingRight: responsiveWidth(3),
  },
  input: {
    flex: 1,
    paddingVertical: responsiveHeight(1.5),
    fontSize: responsiveFontSize(16),
    color: "#333",
  },
  intensityLabel: {
    fontSize: responsiveFontSize(15),
    color: "#333",
    marginBottom: responsiveHeight(1),
    fontWeight: "400",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: responsiveWidth(2),
    backgroundColor: "#F5F5F5",
    overflow: "hidden",
  },

  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: responsiveHeight(3),
  },
  modalButton: {
    flex: 1,
    paddingVertical: responsiveHeight(1.5),
    alignItems: "center",
    borderRadius: responsiveWidth(3),
    marginHorizontal: responsiveWidth(2),
  },
  cancelButton: {
    backgroundColor: "#999",
  },
  confirmButton: {
    backgroundColor: "#007BFF",
  },
  modalButtonText: {
    color: "#FFF",
    fontSize: responsiveFontSize(16),
    fontWeight: "bold",
  },
  historicalModalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: responsiveWidth(6),
    borderTopRightRadius: responsiveWidth(6),
    padding: responsiveWidth(5),
    maxHeight: responsiveHeight(80),
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: responsiveWidth(3),
    borderRadius: responsiveWidth(2),
    marginVertical: responsiveHeight(2),
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dateIcon: {
    marginRight: responsiveWidth(2),
  },
  dateButtonText: {
    fontSize: responsiveFontSize(16),
    color: "#333",
  },
  setsContainer: {
    maxHeight: responsiveHeight(60),
  },
  setInputContainer: {
    marginBottom: responsiveHeight(2),
    padding: responsiveWidth(3),
    backgroundColor: "#F8F8F8",
    borderRadius: responsiveWidth(2),
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  setHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: responsiveHeight(1),
  },
  setLabel: {
    fontSize: responsiveFontSize(16),
    fontWeight: "bold",
    color: "#333",
  },
  deleteSetIcon: {
    padding: responsiveWidth(1),
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4299E1",
    paddingVertical: responsiveHeight(1.5),
    borderRadius: responsiveWidth(3),
    marginVertical: responsiveHeight(2),
  },
  addButtonIcon: {
    marginRight: responsiveWidth(2),
  },
  addSetButtonText: {
    color: "#FFF",
    fontSize: responsiveFontSize(16),
    fontWeight: "bold",
  },
  saveModalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: responsiveWidth(6),
    borderTopRightRadius: responsiveWidth(6),
    padding: responsiveWidth(5),
  },
  saveModalHeader: {
    alignItems: "center",
    marginVertical: responsiveHeight(2),
  },
  saveModalTitle: {
    fontSize: responsiveFontSize(24),
    fontWeight: "bold",
    color: "#333",
    marginTop: responsiveHeight(1),
  },
  saveModalText: {
    fontSize: responsiveFontSize(16),
    color: "#555",
    textAlign: "center",
    marginVertical: responsiveHeight(2),
    lineHeight: responsiveFontSize(22),
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: responsiveWidth(6),
    marginTop: responsiveHeight(10),
  },
  emptyTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: "bold",
    color: "#333",
    marginTop: responsiveHeight(2),
  },
  emptySubtitle: {
    fontSize: responsiveFontSize(14),
    color: "#999",
    marginTop: responsiveHeight(1),
    textAlign: "center",
  },
  exerciseCard: {
    marginBottom: responsiveHeight(2),
    borderRadius: responsiveWidth(3),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: "#ffffff",
  },
  exerciseImage: {
    width: "100%",
    flex: 1,
  },
  exerciseImageStyle: {
    borderRadius: responsiveWidth(3),
    opacity: 0.8,
  },
  gradientBackground: {
    width: "100%",
    padding: responsiveWidth(4),
    paddingBottom: responsiveWidth(2),
    borderRadius: responsiveWidth(3),
    opacity: 0.9,
  },
  exerciseContent: {
    padding: responsiveWidth(1),
  },

  setInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: responsiveWidth(2.5),
    borderRadius: responsiveWidth(2),
    marginVertical: responsiveHeight(0.4),
  },
  setContent: {
    flex: 1,
  },
  setText: {
    color: "#FFF",
    fontSize: responsiveFontSize(13),
  },

  actionButtonsContainer: {
    marginTop: responsiveHeight(1.5),
    marginBottom: responsiveHeight(0.5),
    flexDirection: "row",
    justifyContent: "center",
  },

  exerciseHeaderContainer: {
    marginBottom: responsiveHeight(1),
  },
  exerciseName: {
    color: "#FFF",
    fontSize: responsiveFontSize(18),
    fontWeight: "bold",
  },
  exerciseSubtitle: {
    color: "#FFF",
    fontSize: responsiveFontSize(14),
    opacity: 0.9,
  },
  dayTabsContainer: {
    marginBottom: 10,
  },
  dayTabsContent: {
    paddingHorizontal: 8,
    alignItems: "center",
  },
  dayTab: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: "#f0f0f0",
  },
  selectedDayTab: {
    backgroundColor: "#007BFF",
  },
  dayTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#555",
  },
  selectedDayTabText: {
    color: "#FFF",
  },
  durationContainer: {
    marginTop: 10,
  },

  durationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  durationLabel: {
    fontSize: 16,
    color: "#333",
    // marginLeft: 8,
    fontWeight: "500",
  },

  radioButtonContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },

  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },

  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#999",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  radioCircleSelected: {
    borderColor: "#007BFF",
  },

  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#007BFF",
  },

  radioLabel: {
    fontSize: 14,
    color: "#333",
  },

  durationInput: {
    height: 45,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#F5F5F5",
  },
  filterIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  filterModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  filterOptionsContainer: {
    maxHeight: height * 0.4,
    marginBottom: 20,
  },
  filterOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#F8F8F8",
  },
  filterOptionSelected: {
    backgroundColor: "#E3F2FD",
    borderColor: "#007BFF",
  },
  filterOptionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  filterOptionTextSelected: {
    color: "#007BFF",
    fontWeight: "600",
  },
  filterModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  disclaimerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingTop: 0,
    backgroundColor: "transparent",
  },
  disclaimerText: {
    fontSize: 10,
    color: "#888",
    marginLeft: 6,
    lineHeight: 14,
    flex: 1,
  },
});

const exerciseVisualModalStyles = StyleSheet.create({
  exrMdlBackdropOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  exrMdlMainContainerWrapper: {
    width: isTablet ? "80%" : "92%",
    maxWidth: isTablet ? 800 : 600,
    borderRadius: isTablet ? 24 : 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  exrMdlHeaderRegion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: isTablet ? 16 : 10,
    paddingVertical: 0,
  },
  exrMdlTitleElement: {
    color: "#000000",
    fontSize: responsiveFontSize(14),
    fontWeight: "500",
    // flex: 1,
    marginTop: isTablet ? 20 : 16,
  },
  exrMdlDisclosureText: {
    color: "#666666",
    fontSize: responsiveFontSize(10),
    marginTop: isTablet ? 16 : 12,
    textAlign: "center",
    paddingHorizontal: isTablet ? 20 : 16,
  },
  exrMdlDisclosureLink: {
    color: "#0066CC",
    textDecorationLine: "underline",
  },
  exrMdlDismissButtonArea: {
    padding: isTablet ? 12 : 8,
  },
  exrMdlContentSection: {
    padding: isTablet ? 36 : 24,
    alignItems: "center",
  },
  exrMdlAnimationEnclosure: {
    width: "100%",
    height: isTablet ? 180 : 165,
    borderRadius: isTablet ? 16 : 12,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: isTablet ? 32 : 10,
  },
  exrMdlDynamicVisualization: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  exrMdlPlaceholderEnclosure: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    backgroundColor: "#2A2A3A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  exrMdlPlaceholderNotification: {
    color: "#A0A0A0",
    fontSize: responsiveFontSize(16),
    marginTop: 16,
    fontWeight: "500",
  },
  exrMdlAcknowledgementButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignSelf: "center",
    minWidth: 150,
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  exrMdlAcknowledgementButtonLabel: {
    color: "#FFFFFF",
    fontSize: responsiveFontSize(14),
    fontWeight: "500",
    letterSpacing: 1,
  },
  filterIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: responsiveWidth(4),
    marginTop: 10,
    marginBottom: 5,
    flexWrap: "nowrap",
  },
  tab: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 5,
    minWidth: 0,
  },
  activeTab: {
    elevation: 3,
    shadowColor: "#007BFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  tabGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    width: "100%",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  activeTabText: {
    color: "#FFF",
  },
  filterModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  filterOptionsContainer: {
    maxHeight: height * 0.4,
    marginBottom: 20,
  },
  filterOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#F8F8F8",
  },
  filterOptionSelected: {
    backgroundColor: "#E3F2FD",
    borderColor: "#007BFF",
  },
  filterOptionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  filterOptionTextSelected: {
    color: "#007BFF",
    fontWeight: "600",
  },
  filterModalActions: {
    flexDirection: "row",
    gap: 10,
  },
});

export default ExerciseScreen;
