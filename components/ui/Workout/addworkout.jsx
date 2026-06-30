import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  Text,
  Image,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import WorkoutCard from "./WorkoutCard";
import { getFittbotWorkoutReportAPI } from "../../../services/clientApi";

const { width, height } = Dimensions.get("window");

const isTablet = () => {
  const aspectRatio = height / width;
  return width >= 768 || (width >= 600 && aspectRatio < 1.6);
};

// ─── Workout Report Banner (same design as allexercises.jsx) ─────────
const WorkoutReportBanner = ({ report, onViewReport }) => {
  if (!report) return null;

  const {
    total_time_mins,
    total_calories_burnt,
    exercises_completed,
    exercises_total,
  } = report;

  return (
    <View style={styles.reportCard}>
      {/* Header row: title + View Report */}
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>Workout Stats</Text>
        <TouchableOpacity style={styles.viewReportBtn} onPress={onViewReport}>
          <Text style={styles.viewReportText}>View Report</Text>
          <Ionicons name="chevron-forward" size={14} color="#007BFF" />
        </TouchableOpacity>
      </View>

      {/* 3 stat columns */}
      <View style={styles.reportStatsRow}>
        {/* Session Time */}
        <View style={styles.reportStatItem}>
          <Image
            source={require("../../../assets/images/clockbig.png")}
            style={styles.reportIcon}
          />
          <Text style={styles.reportStatLabel}>Session Time</Text>
          <Text style={styles.reportStatValue}>
            {total_time_mins != null ? `${total_time_mins} min` : "—"}
          </Text>
        </View>

        {/* Calories Burnt */}
        <View style={styles.reportStatItem}>
          <Image
            source={require("../../../assets/images/caloriesbig.png")}
            style={[styles.reportIcon, { width: 48 }]}
          />
          <Text style={styles.reportStatLabel}>Calories Burnt</Text>
          <Text style={styles.reportStatValue}>
            {total_calories_burnt != null
              ? `${total_calories_burnt} Kcal`
              : "—"}
          </Text>
        </View>

        {/* Exercises Completed */}
        <View style={styles.reportStatItem}>
          <Image
            source={require("../../../assets/images/weightbig.png")}
            style={styles.reportIcon}
          />
          <Text style={styles.reportStatLabel}>Exercises</Text>
          <Text style={styles.reportStatValue}>{exercises_completed}</Text>
        </View>
      </View>
    </View>
  );
};

const WorkoutSelection = (props) => {
  const { gender: genderProp } = props;
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [gender, setGender] = useState(genderProp || "male");

  useEffect(() => {
    const fetchReport = async () => {
      const res = await getFittbotWorkoutReportAPI();
      if (res?.status === 200 && res?.report) {
        setReport(res.report);
        if (res.gender) {
          setGender(res.gender);
        }
      }
    };
    fetchReport();
  }, []);

  const workoutTypes = [
    {
      id: "fittbot",
      title: "Gym Workouts",
      subtitle: "Everything you need for workouts.Just one tap inside Fymble.",
      imagePath:
        gender?.toLowerCase() === "male"
          ? require("../../../assets/images/gymworkout.webp")
          : require("../../../assets/images/gym_workout_female.webp"),
      buttonText: "Start Now",
      charWidth: isTablet() ? 170 : 110,
      charHeight: isTablet()
        ? 140
        : gender?.toLowerCase() === "male"
          ? 140
          : 110,
      bg1: "#E6F4F8",
      bg2: "#fff",
      border1: "rgba(41, 125, 179, 0.5)",
      border2: "#fff",
      textColor: "#000000",
    },

    {
      id: "home",
      title: "Home Workouts",
      subtitle: "No gym access? Train anywhere, anytime, always.",
      imagePath:
        gender?.toLowerCase() === "male"
          ? require("../../../assets/images/workout/home_male.webp")
          : require("../../../assets/images/workout/home_female.webp"),
      buttonText: "Start Now",
      charWidth: isTablet()
        ? 170
        : gender?.toLowerCase() === "female"
          ? 140
          : 125,
      charHeight: isTablet() ? 140 : 130,
      bg1: "#fff",
      bg2: "#fff",
      border1: "#fff",
      border2: "#fff",
      textColor: "#000000",
    },
  ];

  const handleModalClick = (type) => {
    if (type == "fittbot") {
      router.push("/client/(workout)/fittbotWorkoutPage");
    } else if (type == "home") {
      router.push("/client/(workout)/homeWorkoutPage");
    }
  };

  const renderSelectionButtons = () => (
    <ScrollView style={[styles.selectionButtonsContainer]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {workoutTypes?.map((item, index) => {
          return (
            <WorkoutCard
              key={item?.id}
              title={item?.title}
              subtitle={item?.subtitle}
              buttonText={item?.buttonText}
              imagePath={item?.imagePath}
              onPress={() => handleModalClick(item?.id)}
              textColor={item.textColor}
              bg1={item.bg1}
              bg2={item.bg2}
              border1={item.border1}
              border2={item.border2}
              charWidth={item.charWidth}
              charHeight={item?.charHeight}
              buttonTextColor={"#297DB3"}
            />
          );
        })}
      </ScrollView>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <WorkoutReportBanner
        report={report}
        onViewReport={() => router.push("/client/(workout)/workoutreportpage")}
      />
      <View style={styles.scrollableContent}>{renderSelectionButtons()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginBottom: Platform.OS === "ios" ? 30 : 0,
  },
  selectionButtonsContainer: {
    padding: isTablet() ? width * 0.025 : width * 0.035,
    overflow: "visible",
  },
  scrollableContent: {
    flex: 1,
    marginTop: 10,
    overflow: "visible",
  },

  // ── Report banner ─────────────────────────────────────────────────
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  viewReportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewReportText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007BFF",
  },
  reportStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  reportStatItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  reportIcon: {
    width: 56,
    height: 56,
    resizeMode: "contain",
  },
  reportStatLabel: {
    fontSize: 11,
    color: "#919191",
    textAlign: "center",
  },
  reportStatValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
});

export default WorkoutSelection;
