import React, { useMemo } from "react";
import { Platform, Linking } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { showToast } from "../../../utils/Toaster";
import { isGymPremium } from "../../../config/access";
import { useUser } from "../../../context/UserContext";

const MenuItems = ({ setIsMenuVisible = {} }) => {
  const context = useUser();
  const plan = context?.plan || null;

  // Memoize menu items to avoid recreation on every render
  const menuSections = useMemo(
    () => [
      {
        id: "account",
        title: "Account",
        icon: "person",
        items: [
          {
            id: "profile",
            icon: "person",
            text: "My Profile",
            onPress: () => {
              router.push("/client/profile");
              setIsMenuVisible(false);
            },
          },
        ],
      },
      {
        id: "membership",
        title: "Membership & Passes",
        icon: "card",
        items: [
          // Only show subscription on Android
          ...(Platform.OS === "android"
            ? [
                {
                  id: "subscription",
                  icon: "card",
                  text: "Fymble Subscription",
                  onPress: () => {
                    router.push("/client/subscription");
                    setIsMenuVisible(false);
                  },
                },
              ]
            : []),
          {
            id: "dailypass",
            icon: "ticket",
            text: "My Daily Pass & Sessions",
            onPress: () => {
              router.push("/client/allpass");
              setIsMenuVisible(false);
            },
          },
          {
            id: "manage_gym",
            icon: "barbell",
            text: "Manage Gym Membership",
            onPress: () => {
              router.push("/unpaid/activateaccount");
              setIsMenuVisible(false);
            },
          },
        ],
      },
      {
        id: "payments",
        title: "Payments & Rewards",
        icon: "wallet",
        items: [
          {
            id: "history",
            icon: "wallet",
            text: "Purchase History",
            onPress: () => {
              router.push("/client/purchasehistory");
              setIsMenuVisible(false);
            },
          },
          {
            id: "refer",
            icon: "person-add",
            text: "Refer and Earn",
            onPress: () => {
              router.push("/client/referral");
              setIsMenuVisible(false);
            },
          },
        ],
      },
      {
        id: "support",
        title: "App & Support",
        icon: "mic",
        iconImage: require("../../../assets/images/header/support.png"),
        items: [
          ...(isGymPremium(plan)
            ? [
                {
                  id: "feedback",
                  icon: "chatbubble",
                  text: "Gym Feedback",
                  onPress: () => {
                    router.push("/client/clientfeedback");
                    setIsMenuVisible(false);
                  },
                },
              ]
            : []),
          {
            id: "support",
            icon: "help-buoy",
            iconImage: require("../../../assets/images/header/support.png"),
            text: "Help & Support",
            onPress: () => {
              router.push("/client/help");
              setIsMenuVisible(false);
            },
          },
          {
            id: "whatsapp_support",
            icon: "logo-whatsapp",
            iconColor: "#25D366",
            text: "Whatsapp Support",
            subText: "(9AM - 7PM)",
            onPress: () => {
              Linking.openURL("https://wa.me/9743971315");
              setIsMenuVisible(false);
            },
          },
          {
            id: "settings",
            icon: "settings",
            text: "Settings",
            onPress: () => {
              router.push("/client/settings");
              setIsMenuVisible(false);
            },
          },
          {
            id: "rate_us",
            icon: "star",
            text: "Rate Us",
            onPress: () => {
              router.push("/client/ratenow");
              setIsMenuVisible(false);
            },
          },
        ],
      },
    ],
    [plan],
  ); // Only recreate when plan changes

  return { menuSections };
};

export default MenuItems;
