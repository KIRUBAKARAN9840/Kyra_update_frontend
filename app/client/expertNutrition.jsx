import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Dimensions,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useState, useRef } from "react";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { handleNutritionRazorpay } from "../../components/ui/Payment/nutritionRazorpayfn";

const { width } = Dimensions.get("window");
const ps = (n) => Math.round((width / 375) * n);

// ── Data ──

const WHATS_INCLUDED = [
  "1 Hour Personalised Nutrition Guidance",
  "Personalised Nutritional Guidance",
  "Mindful Eating Strategies",
  "Goal-Based Recommendations",
  "Sustainable Lifestyle Changes",
];

const WHY_MATTERS = [
  { icon: "body-outline", title: "Weight\nManagement" },
  { icon: "trending-up-outline", title: "Muscle Growth\n& Recovery" },
  { icon: "flash-outline", title: "Better Energy\nLevels" },
  { icon: "nutrition-outline", title: "Improved\nDigestion" },
  { icon: "moon-outline", title: "Better Sleep\nQuality" },
  { icon: "fitness-outline", title: "Enhanced\nPerformance" },
];

const HOW_IT_WORKS = [
  {
    icon: "card-outline",
    title: "Payment",
    desc: "Complete your purchase securely",
  },
  {
    icon: "calendar-outline",
    title: "Book Slot",
    desc: "Pick a convenient date & time",
  },
  {
    icon: "videocam-outline",
    title: "Join Consultation",
    desc: "Connect with your expert live",
  },
  {
    icon: "sparkles-outline",
    title: "Get Personalised Guidance",
    desc: "Receive recommendations and action plans",
  },
];

const WHO_IS_FOR = [
  "Weight Loss Seekers",
  "Muscle Gain & Body Building",
  "Fitness Enthusiasts",
  "Body Professionals",
  "Wellness Focused Individuals",
  "Anyone Looking for Healthier Lifestyle",
];

const FAQ_DATA = [
  {
    q: "Can I reschedule my consultation?",
    a: "No, you cannot reschedule your consultation. Please choose your slot carefully at the time of booking.",
  },

  {
    q: "Is this suitable for beginners?",
    a: "Absolutely! Our consultations are tailored to your current level, whether you're just starting or have specific advanced goals.",
  },
  {
    q: "What happens after the consultation?",
    a: "You'll receive a summary of recommendations and action plans from your nutrition expert to help you implement the guidance effectively.",
  },
];

