import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  BackHandler,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Color, linearGradientColors } from "../../GlobalStyles";
import { LinearGradient } from "expo-linear-gradient";
import MobileLogo from "../../components/ui/Register/MobileLogo";
import ContinueButton from "../../components/ui/Register/ContinueButton";
import CardTitle from "../../components/ui/Register/CardTitle";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GenderIcon = ({ type, selected, onPress }) => {
  const iconColor = selected ? Color.rgPrimary : Color.rgDisable;
  const backgroundColor = selected ? "#EDEDED" : "#EDEDED";
  const borderColor = selected ? "#FF5757" : "transparent";
  const insets = useSafeAreaInsets();
  // 8178428798
  return (
    <View style={styles.genderSelectionWrapper}>
      <TouchableOpacity
        style={[
          styles.genderIconContainer,
          { backgroundColor, borderColor, borderWidth: selected ? 1 : 1 },
        ]}
        onPress={onPress}
      >
        {type === "male" ? (
          <Image
            source={require("../../assets/images/gender_male.webp")}
            style={[styles.images, { height: 220, marginTop: 5 }]}
            contentFit="contain"
          />
        ) : (
          <Image
            source={require("../../assets/images/gender_female.webp")}
            style={[styles.images, { height: 223 }]}
            contentFit="contain"
          />
        )}
      </TouchableOpacity>
      <Text
        style={[
          styles.genderText,
          { color: selected ? Color.rgPrimary : "#686868" },
        ]}
      >
        {type === "male" ? "Male" : "Female"}
      </Text>
    </View>
  );
};

const ThirdStepRegistration = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedGender, setSelectedGender] = useState(null);
  const insets = useSafeAreaInsets();
  const { full_name } = params;

  useEffect(() => {
    if (params.gender) {
      setSelectedGender(params.gender);
    }
  }, []);

  // Handle hardware back button - preserve all params including weight and height
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.push({
          pathname: "/register/age-selector",
          params: {
            ...params,
            gender: selectedGender || params.gender, // Preserve current or previous gender selection
            full_name: params.full_name,
            dateOfBirth: params.dateOfBirth,
            weight: params.weight, // Preserve weight
            height: params.height, // Preserve height
            heightUnit: params.heightUnit, // Preserve height unit
          },
        });
        return true; // Prevent default back behavior
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => backHandler.remove();
    }, [params, router, selectedGender]),
  );

  const handleGenderSelection = (gender) => {
    setSelectedGender(gender);
  };

  const handleContinue = () => {
    if (selectedGender) {
      router.push({
        pathname: "/register/seventh-step",
        params: {
          ...params,
          gender: selectedGender,
          dateOfBirth: params?.dateOfBirth,
        },
      });
    }
  };

  return (
    <LinearGradient
      style={{ flex: 1, width: "100%", height: "100%" }}
      colors={["#FFFFFF", "#FFFFFF", "#FFFFFF"]}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.push({
              pathname: "/register/age-selector",
              params: {
                ...params,
                gender: selectedGender || params.gender,
                full_name: params.full_name,
                dateOfBirth: params.dateOfBirth,
                weight: params.weight,
                height: params.height,
                heightUnit: params.heightUnit,
              },
            })
          }
        >
          <Feather name="arrow-left" size={24} color="#FF5757" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Select Your <Text style={styles.highlightText}>Gender</Text>
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={styles.formContainer}>
          <View style={styles.genderSelectionContainer}>
            <GenderIcon
              type="male"
              selected={selectedGender === "Male"}
              onPress={() => handleGenderSelection("Male")}
            />
            <GenderIcon
              type="female"
              selected={selectedGender === "Female"}
              onPress={() => handleGenderSelection("Female")}
            />
          </View>
        </View>

        <ContinueButton
          isValid={selectedGender}
          handleSubmit={handleContinue}
          text={"Continue"}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginHorizontal: 6,
  },
  highlightText: {
    color: "#FF5757",
  },
  headerSpacer: {
    width: 34,
  },
  container: {
    flex: 1,
    backgroundColor: Color.rgBgContainer,
    justifyContent: "center",
  },
  formContainer: {
    borderRadius: 15,
    width: "100%",
    marginBottom: 30,
  },
  images: {
    width: 130,
    height: 220,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    color: Color.rgDisable,
    fontSize: 16,
    textAlign: "center",
  },
  genderSelectionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
  },
  genderSelectionWrapper: {
    alignItems: "center",
  },
  genderIconContainer: {
    alignItems: "center",
    padding: 20,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginBottom: 10,
    paddingBottom: 0,
  },
  genderText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  nextButton: {
    flexDirection: "row",
    backgroundColor: Color.rgPrimary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: Color.rgDisable,
  },
  nextButtonText: {
    color: Color.rgTextSecondary,
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 10,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  loginText: {
    color: Color.rgDisable,
  },
  loginLink: {
    color: Color.rgPrimary,
    fontWeight: "bold",
  },
});

export default ThirdStepRegistration;
