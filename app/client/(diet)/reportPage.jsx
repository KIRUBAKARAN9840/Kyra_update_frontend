import { useRouter } from "expo-router";
import React from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity } from "react-native";
import { View } from "react-native";
import EmptyStateCard from "../../../components/ui/Workout/EmptyDataComponent";
import { Ionicons } from "@expo/vector-icons";
const { width, height } = Dimensions.get("window");

const ReportPage = () => {
  const router = useRouter();

  return (
    <>
      <View style={styles.sectionContainer}>
        <TouchableOpacity
          style={styles.backButtonContainer}
          onPress={() => {
            router.push("/client/diet");
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text style={styles.backButtonText}>Report</Text>
        </TouchableOpacity>
        <EmptyStateCard
          imageSource={require("../../../assets/images/workout/FOOD_NOT_AVAILABLE_CAT_V001 2.webp")}
          onButtonPress={() => router.push("/client/diet")}
          buttonText={"Go To Diet Page"}
          //   message={
          //     'Looks like you have not added anything today!\nTap below to add your favorite meals and track your intakes.'
          //   }
          belowButtonText={"Calm down! You will get your report soon."}
          onButtonPress2={() => {}}
        />
      </View>
    </>
  );
};

export default ReportPage;

const styles = StyleSheet.create({
  sectionContainer: {
    flex: 1,
    padding: width * 0.04,
  },
  backButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    marginBottom: height * 0.02,
    marginTop: height * 0.04,
  },
  backButtonText: {
    fontSize: width * 0.04,
    marginLeft: 10,
    fontWeight: "500",
  },
});
