import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Tooltip from "react-native-walkthrough-tooltip";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getClientXpAPI } from "../../services/clientApi";
import * as SecureStore from "expo-secure-store";
import { Image } from "expo-image";
import { showToast } from "../../utils/Toaster";

const { width } = Dimensions.get("window");

const UserHeaderWithMenu = ({ routePath, xpPoints = 1531, xpChange }) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [xp, setXp] = useState(null);
  const [gymName, setGymName] = useState("");
  const [profile, setProfile] = useState("");
  const router = useRouter();

  const getgymName = async () => {
    const current_name = await AsyncStorage.getItem("gym_name");
    setGymName(current_name);
  };
  useEffect(() => {
    getgymName();
  }, []);

  const truncateGymName = (name) => {
    const maxLength = 15;
    return name.length > maxLength
      ? name.substring(0, maxLength) + "..."
      : name;
  };

  const menuItems = [
    {
      icon: "person-outline",
      text: "Your Profile",
      onPress: () => {
        router.push("/client/profile");
        setIsMenuVisible(false);
      },
    },
    {
      icon: "nutrition-outline",
      text: "View All Foods",
      onPress: () => {
        router.push("/client/allfoods");
        setIsMenuVisible(false);
      },
    },
    {
      icon: "mail-outline",
      text: "Give Feedback",
      onPress: () => {
        router.push("/client/clientfeedback");
        setIsMenuVisible(false);
      },
    },
    {
      icon: "log-out-outline",
      text: "Logout",
      onPress: async () => {
        try {
          await AsyncStorage.removeItem("gym_id");
          await AsyncStorage.removeItem("client_id");
          await AsyncStorage.removeItem("gym_name");
          await AsyncStorage.removeItem("role");
          await SecureStore.deleteItemAsync("access_token");
          await SecureStore.deleteItemAsync("refresh_token");

          router.push("/");
        } catch (error) {
          showToast({
            type: "error",
            title: "Error",
            desc: "Something went wrong. Please try again later",
          });
        }
        setIsMenuVisible(false);
      },
    },
  ];

  const fetchXp = async () => {
    try {
      setXp("...");
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });;
      }
      const response = await getClientXpAPI(client_id);
      if (response?.status === 200) {
        setProfile(response?.profile);
        setXp(response?.data);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Error fetching rewards",
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

  useEffect(() => {
    fetchXp();
  }, [xpChange]);

  return (
    <SafeAreaView>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {routePath && (
            <TouchableOpacity onPress={() => router.push(routePath)}>
              <Ionicons
                name="arrow-back-outline"
                size={20}
                color="#FFF"
                style={styles.userIcon}
              />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>{truncateGymName(gymName)}</Text>
        </View>
        <View style={styles.rightContainer}>
          <Tooltip
            isVisible={showTooltip}
            content={
              <View style={styles.tooltipContent}>
                <TouchableOpacity
                  style={styles.tooltipOptionButton}
                  onPress={() => {
                    router.push("/client/leaderboard");
                    setShowTooltip(false);
                  }}
                >
                  <Text style={styles.tooltipOption}>My Leaderboard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.tooltipOptionButton}
                  onPress={() => {
                    router.push("/client/myrewards");
                    setShowTooltip(false);
                  }}
                >
                  <Text style={styles.tooltipOption}>My Rewards</Text>
                </TouchableOpacity>
              </View>
            }
            placement="bottom"
            onClose={() => setShowTooltip(false)}
            showChildInTooltip={true}
            topAdjustment={Platform.OS === "android" ? -30 : 0}
          >
            <TouchableOpacity
              style={styles.xpContainer}
              onPress={() => setShowTooltip(true)}
            >
              {/* {!showTooltip && */}
              <LinearGradient
                colors={["#FF8A8A", "#FF8A8A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.xpGradient}
              >
                <View style={styles.xpInnerContainer}>
                  <View style={styles.xpIconContainer}>
                    <MaterialCommunityIcons
                      name="star-four-points"
                      size={16}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.xpTextContainer}>
                    <Text style={styles.xpText}>XP</Text>
                    {/* <Text style={styles.xpValue}>{xpPoints}</Text>
                     */}
                    <Text style={styles.xpValue}>{xp}</Text>
                  </View>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color="#FFFFFF"
                    style={styles.xpChevron}
                  />
                </View>
              </LinearGradient>
              {/* } */}
            </TouchableOpacity>
          </Tooltip>

          <TouchableOpacity onPress={() => setIsMenuVisible(true)}>
            <View style={styles.userProfileContainer}>
              <View style={styles.userIconContainer}>
                <Image
                  source={profile}
                  style={{ width: 35, height: 35, borderRadius: 50 }}
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <Modal
          transparent={true}
          visible={isMenuVisible}
          animationType="slide"
          onRequestClose={() => setIsMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setIsMenuVisible(false)}
          >
            <View style={styles.menuContainer}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <Ionicons name={item.icon} size={24} color="#FF5757" />
                  <Text style={styles.menuItemText}>{item.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
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
    paddingVertical: 10,
    backgroundColor: "#FF5757",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
  },
  userIcon: {
    borderRadius: 50,
    backgroundColor: "#E0E0E0",
    padding: 10,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  userProfileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  username: {
    color: "white",
    marginRight: 10,
    fontSize: 14,
    fontWeight: "600",
  },
  userIconContainer: {
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  userIcon: {
    userIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 70 : 70,
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    width: 250,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuItemText: {
    marginLeft: 15,
    fontSize: 16,
    color: "#333",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  xpContainer: {
    marginRight: 8,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  xpGradient: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  xpInnerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  xpIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  xpTextContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  xpText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: width * 0.03,
    marginRight: 2,
  },
  xpValue: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: width * 0.03,
    marginRight: 2,
  },
  xpChevron: {
    marginLeft: 4,
  },
  profileIcon: {
    marginLeft: 4,
  },
  tooltipContent: {
    padding: 10,
  },
  tooltipOption: {
    fontSize: width * 0.035,
    paddingVertical: 8,
    color: "#333",
  },
  tooltipOptionButton: {
    paddingVertical: 8,
  },
});

export default UserHeaderWithMenu;
