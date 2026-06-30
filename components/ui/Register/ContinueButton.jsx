import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { Color } from "../../../GlobalStyles";

// const ContinueButton = ({ isValid, handleSubmit, text }) => {
const ContinueButton = (props) => {
  const { isValid, handleSubmit, text, isLoading } = props;
  const isDisabled = !isValid || isLoading;

  return (
    <TouchableOpacity
      style={[styles.nextButton, isDisabled && styles.disabledButton]}
      onPress={handleSubmit}
      disabled={isDisabled}
    >
      {isLoading ? (
        <ActivityIndicator color="white" />
      ) : (
        <>
          <Text
            style={[
              styles.nextButtonText,
              ,
              isDisabled && styles.disabledButtonText,
            ]}
          >
            {text}
          </Text>
          <Feather
            name="arrow-right"
            size={16}
            color={isDisabled ? "#454545" : "white"}
          />
        </>
      )}
    </TouchableOpacity>
  );
};

export default ContinueButton;

const styles = StyleSheet.create({
  nextButton: {
    flexDirection: "row",
    backgroundColor: "#ff5757",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "75%",
    marginHorizontal: "auto",
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#FF5757",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        // elevation: 8,
        shadowColor: "#FF5757",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
    }),
  },
  disabledButton: {
    // backgroundColor: Color.rgDisable,
    backgroundColor: "#EEEEEE",
  },
  disabledButtonText: {
    color: "#454545",
  },
  nextButtonText: {
    color: Color.rgContinue,
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 5,
  },
});
