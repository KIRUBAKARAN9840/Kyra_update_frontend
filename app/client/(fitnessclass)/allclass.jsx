import { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  BackHandler,
} from "react-native";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
  Ionicons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useGuardNav from "../../../hooks/useGuardNav";

const { width } = Dimensions.get("window");

const FITNESS_CLASSES = [
  {
    id: 4,
    name: "Zumba",
    internal: "zumba",
    icon: { set: "MaterialCommunityIcons", name: "dance-ballroom" },
    color: "#FF6B9D",
    bg: "#FFE8F0",
  },
  {
    id: 9,
    name: "Pilates",
    internal: "pilates",
    icon: { set: "MaterialCommunityIcons", name: "yoga" },
    color: "#8B5CF6",
    bg: "#F0EBFF",
  },
  {
    id: 3,
    name: "Yoga",
    internal: "yoga",
    icon: { set: "MaterialCommunityIcons", name: "meditation" },
    color: "#10B981",
    bg: "#E3F9EF",
  },
  {
    id: 12,
    name: "Dance",
    internal: "dance",
    icon: { set: "MaterialCommunityIcons", name: "dance-pole" },
    color: "#F59E0B",
    bg: "#FEF3DC",
  },
  {
    id: 6,
    name: "Aerobic",
    internal: "aerobic",
    icon: { set: "MaterialCommunityIcons", name: "run-fast" },
    color: "#EF4444",
    bg: "#FEE4E4",
  },
  {
    id: 15,
    name: "Martial Arts",
    internal: "karate",
    icon: { set: "MaterialCommunityIcons", name: "karate" },
    color: "#DC2626",
    bg: "#FEE2E2",
  },
  {
    id: 5,
    name: "Boxing",
    internal: "boxing",
    icon: { set: "MaterialCommunityIcons", name: "boxing-glove" },
    color: "#7C3AED",
    bg: "#EDE4FF",
  },
  {
    id: 13,
    name: "Swimming",
    internal: "swimming",
    icon: { set: "MaterialCommunityIcons", name: "swim" },
    color: "#0EA5E9",
    bg: "#E0F2FE",
  },
  {
    id: 16,
    name: "Gymnastics",
    internal: "gymnastics",
    icon: { set: "MaterialCommunityIcons", name: "gymnastics" },
    color: "#D946EF",
    bg: "#FBE8FE",
  },
];

const IconSets = {
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
  Ionicons,
};

const ClassIcon = ({ icon, color, size = 24 }) => {
  const IconComponent = IconSets[icon.set] || MaterialCommunityIcons;
  return <IconComponent name={icon.name} size={size} color={color} />;
};

const AllClass = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const guardNav = useGuardNav();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.push("/client/home");
        return true;
      },
    );
    return () => backHandler.remove();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      {/* Header — same as listgyms.jsx */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => guardNav(() => router.push("/client/home"))}
          style={styles.headerButton}
        >
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Select Your Fitness Class</Text>

        {/* Earn 200 coin button */}
        <TouchableOpacity
          style={styles.earnButton}
          activeOpacity={0.8}
          onPress={() => guardNav(() => router.push("/client/referral"))}
        >
          <View style={styles.coinGifContainer}>
            <Image
              source={require("../../../assets/gif/coin.gif")}
              style={styles.coinGif}
              contentFit="cover"
            />
          </View>
          <View>
            <Text style={styles.earnLabel}>Earn</Text>
            <Text style={styles.earnAmount}>₹100</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration image */}
        <View style={styles.imageWrapper}>
          <Image
            source={require("../../../assets/images/fitness_class/allclass.webp")}
            style={styles.classImage}
            contentFit="contain"
          />
        </View>

        {/* Bottom text */}
        <View style={styles.bottomText}>
          <Text style={styles.bottomTitle}>
            What would you like to try today?
          </Text>
        </View>

        {/* Personal Trainer Button — prominent CTA */}
        <View style={styles.ptContainer}>
          <TouchableOpacity
            style={styles.ptButton}
            activeOpacity={0.85}
            onPress={() =>
              guardNav(() => router.push("/client/(pt)/listtrainers"))
            }
          >
            <View style={styles.ptIconWrap}>
              <FontAwesome5 name="dumbbell" size={18} color="#FF5757" />
            </View>
            <View style={styles.ptTextWrap}>
              <Text style={styles.ptTitle}>Personal Trainer</Text>
              <Text style={styles.ptSubtitle}>
                Book a 1-on-1 session with expert trainers
              </Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Class Tabs — 3 per row */}
        <View style={styles.tabsContainer}>
          {Array.from(
            { length: Math.ceil(FITNESS_CLASSES.length / 3) },
            (_, rowIdx) => (
              <View key={rowIdx} style={styles.tabRow}>
                {FITNESS_CLASSES.slice(rowIdx * 3, rowIdx * 3 + 3).map(
                  (cls) => (
                    <TouchableOpacity
                      key={cls.id}
                      style={[styles.tab, { borderColor: cls.color + "40" }]}
                      activeOpacity={0.75}
                      onPress={() =>
                        guardNav(() =>
                          router.push({
                            pathname: "/client/(fitnessclass)/listclass",
                            params: {
                              session_id: cls.id,
                              session_name: cls.name,
                            },
                          }),
                        )
                      }
                    >
                      <View
                        style={[styles.iconCircle, { backgroundColor: cls.bg }]}
                      >
                        <ClassIcon icon={cls.icon} color={cls.color} />
                      </View>
                      <Text style={styles.tabText}>{cls.name}</Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            ),
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default AllClass;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // ── Header (same as listgyms) ────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  earnButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#FFD580",
  },
  coinGifContainer: {
    width: 28,
    height: 28,
  },
  coinGif: {
    position: "absolute",
    width: 50,
    height: 50,
    top: -14,
    left: -14,
  },
  earnLabel: {
    fontSize: 11,
    color: "#FF5757",
    fontWeight: "600",
  },
  earnAmount: {
    fontSize: 14,
    color: "#FF5757",
    fontWeight: "700",
  },

  // ── Scroll ───────────────────────────────────────────────────────
  scrollContent: {
    paddingBottom: 40,
  },

  // ── Personal Trainer CTA ─────────────────────────────────────────
  ptContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  ptButton: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#FF5757",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  ptIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  ptTextWrap: {
    flex: 1,
  },
  ptTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 2,
  },
  ptSubtitle: {
    fontSize: 11,
    color: "rgba(0,0,0,0.85)",
    fontWeight: "500",
  },

  // ── Section header ───────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 4,
    gap: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E5",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
    letterSpacing: 1.2,
  },

  // ── Class Tabs ───────────────────────────────────────────────────
  tabsContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
  },
  tab: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EFEFEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 12,
    color: "#1A1A1A",
    fontWeight: "600",
    textAlign: "center",
  },

  // ── Illustration ─────────────────────────────────────────────────
  imageWrapper: {
    width: width,
    aspectRatio: 1.5,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  classImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignSelf: "center",
  },

  // ── Bottom text ──────────────────────────────────────────────────
  bottomText: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 8,
  },
  bottomTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 0,
  },
  bottomSubtitle: {
    fontSize: 12,
    color: "#888888",
    textAlign: "center",
    lineHeight: 18,
  },
});
