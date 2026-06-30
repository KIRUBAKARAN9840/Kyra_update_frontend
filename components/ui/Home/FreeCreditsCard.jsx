import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { dismissFreeCreditsAPI } from "../../../services/clientApi";
import styles from "./homeStyles";

const FreeCreditsCard = ({
  freeCreditsCard,
  setFreeCreditsCard,
  scanEligibilityChecking,
  handleScanFood,
  goCredits,
}) => {
  if (freeCreditsCard == null) return null;

  return (
    <View style={styles.aiCreditsWrapper}>
      {freeCreditsCard.state === "expired" && (
        <TouchableOpacity
          style={{
            position: "absolute",
            top: -10,
            right: -4,
            zIndex: 10,
            backgroundColor: "#00000066",
            borderRadius: 12,
            width: 24,
            height: 24,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
          onPress={() => {
            setFreeCreditsCard(null);
            dismissFreeCreditsAPI();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={14} color="#fff" />
        </TouchableOpacity>
      )}
      <View style={styles.aiCreditsCard}>
        <Image
          source={
            freeCreditsCard.state === "expired"
              ? require("../../../assets/images/home_ai_credits_expired.webp")
              : require("../../../assets/images/home_ai_credits_bg.webp")
          }
          style={StyleSheet.absoluteFill}
          contentFit="fill"
        />
        <View style={[StyleSheet.absoluteFill, styles.aiCreditsContent]}>
          {freeCreditsCard.state === "expired" ? (
            <>
              <Text style={[styles.aiCreditsTitle, { color: "#8B2E2E" }]}>
                Unlock AI Food Calorie Scanner
              </Text>
              <Text style={[styles.aiCreditsSub, { color: "#D63B2F" }]}>
                No credits → no scans → no tracking
              </Text>
              <TouchableOpacity
                style={[styles.aiCreditsBtn, { backgroundColor: "#E8805A" }]}
                activeOpacity={0.8}
                onPress={goCredits}
              >
                <Text style={[styles.aiCreditsBtnText, { color: "#FFFFFF" }]}>
                  Get AI Credits{" "}
                  <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.aiCreditsTitle}>
                {freeCreditsCard.days_left >= 6
                  ? `Scan ${freeCreditsCard.scans_left} Meals for FREE ✨`
                  : freeCreditsCard.days_left >= 4
                    ? `${freeCreditsCard.scans_left} Free Scans Waiting ✨`
                    : freeCreditsCard.days_left >= 2
                      ? "Don't Miss Your Free Scans"
                      : "Last Chance to Use Free Scans ⚠️"}
              </Text>
              <Text style={styles.aiCreditsSub}>
                {freeCreditsCard.days_left === 7
                  ? "Know calories instantly with AI"
                  : freeCreditsCard.days_left <= 2
                    ? "Expires tomorrow"
                    : `${freeCreditsCard.scans_left} scans left · Expires in ${freeCreditsCard.days_left} days`}
              </Text>
              <TouchableOpacity
                style={styles.aiCreditsBtn}
                activeOpacity={0.8}
                onPress={handleScanFood}
                disabled={scanEligibilityChecking}
              >
                <Text style={styles.aiCreditsBtnText}>
                  {scanEligibilityChecking
                    ? "Checking…"
                    : freeCreditsCard.days_left === 7 ||
                        freeCreditsCard.days_left <= 2
                      ? <>Scan My Meal Now{" "}<Ionicons name="arrow-forward" size={13} color="#1a1a2e" /></>
                      : <>Use Free Scan{" "}<Ionicons name="arrow-forward" size={13} color="#1a1a2e" /></>}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

export default FreeCreditsCard;
