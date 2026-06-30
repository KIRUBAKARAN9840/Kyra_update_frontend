import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
  BackHandler,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSidebarDataAPI } from "../../services/clientApi";

const AccountPage = () => {
  const insets = useSafeAreaInsets();
  const routerHook = useRouter();
  const router = useRouter();
  const [sidebarData, setSidebarData] = useState(null);

  const userName = sidebarData?.client_name || "NA";
  const userPhone = sidebarData?.phone_number || "NA";
  const credits = sidebarData?.credits ?? 0;
  const isUnlimited = sidebarData?.is_unlimited === true;
  const isHeaderLoading = sidebarData === null;

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        routerHook.replace("/client/home");
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );
      return () => backHandler.remove();
    }, []),
  );

  useEffect(() => {
    getSidebarDataAPI().then((res) => {
      if (res?.status === 200) setSidebarData(res);
    });
  }, []);
  const bookingItems = [
    {
      id: "dailypass",
      icon: "calendar",
      text: "Daily Pass\n& Classes",
      onPress: () => routerHook.push("/client/allpass"),
    },
    {
      id: "gym_membership",
      icon: "barbell",
      text: "Gym\nMembership",
      onPress: () => routerHook.push("/unpaid/activateaccount"),
    },

    {
      id: "nutrition_plan",
      iconImage: require("../../assets/images/header/nutrition.png"),
      text: "Nutrition\nPlan",
      onPress: () =>
        routerHook.push({
          pathname: "/client/(tabs)/diet",
          params: { forceChoose: "true" },
        }),
    },
  ];

  const menuSections = [
    {
      id: "account",
      title: "Account",
      items: [
        {
          id: "profile",
          icon: "person",
          text: "My Profile",
          onPress: () => routerHook.push("/client/profile"),
        },
      ],
    },
    {
      id: "payments",
      title: "Payments & Rewards",
      items: [
        {
          id: "rewards",
          icon: "gift",
          text: "Reward Program",
          onPress: () => routerHook.push("/client/rewardprogram"),
        },
        {
          id: "history",
          icon: "wallet",
          text: "Purchase History",
          onPress: () => routerHook.push("/client/purchasehistory"),
        },
        {
          id: "refer",
          icon: "person-add",
          text: "Refer and Earn",
          onPress: () => routerHook.push("/client/referral"),
        },
      ],
    },
    {
      id: "support",
      title: "App & Support",
      items: [
        {
          id: "help",
          iconImage: require("../../assets/images/header/support.png"),
          text: "Help & Support",
          onPress: () => routerHook.push("/client/help"),
        },
        {
          id: "settings",
          icon: "settings",
          text: "Settings",
          onPress: () => routerHook.push("/client/settings"),
        },
        {
          id: "rate_us",
          icon: "star",
          text: "Rate Us",
          onPress: () => routerHook.push("/client/ratenow"),
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Floating back button */}
      <TouchableOpacity
        onPress={() => routerHook.replace("/client/home")}
        style={[styles.floatingBack, { top: insets.top + 12 }]}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={18} color="#1A1A1A" />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingLeft: 36 }}>
          {isHeaderLoading ? (
            <>
              <View style={styles.skeletonName} />
              <View style={styles.skeletonPhone} />
            </>
          ) : (
            <>
              <Text style={styles.headerName}>{userName}</Text>
              <Text style={styles.headerPhone}>{userPhone}</Text>
            </>
          )}
        </View>
        <TouchableOpacity
          style={styles.earnBtn}
          activeOpacity={0.8}
          onPress={() => router.push("/client/credits")}
        >
          <Image
            source={require("../../assets/images/credit.png")}
            style={styles.earnIcon}
            contentFit="contain"
          />
          <View>
            <Text style={styles.earnLabel}>AI Credits</Text>
            <Text style={styles.earnAmount}>{isUnlimited ? "Unlimited" : (credits ?? 0)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Bookings & Plans</Text>
        <View style={styles.bookingsGrid}>
          {bookingItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.bookingTile}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.bookingIconWrap}>
                {item.iconImage ? (
                  <Image
                    source={item.iconImage}
                    style={{ width: 28, height: 28 }}
                    contentFit="contain"
                  />
                ) : (
                  <Ionicons name={item.icon} size={28} color="#FF5757" />
                )}
              </View>
              <Text style={styles.bookingTileText}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Other sections — list rows */}
        {menuSections.map((section) => (
          <View key={section.id}>
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, itemIndex) => (
                <View key={item.id}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={item.onPress}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={styles.iconContainer}>
                        {item.iconImage ? (
                          <Image
                            source={item.iconImage}
                            style={{ width: 16, height: 16 }}
                            contentFit="contain"
                          />
                        ) : (
                          <Ionicons
                            name={item.icon}
                            size={16}
                            color="#FF5757"
                          />
                        )}
                      </View>
                      <Text style={styles.menuItemText}>{item.text}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#CCCCCC"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* WhatsApp Support Button */}
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={() => Linking.openURL("https://wa.me/9743971315")}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={26} color="#25D366" />
          <Text style={styles.whatsappText}>
            WhatsApp Support{" "}
            <Text style={styles.whatsappSubText}>(9AM -7PM)</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  floatingBack: {
    position: "absolute",
    left: 14,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  headerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  headerPhone: {
    fontSize: 13,
    color: "#888888",
    marginTop: 2,
  },
  skeletonName: {
    width: 120,
    height: 18,
    borderRadius: 6,
    backgroundColor: "#E8E8E8",
  },
  skeletonPhone: {
    width: 80,
    height: 13,
    borderRadius: 4,
    backgroundColor: "#F0F0F0",
    marginTop: 6,
  },
  earnBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#C7DAFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    position: "relative",
  },
  earnIcon: {
    width: 22,
    height: 22,
  },
  earnLabel: {
    fontSize: 10,
    color: "#525252",
    lineHeight: 13,
  },
  earnAmount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#191919",
    lineHeight: 15,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  bookingsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  bookingTile: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  bookingIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFF0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  bookingTileText: {
    fontSize: 12,
    color: "#333333",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 17,
  },
  sectionDivider: {
    height: 8,
    backgroundColor: "#f0f0f09c",
    marginHorizontal: -16,
    marginTop: 8,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B4B4B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: "#FF575733",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: "#333333",
    fontWeight: "400",
  },
  divider: {
    height: 1,
    backgroundColor: "#F5F5F5",
    marginLeft: 60,
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2B9E550D",
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: "#2B9E5533",
  },
  whatsappText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
  },
  whatsappSubText: {
    fontWeight: "400",
    color: "#888888",
  },
});

export default AccountPage;
