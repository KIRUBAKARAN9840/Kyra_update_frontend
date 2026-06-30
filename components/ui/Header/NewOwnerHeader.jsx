import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const NewOwnerHeader = ({ onBackButtonPress, text }) => {
  return (
    <SafeAreaView>
      <View style={styles.header}>
        <TouchableOpacity style={styles.icon} onPress={onBackButtonPress}>
          <Ionicons name="arrow-back-outline" size={22}></Ionicons>
        </TouchableOpacity>

        <View style={{ width: "100%" }}>
          <Text style={{ color: "#000", textAlign: "center" }}>{text}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  icon: {
    position: "absolute",
    left: 20,
    paddingVertical: 15,
    paddingRight: 15,
  },
});

export default NewOwnerHeader;
