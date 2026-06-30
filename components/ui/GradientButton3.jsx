import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { Image } from "expo-image";
import MaskedView from "@react-native-masked-view/masked-view";

const GradientButton3 = ({
  title = "Demo Text",
  span,
  onPress1,
  onPress2,
  colors,
  textStyle = {},
  containerStyle = {},
  belowButtonText,
  mainContainerStyle = {},
  edit,
  onPress,
  spanStyle = {},
  borderStyle = {},
}) => {
  return (
    <View
      style={[
        {
          display: "flex",
          alignItems: "center",
          // width: '100%',
        },
        mainContainerStyle,
      ]}
    >
      {edit ? (
        <TouchableOpacity
          style={{ width: "100%" }}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.button,
              containerStyle,
              { justifyContent: edit ? "space-between" : "center" },
            ]}
          >
            <View>
              <Text style={[styles.text, textStyle]}>{title}</Text>
              {span && <Text style={[styles.span]}>{span}</Text>}
            </View>
            {edit && (
              <View>
                <Image
                  source={require("../../assets/images/water/water_edit.png")}
                  style={{ width: 20, height: 20 }}
                />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <View style={{ width: "100%" }}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.button,
              containerStyle,
              { justifyContent: edit ? "space-between" : "center" },
              borderStyle,
            ]}
          >
            <View>
              <Text style={[styles.text, textStyle]}>{title}</Text>
              {span && <Text style={[styles.span, spanStyle]}>{span}</Text>}
            </View>
            {edit && (
              <View>
                <Image
                  source={require("../../assets/images/water/water_edit.png")}
                  style={{ width: 15, height: 15 }}
                />
              </View>
            )}
          </LinearGradient>
        </View>
      )}

      {belowButtonText && (
        <TouchableOpacity onPress={onPress2} activeOpacity={0.8}>
          <Text style={[styles.link]}>{belowButtonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default GradientButton3;

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 20,
    // borderWidth: 0.5,
    borderColor: "#28A745",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    flexDirection: "row",
  },
  text: {
    color: "#FFF",
    fontFamily: "Roboto",
    fontSize: 14,
    fontStyle: "normal",
    fontWeight: "400",
    flexDirection: "row",
  },
  link: {
    color: "#007BFF",
    fontFamily: "Roboto",
    fontSize: 10,
    fontStyle: "normal",
    fontWeight: "400",
    // lineHeight: 9.68,
    flexDirection: "row",
    marginTop: 10,
    textAlign: "center",
  },
  span: {
    color: "#FFF",
    fontFamily: "Roboto",
    fontSize: 12,
    fontStyle: "normal",
    fontWeight: "400",
  },
});