const ExpertNutrition = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedFaq, setExpandedFaq] = useState(null);

  // ── Payment state ──
  const [payProcessing, setPayProcessing] = useState(false);
  const [payStep, setPayStep] = useState("");
  const [paySuccess, setPaySuccess] = useState(false);
  const [payFailed, setPayFailed] = useState(false);
  const payInProgress = useRef(false);

  const handlePurchase = async () => {
    if (payInProgress.current) return;
    payInProgress.current = true;
    setPayProcessing(true);
    setPayStep("Initializing...");

    const response = await handleNutritionRazorpay({
      onStep: setPayStep,
      productSku: "nutri_basic",
    });

    payInProgress.current = false;

    if (response?.success) {
      setPayProcessing(false);
      setPaySuccess(true);
    } else if (response?.pendingPolling) {
      setPayProcessing(false);
      setPaySuccess(true);
    } else if (response?.userCancelled) {
      setPayProcessing(false);
    } else {
      setPayProcessing(false);
      setPayFailed(true);
    }
  };

  return (
    <View style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: ps(100) }}
      >
        {/* ── Hero Image (full width, no header, image has button inside) ── */}
        <TouchableOpacity activeOpacity={0.95} onPress={handlePurchase}>
          <Image
            source={require("../../assets/images/home/nutrition.webp")}
            style={s.heroImg}
            contentFit="cover"
          />
        </TouchableOpacity>

        {/* ── Back button overlay on image ── */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.backBtn, { top: insets.top + 12 }]}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        {/* ── About this service ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>About this service</Text>
          <Text style={s.sectionHeading}>
            Transform Your Health Through Better Nutrition
          </Text>
          <Text style={s.sectionDesc}>
            A one-hour personalized session with a certified nutrition expert
            who crafts guidance around your specific goals. Learn mindful eating
            strategies, understand your body's needs, and build sustainable
            habits that actually stick.
          </Text>
        </View>

        {/* ── 3 Feature Cards ── */}
        <View style={s.featureRow}>
          <View style={s.featureCard}>
            <Text style={s.featureMain}>60 min</Text>
            <Text style={s.featureSub}>Session</Text>
          </View>
          <View style={s.featureCard}>
            <Text style={s.featureMain}>Expert</Text>
            <Text style={s.featureSub}>Nutritionist</Text>
          </View>
          <View style={s.featureCard}>
            <Text style={s.featureMain}>1:1</Text>
            <Text style={s.featureSub}>Personal</Text>
          </View>
        </View>

        {/* ── What's Included ── */}
        <View style={s.section}>
          <View style={s.includedCard}>
            <Text style={s.sectionLabel}>Included</Text>
            <Text style={s.sectionHeading}>What's Included</Text>
            {WHATS_INCLUDED.map((item, i) => (
              <View key={i} style={s.checkRow}>
                <Image
                  source={require("../../assets/images/home/nutri_tick.png")}
                  style={s.tickIcon}
                />
                <Text style={s.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Why Nutrition Matters ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Benefits</Text>
          <Text style={s.sectionHeading}>Why Nutrition Matters</Text>
          <View style={s.mattersGrid}>
            {WHY_MATTERS.map((item, i) => (
              <View key={i} style={s.mattersItem}>
                <Ionicons name={item.icon} size={ps(22)} color="#22C55E" />
                <Text style={s.mattersText}>{item.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── How It Works ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Process</Text>
          <Text style={s.sectionHeading}>How It Works</Text>
          {HOW_IT_WORKS.map((item, i) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepIconWrap}>
                <Ionicons name={item.icon} size={ps(20)} color="#22C55E" />
              </View>
              <View style={s.stepTextWrap}>
                <Text style={s.stepTitle}>
                  Step {i + 1} — {item.title}
                </Text>
                <Text style={s.stepDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Who Is This For? ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Audience</Text>
          <Text style={s.sectionHeading}>Who Is This For?</Text>
          <View style={s.chipWrap}>
            {WHO_IS_FOR.map((item, i) => (
              <View key={i} style={s.chip}>
                <Text style={s.chipText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── CTA Banner ── */}
        <TouchableOpacity activeOpacity={0.9} onPress={handlePurchase}>
          <LinearGradient
            colors={["#22C55E", "#15803D"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.ctaBanner}
          >
            <Text style={s.ctaSmall}>Your Journey Starts Here</Text>
            <Text style={s.ctaBig}>
              Small Nutritional Improvements Create Life-Changing Results
            </Text>
            <Text style={s.ctaDesc}>
              Build sustainable habits that improve your health, energy,
              fitness, and overall well-being.
            </Text>
            <View style={s.ctaBtn}>
              <Text style={s.ctaBtnText}>Start Today - ₹199</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── FAQ ── */}
        <View style={s.section}>
          <Text style={s.sectionHeading}>Frequently Asked Questions</Text>
          {FAQ_DATA.map((faq, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
              style={s.faqItem}
            >
              <View style={s.faqHeader}>
                <Text style={s.faqQ}>{faq.q}</Text>
                <Ionicons
                  name={expandedFaq === i ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#666"
                />
              </View>
              {expandedFaq === i && <Text style={s.faqA}>{faq.a}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── Sticky Bottom Bar ── */}
      <View
        style={[
          s.stickyBar,
          { paddingBottom: Math.max(insets.bottom, 16) + 10 },
        ]}
      >
        <View style={s.stickyLeft}>
          <Text style={s.stickyLabel}>Nutrition Consultation</Text>
          <Text style={s.stickyPrice}>₹199</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          style={s.stickyBtn}
          onPress={handlePurchase}
        >
          <Text style={s.stickyBtnText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      {/* ── Processing Modal ── */}
      <Modal visible={payProcessing} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={s.modalTitle}>Processing Payment</Text>
            <Text style={s.modalStep}>{payStep}</Text>
          </View>
        </View>
      </Modal>

      {/* ── Success Modal ── */}
      <Modal visible={paySuccess} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.successCircle}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
            <Text style={s.modalTitle}>Payment Successful!</Text>
            <Text style={s.modalDesc}>
              Your nutrition consultation has been purchased. Book your slot now
              to get started.
            </Text>
            <TouchableOpacity
              style={s.modalBtn}
              onPress={() => {
                setPaySuccess(false);
                router.push("/client/nutritionBooking");
              }}
            >
              <Text style={s.modalBtnText}>Book Your Slot Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setPaySuccess(false);
                router.back();
              }}
            >
              <Text style={s.modalLaterText}>I'll book later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Failed Modal ── */}
      <Modal visible={payFailed} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.successCircle, { backgroundColor: "#EF4444" }]}>
              <Ionicons name="close" size={36} color="#fff" />
            </View>
            <Text style={s.modalTitle}>Payment Failed</Text>
            <Text style={s.modalDesc}>
              Payment could not be processed. Please try again.
            </Text>
            <TouchableOpacity
              style={[s.modalBtn, { backgroundColor: "#EF4444" }]}
              onPress={() => setPayFailed(false)}
            >
              <Text style={s.modalBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ExpertNutrition;

// ── Styles ──
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingBottom: 30,
  },

  // Hero — full width, no margin, aspect ratio 377:420
  heroImg: {
    width: "100%",
    aspectRatio: 365 / 420,
  },

  // Back button floating on top of hero
  backBtn: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  // Sections
  section: {
    marginHorizontal: 16,
    marginTop: ps(28),
  },
  sectionLabel: {
    fontSize: ps(13),
    fontWeight: "600",
    color: "#22C55E",
    marginBottom: ps(4),
  },
  sectionHeading: {
    fontSize: ps(16),
    fontWeight: "700",
    color: "#111827",
    marginBottom: ps(12),
  },
  sectionDesc: {
    fontSize: ps(14),
    color: "#444",
    lineHeight: ps(22),
  },

  // Feature cards
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: ps(20),
    gap: ps(10),
  },
  featureCard: {
    flex: 1,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    paddingVertical: ps(16),
    alignItems: "center",
  },
  featureMain: {
    fontSize: ps(15),
    fontWeight: "700",
    color: "#166534",
  },
  featureSub: {
    fontSize: ps(13),
    color: "#4ADE80",
    marginTop: ps(2),
  },

  // Included card with shadow
  includedCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: ps(16),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ps(12),
  },
  tickIcon: {
    width: ps(22),
    height: ps(22),
    marginRight: ps(10),
  },
  checkText: {
    fontSize: ps(14),
    color: "#333",
    flex: 1,
  },

  // Why matters grid — icon on top, heading below
  mattersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ps(10),
  },
  mattersItem: {
    width: (width - 32 - ps(10)) / 2,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    paddingVertical: ps(14),
    paddingHorizontal: ps(14),
  },
  mattersText: {
    fontSize: ps(13),
    color: "#166534",
    fontWeight: "600",
    marginTop: ps(8),
  },

  // How it works
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: ps(18),
  },
  stepIconWrap: {
    width: ps(40),
    height: ps(40),
    borderRadius: ps(20),
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: ps(12),
    marginTop: 2,
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    fontSize: ps(14),
    fontWeight: "700",
    color: "#111827",
    marginBottom: ps(3),
  },
  stepDesc: {
    fontSize: ps(13),
    color: "#666",
  },

  // Chips
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ps(8),
  },
  chip: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 20,
    paddingVertical: ps(8),
    paddingHorizontal: ps(16),
  },
  chipText: {
    fontSize: ps(13),
    color: "#166534",
    fontWeight: "600",
  },

  // CTA Banner
  ctaBanner: {
    marginHorizontal: 16,
    marginTop: ps(28),
    borderRadius: 16,
    padding: ps(24),
    alignItems: "center",
  },
  ctaSmall: {
    fontSize: ps(13),
    color: "rgba(255,255,255,0.85)",
    marginBottom: ps(4),
  },
  ctaBig: {
    fontSize: ps(20),
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: ps(10),
  },
  ctaDesc: {
    fontSize: ps(13),
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: ps(20),
    marginBottom: ps(16),
  },
  ctaBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: ps(12),
    paddingHorizontal: ps(32),
  },
  ctaBtnText: {
    color: "#15803D",
    fontSize: ps(15),
    fontWeight: "700",
  },

  // FAQ
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: ps(14),
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQ: {
    fontSize: ps(14),
    fontWeight: "600",
    color: "#222",
    flex: 1,
    marginRight: 8,
  },
  faqA: {
    fontSize: ps(13),
    color: "#666",
    lineHeight: ps(20),
    marginTop: ps(8),
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: ps(28),
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: ps(18),
    fontWeight: "700",
    color: "#111",
    marginTop: ps(16),
    textAlign: "center",
  },
  modalStep: {
    fontSize: ps(13),
    color: "#888",
    marginTop: ps(8),
  },
  modalDesc: {
    fontSize: ps(14),
    color: "#555",
    textAlign: "center",
    lineHeight: ps(21),
    marginTop: ps(10),
    marginBottom: ps(20),
  },
  successCircle: {
    width: ps(56),
    height: ps(56),
    borderRadius: ps(28),
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingVertical: ps(14),
    paddingHorizontal: ps(32),
    width: "100%",
    alignItems: "center",
  },
  modalBtnText: {
    color: "#fff",
    fontSize: ps(15),
    fontWeight: "700",
  },
  modalLaterText: {
    color: "#888",
    fontSize: ps(14),
    marginTop: ps(14),
  },

  // Sticky bottom bar
  stickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingTop: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  stickyLeft: {},
  stickyLabel: {
    fontSize: ps(13),
    color: "#22C55E",
    fontWeight: "600",
  },
  stickyPrice: {
    fontSize: ps(22),
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  stickyBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: ps(14),
    paddingHorizontal: ps(32),
  },
  stickyBtnText: {
    color: "#fff",
    fontSize: ps(16),
    fontWeight: "700",
  },
});
