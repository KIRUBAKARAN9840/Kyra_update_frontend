import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  FlatList,
  Dimensions,
  BackHandler,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import {
  getDailyPassDetailsAPI,
  getMembershipDetailsAPI,
  getSessionsPurchaseHistoryAPI,
} from "../../services/clientApi";
import { showToast } from "../../utils/Toaster";
import AsyncStorage from "@react-native-async-storage/async-storage";

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day} ${month} ${year}`;
};

const GymMembershipCard = ({ item }) => (
  <View style={styles.transactionCard}>
    <View style={styles.cardHeader}>
      <View style={styles.planInfo}>
        <MaskedView
          maskElement={<Text style={styles.planName}>{item?.name}</Text>}
        >
          <LinearGradient
            colors={["#000000", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.4, y: 0 }}
            style={{ justifyContent: "center" }}
          >
            <Text style={[{ opacity: 0 }, styles.planName]}>{item?.name}</Text>
          </LinearGradient>
        </MaskedView>
        <Text style={styles.purchaseDate}>
          Purchased on {formatDate(item?.date)}
        </Text>
        {item?.address && (
          <Text style={styles.gymAddress}>{item?.address}</Text>
        )}
        <Text style={styles.duration}>{item?.months} Months</Text>
      </View>
      {/* <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.status === "active" ? "#4CAF50" : "#FF6B6B",
            },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View> */}
    </View>
    <View style={styles.cardFooter}>
      <Text style={styles.amountText}>₹ {item.amount}</Text>
      <View
        style={[
          styles.typeBadge,
          {
            backgroundColor:
              item.type === "gym_membership" ? "#FFFFFF" : "#FFFFFFF",
          },
        ]}
      >
        <Text style={styles.typeBadgeText}>
          {item.type === "gym_membership" ? "Membership" : "Personal Training"}
        </Text>
      </View>
    </View>
  </View>
);

const DailyPassCard = ({ item }) => (
  <View style={styles.transactionCard}>
    <View style={styles.cardHeader}>
      <View style={styles.planInfo}>
        <MaskedView
          maskElement={<Text style={styles.planName}>{item?.name}</Text>}
        >
          <LinearGradient
            colors={["#000000", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.4, y: 0 }}
            style={{ justifyContent: "center" }}
          >
            <Text style={[{ opacity: 0 }, styles.planName]}>{item?.name}</Text>
          </LinearGradient>
        </MaskedView>
        <Text style={styles.purchaseDate}>
          Purchased on {formatDate(item?.date)}
        </Text>
        {item?.address && (
          <Text style={styles.gymAddress}>{item?.address}</Text>
        )}
        <Text style={styles.duration}>{item?.no_of_days} days</Text>
      </View>
      {/* <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item?.status === "active" ? "#4CAF50" : "#FF6B6B",
            },
          ]}
        >
          <Text style={styles.statusText}>{item?.status}</Text>
        </View>
      </View> */}
    </View>
    <View style={styles.cardFooter}>
      <Text style={styles.amountText}>₹ {item?.amount}</Text>
    </View>
  </View>
);

const SessionCard = ({ item }) => (
  <View style={styles.transactionCard}>
    <View style={styles.cardHeader}>
      <View style={styles.planInfo}>
        <MaskedView
          maskElement={
            <Text style={styles.planName}>
              {item?.session_name?.replace(/_/g, " ").toUpperCase()}
            </Text>
          }
        >
          <LinearGradient
            colors={["#000000", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.4, y: 0 }}
            style={{ justifyContent: "center" }}
          >
            <Text style={[{ opacity: 0 }, styles.planName]}>
              {item?.session_name?.replace(/_/g, " ").toUpperCase()}
            </Text>
          </LinearGradient>
        </MaskedView>
        <Text style={styles.purchaseDate}>
          Purchased on {formatDate(item?.purchased_at)}
        </Text>
        {item?.gym_name && (
          <View style={styles.sessionGymContainer}>
            <MaterialIcons name="location-on" size={14} color="#666" />
            <Text style={styles.sessionGymText}>{item?.gym_name}</Text>
          </View>
        )}
        <Text style={styles.duration}>
          {item?.sessions_count}{" "}
          {item?.sessions_count === 1 ? "Session" : "Sessions"}
        </Text>
      </View>
    </View>
    <View style={styles.cardFooter}>
      <Text style={styles.amountText}>₹ {item?.amount}</Text>
    </View>
  </View>
);

const SkeletonLoader = () => (
  <View style={styles.listContainer}>
    {[1, 2, 3].map((item) => (
      <View key={item} style={styles.skeletonCard}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonLeft}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonText} />
            <View style={styles.skeletonText} />
          </View>
          <View style={styles.skeletonBadge} />
        </View>
        <View style={styles.skeletonFooter}>
          <View style={styles.skeletonAmount} />
        </View>
      </View>
    ))}
  </View>
);

const NoDataState = ({ message }) => (
  <View style={styles.noDataContainer}>
    <MaterialIcons
      name="receipt-long"
      size={64}
      color="#035570"
      opacity={0.3}
    />
    <Text style={styles.noDataText}>{message}</Text>
  </View>
);

const PurchaseHistory = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("gym");
  const [membershipDetails, setMembershipDetails] = useState(null);
  const [dailyPassDetails, setDailyPassDetails] = useState(null);
  const [sessionsDetails, setSessionsDetails] = useState(null);
  const [loadingGym, setLoadingGym] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const fetchMembershipDetails = async () => {
    if (membershipDetails) return;
    try {
      setLoadingGym(true);
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        setLoadingGym(false);
        return;
      }
      const response = await getMembershipDetailsAPI(client_id);
      if (response?.status === 200) {
        setMembershipDetails(response?.data);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Error Fetching Membership Details",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setLoadingGym(false);
    }
  };

  const fetchDailyPassDetails = async () => {
    if (dailyPassDetails) return;
    try {
      setLoadingDaily(true);
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        setLoadingDaily(false);
        return;
      }
      const response = await getDailyPassDetailsAPI(client_id);
      if (response?.status === 200) {
        setDailyPassDetails(response?.data);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Error Fetching Daily Pass Details",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setLoadingDaily(false);
    }
  };

  const fetchSessionsDetails = async () => {
    if (sessionsDetails) return;
    try {
      setLoadingSessions(true);
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        setLoadingSessions(false);
        return;
      }
      const response = await getSessionsPurchaseHistoryAPI(client_id);

      if (response?.status === 200) {
        setSessionsDetails(response?.data);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Error Fetching Sessions Details",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchMembershipDetails();
  }, []);

  useEffect(() => {
    const backAction = () => {
      router.replace("/client/account");
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setDropdownVisible(false);
    if (tab === "daily") {
      fetchDailyPassDetails();
    } else if (tab === "sessions") {
      fetchSessionsDetails();
    }
  };

  const dropdownOptions = [
    { label: "Gym Memberships", value: "gym" },
    { label: "Daily Pass", value: "daily" },
    { label: "Sessions", value: "sessions" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "gym":
        if (loadingGym) {
          return <SkeletonLoader />;
        }
        if (!membershipDetails || membershipDetails.length === 0) {
          return <NoDataState message="No Gym Memberships Purchases Found" />;
        }
        return (
          <FlatList
            data={membershipDetails}
            keyExtractor={(item) => item?.id.toString()}
            renderItem={({ item }) => <GymMembershipCard item={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        );
      case "daily":
        if (loadingDaily) {
          return <SkeletonLoader />;
        }
        if (!dailyPassDetails || dailyPassDetails.length === 0) {
          return <NoDataState message="No Daily Pass Purchase Found" />;
        }
        return (
          <FlatList
            data={dailyPassDetails}
            keyExtractor={(item) => item?.id.toString()}
            renderItem={({ item }) => <DailyPassCard item={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        );
      case "sessions":
        if (loadingSessions) {
          return <SkeletonLoader />;
        }
        if (!sessionsDetails || sessionsDetails.length === 0) {
          return <NoDataState message="No Sessions Purchase Found" />;
        }
        return (
          <FlatList
            data={sessionsDetails}
            keyExtractor={(item) => item?.id.toString()}
            renderItem={({ item }) => <SessionCard item={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/client/account")}
        >
          <Ionicons name="arrow-back" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchase History</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          style={styles.dropdownSelector}
          onPress={() => setDropdownVisible(!dropdownVisible)}
        >
          <Text style={styles.dropdownText}>
            {dropdownOptions.find((opt) => opt.value === activeTab)?.label}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>

        {dropdownVisible && (
          <>
            <View style={styles.dropdownMenu}>
              {dropdownOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    activeTab === option.value && styles.activeDropdownItem,
                  ]}
                  onPress={() => handleTabChange(option.value)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      activeTab === option.value &&
                        styles.activeDropdownItemText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.dropdownBackdrop}
              onPress={() => setDropdownVisible(false)}
            />
          </>
        )}
      </View>

      <View style={styles.contentContainer}>{renderContent()}</View>
    </View>
  );
};

export default PurchaseHistory;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaea",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  headerRight: {
    width: 30,
  },
  dropdownContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    position: "relative",
    zIndex: 1000,
  },
  dropdownSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#363636",
  },
  dropdownMenu: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1001,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  activeDropdownItem: {
    backgroundColor: "#FF575710",
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#363636",
  },
  activeDropdownItemText: {
    color: "#FF5757",
    fontWeight: "600",
  },
  dropdownBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderColor: "#eee",
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  planInfo: {
    flex: 1,
    paddingRight: 12,
  },
  planName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#000000",
  },
  purchaseDate: {
    fontSize: 12,
    color: "#363636",
    marginBottom: 4,
  },
  gymAddress: {
    fontSize: 12,
    color: "#363636",
    marginBottom: 4,
  },
  duration: {
    fontSize: 12,
    color: "#363636",
    fontWeight: "500",
  },
  sessionDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  sessionGymContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  sessionGymText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 7,
  },
  statusText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
    textTransform: "capitalize",
    letterSpacing: 0.4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(3, 85, 112, 0.1)",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#363636",
  },
  typeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  typeBadgeText: {
    fontSize: 10,
    color: "#000000",
    fontWeight: "600",
  },
  skeletonCard: {
    // backgroundColor: "#35AFD619",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderColor: "rgba(3, 85, 112, 0.2)",
    borderWidth: 0.5,
  },
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  skeletonLeft: {
    flex: 1,
    paddingRight: 12,
  },
  skeletonTitle: {
    height: 18,
    backgroundColor: "#D3D3D3",
    borderRadius: 4,
    marginBottom: 8,
    width: "70%",
  },
  skeletonText: {
    height: 12,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 6,
    width: "90%",
  },
  skeletonBadge: {
    height: 24,
    width: 60,
    backgroundColor: "#D3D3D3",
    borderRadius: 7,
  },
  skeletonFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(3, 85, 112, 0.1)",
  },
  skeletonAmount: {
    height: 20,
    backgroundColor: "#D3D3D3",
    borderRadius: 4,
    width: "30%",
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#035570",
    textAlign: "center",
    marginTop: 16,
    opacity: 0.6,
  },
});
