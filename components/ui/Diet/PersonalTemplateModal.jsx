// PersonalTemplateModal.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
// import bot from '../../../'

const PersonalTemplateModal = ({
  visible,
  items = [],
  setCurrentModalType,
  handleSelection,
}) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.wrapper}>
      <LinearGradient
        colors={["#28a74694", "#007bff90"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.container}
      >
        <View style={styles.trainerContainer}>
          <Image
            source={require("../../../assets/images/diet/male_trainer.png")}
            style={styles.trainer}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Personal Template</Text>
          <Text style={styles.subtitle}>
            Create and log personalised templates
          </Text>
        </View>

        <View style={styles.icon}>
          <Ionicons name="chevron-forward" size={28} color="white" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default PersonalTemplateModal;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginBottom: 35,
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    borderRadius: 20,
    position: "relative",
    height: 120,
  },
  image: {
    width: "43%",
    marginRight: 16,
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
  },
  trainerContainer: {
    width: "20%",
  },
  trainer: {
    width: 100,
    height: 135,
  },

  textContainer: {
    width: "70%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  subtitle: {
    fontSize: 12,
    color: "white",
    marginTop: 4,
    whiteSpace: "nowrap",
    textAlign: "center",
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
    width: "10%",
    alignSelf: "center",
  },
});
