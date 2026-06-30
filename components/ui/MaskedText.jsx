import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
const { width } = Dimensions.get("window");

const MaskedText = ({
  bg1,
  bg2,
  text,
  textStyle,
  extraText,
  extra,
  extraStyle,
}) => {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <MaskedView maskElement={<Text style={[textStyle]}>{text}</Text>}>
        <LinearGradient
          colors={[bg1, bg2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ justifyContent: "center" }}
        >
          <Text style={[{ opacity: 0 }, textStyle]}>{text}</Text>
        </LinearGradient>
      </MaskedView>
      {extra && (
        <Text style={[extraStyle, { marginLeft: 5 }]}>{extraText}</Text>
      )}
    </View>
  );
};

const MaskedIcon = ({ bg1, bg2, icon, size }) => {
  return (
    <MaskedView maskElement={<Ionicons name={icon} size={size} color="#000" />}>
      <LinearGradient
        colors={[bg1, bg2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ justifyContent: "center" }}
      >
        <Ionicons name={icon} size={size} style={{ opacity: 0 }} />
      </LinearGradient>
    </MaskedView>
  );
};

const MaskedTextIcon = ({
  text,
  icon = "add-circle",
  bg1,
  bg2,
  size = 20,
  style,
}) => (
  <MaskedView
    maskElement={
      <View style={styles.macroItem}>
        <Ionicons name={icon} size={size} style={{}} />
        <Text style={styles.macroLabel}>{text}</Text>
      </View>
    }
  >
    <LinearGradient
      colors={[bg1, bg2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ justifyContent: "center", alignItems: "center" }}
    >
      <View style={styles.macroItem}>
        <Ionicons name={icon} size={24} style={{ opacity: 0 }} />

        <Text style={[styles.macroLabel, { opacity: 0 }]}>{text}</Text>
      </View>
    </LinearGradient>
  </MaskedView>
);

export { MaskedText, MaskedIcon, MaskedTextIcon };
// export default MaskedText;

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    padding: 16,
    marginVertical: 10,
    width: width * 0.92,
    alignSelf: "center",
    backgroundColor: "#F8FCFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0A0A0A",
  },
  itemCount: {
    fontSize: 14,
    color: "#777",
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 16,
  },
  macroItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  macroLabel: {
    fontSize: 12,
    // marginTop: 4,
    paddingLeft: 5,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginTop: 4,
  },
  maskedContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  maskedText: {
    fontSize: 14,
    fontWeight: "500",
  },
  maskedIcon: {
    marginRight: 4,
  },
  gradientBackground: {
    justifyContent: "center",
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logFoodText: {
    color: "green",
    fontSize: 14,
    fontWeight: "500",
  },
  viewFoodText: {
    color: "blue",
    fontSize: 14,
    fontWeight: "500",
  },
});
