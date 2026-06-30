import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRewardProgramDashboardAPI } from "../../services/clientApi";
import { showToast } from "../../utils/Toaster";

const RewardDashboard = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [entries, setEntries] = useState([]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await getRewardProgramDashboardAPI();
      if (response?.status === 200) {
        setDashboardData(response.data);
        setEntries(response.data?.entries || []);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to load dashboard",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Get counts from API data
  const entriesByMethod = dashboardData?.entries_by_method || {
    dailypass: { count: 0, max: 100 },
    session: { count: 0, max: 100 },
    subscription: { count: 0, max: 15 },
    gym_membership: { count: 0, max: 15 },
    nutrition: { count: 0, max: 15 },
    ai_scanner: { count: 0, max: 4 },
    ai_diet_coach: { count: 0, max: 4 },
    referral: { count: 0, max: 25 },
  };

  // Filter entries by method
  const getEntriesByMethod = (method) => {
    return entries.filter((e) => e.method === method);
  };

  // Calculate total entries
  const totalEntries = dashboardData?.total_entries || 0;

  const cardData = [
    {
      id: "total",
      title: "Total Entries",
      icon: "trophy-outline",
      color: "#FF5757",
      count: totalEntries,
      isTotal: true,
    },
    {
      id: "dailypass",
      title: "Daily Pass Entries",
      icon: "card-outline",
      color: "#FF5757",
      count: entriesByMethod.dailypass?.count || 0,
      max: entriesByMethod.dailypass?.max || 100,
      entries: getEntriesByMethod("dailypass"),
    },
    {
      id: "session",
      title: "Fitness Class Entries",
      icon: "fitness-outline",
      color: "#FF8C00",
      count: entriesByMethod.session?.count || 0,
      max: entriesByMethod.session?.max || 100,
      entries: getEntriesByMethod("session"),
    },
    {
      id: "membership",
      title: "Membership Entries",
      icon: "id-card-outline",
      color: "#1E88E5",
      count: entriesByMethod.gym_membership?.count || 0,
      max: entriesByMethod.gym_membership?.max || 15,
      entries: getEntriesByMethod("gym_membership"),
    },
    {
      id: "nutrition",
      title: "Nutrition Plan Entries",
      icon: "nutrition-outline",
      color: "#9C27B0",
      count: entriesByMethod.nutrition?.count || 0,
      max: entriesByMethod.nutrition?.max || 15,
      entries: getEntriesByMethod("nutrition"),
    },
    {
      id: "ai_scanner",
      title: "AI Scanner Entries",
      icon: "scan-outline",
      color: "#00BCD4",
      count: entriesByMethod.ai_scanner?.count || 0,
      max: entriesByMethod.ai_scanner?.max || 4,
      entries: getEntriesByMethod("ai_scanner"),
    },
    {
      id: "ai_diet_coach",
      title: "AI Diet Coach Entries",
      icon: "chatbubble-ellipses-outline",
      color: "#E91E63",
      count: entriesByMethod.ai_diet_coach?.count || 0,
      max: entriesByMethod.ai_diet_coach?.max || 4,
      entries: getEntriesByMethod("ai_diet_coach"),
    },
    {
      id: "referral",
      title: "Referral Entries",
      icon: "people-outline",
      color: "#4CAF50",
      count: entriesByMethod.referral?.count || 0,
      max: entriesByMethod.referral?.max || 25,
      entries: getEntriesByMethod("referral"),
    },
  ];

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/client/rewardprogram");
        return true;
      },
    );

    return () => backHandler.remove();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const renderEntryItem = (item, type, index) => {
    // Shorten UUID for display (first 8 chars)
    const shortId = item.entry_id?.substring(0, 8)?.toUpperCase() || "N/A";

    return (
      <View style={modalStyles.entryItem}>
        <View style={modalStyles.entryHeader}>
          <View style={modalStyles.serialBadge}>
            <Text style={modalStyles.serialText}>#{index + 1}</Text>
          </View>
          <View style={modalStyles.entryIdContainer}>
            <Text style={modalStyles.entryIdLabel}>Entry ID</Text>
            <Text style={modalStyles.entryIdValue}>{shortId}</Text>
          </View>
        </View>
        <View style={modalStyles.entryDetails}>
          <View style={modalStyles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={modalStyles.detailLabel}>Purchased:</Text>
            <Text style={modalStyles.detailValue}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const Card = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => !item.isTotal && setSelectedType(item)}
      activeOpacity={item.isTotal ? 1 : 0.7}
      disabled={item.isTotal}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={20} color="#fff" />
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.cardCount, { color: item.color }]}>
          {item.count}
        </Text>
        {!item.isTotal && (
          <Ionicons name="chevron-forward" size={18} color="#999" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, paddingBottom: 12 },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/client/rewardprogram")}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reward Dashboard</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5757" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>About Lucky Draw</Text>
            <Text style={styles.descriptionText}>
              Each entry ID gives you a chance to win in the lucky draw.{"\n"}
              <Text style={styles.descriptionHighlight}>
                More entries = Higher chance of winning!
              </Text>
            </Text>
            <TouchableOpacity
              style={styles.howToGetButton}
              onPress={() => router.push("/client/rewardtc")}
            >
              <Text style={styles.howToGetButtonText}>How to get entries?</Text>
              <Ionicons name="arrow-forward" size={16} color="#FF5757" />
            </TouchableOpacity>
          </View>

          {/* Cards */}
          <View style={styles.cardsContainer}>
            {cardData.map((item) => (
              <Card key={item.id} item={item} />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Entries Modal */}
      <Modal
        visible={selectedType !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedType(null)}
      >
        <View style={modalStyles.modalContainer}>
          <View
            style={[modalStyles.modalContent, { paddingBottom: insets.bottom }]}
          >
            {/* Modal Header */}
            <View style={[modalStyles.modalHeader]}>
              <TouchableOpacity onPress={() => setSelectedType(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={modalStyles.modalTitle}>{selectedType?.title}</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Entries List */}
            {selectedType?.entries && selectedType.entries.length > 0 ? (
              <FlatList
                data={selectedType.entries}
                keyExtractor={(item, index) =>
                  item.entry_id || index.toString()
                }
                renderItem={({ item, index }) =>
                  renderEntryItem(item, selectedType.id, index)
                }
                contentContainerStyle={modalStyles.entriesList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={modalStyles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={48} color="#CCC" />
                <Text style={modalStyles.emptyText}>No entries found</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default RewardDashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,

    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  descriptionContainer: {
    backgroundColor: "#fff",
    marginTop: 10,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    paddingHorizontal: 10,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  descriptionText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  descriptionHighlight: {
    fontWeight: "600",
    color: "#FF5757",
  },
  howToGetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF5757",
  },
  howToGetButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF5757",
    marginRight: 6,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 70,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardCount: {
    fontSize: 24,
    fontWeight: "700",
  },
});

const modalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  entriesList: {
    padding: 16,
    gap: 12,
  },
  entryItem: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  serialBadge: {
    backgroundColor: "#FF5757",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  serialText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  entryIdContainer: {
    flex: 1,
  },
  entryIdLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 2,
  },
  entryIdValue: {
    fontSize: 15,
    color: "#333",
    fontWeight: "700",
    letterSpacing: 1,
  },
  entryDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
  },
});
