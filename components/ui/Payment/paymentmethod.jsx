import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";

const PaymentMethodSelector = ({
  onSelectMethod,
  initialMethod = null,
  showChangeOption = false,
}) => {
  const [paymentMethod, setPaymentMethod] = useState(initialMethod);
  useEffect(() => {
    if (initialMethod) {
      setPaymentMethod(initialMethod);
    }
  }, [initialMethod]);

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    if (onSelectMethod) {
      onSelectMethod(method);
    }
  };

  // If no payment method is selected and change option is not shown,
  // return null to avoid rendering an empty component
  if (!paymentMethod && !showChangeOption) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Selected Payment Method</Text>
        {showChangeOption && (
          <TouchableOpacity onPress={onSelectMethod}>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Razorpay Payment Option */}
      {(paymentMethod === "razorpay" || !paymentMethod) && (
        <TouchableOpacity
          style={[styles.paymentOption]}
          onPress={() => handlePaymentMethodChange("razorpay")}
        >
          <View style={styles.optionContent}>
            <View style={styles.providerContainer}>
              <View style={styles.providerBranding}>
                <Image
                  source={require("../../../assets/images/new_logo.png")}
                  style={styles.providerLogo}
                  resizeMode="contain"
                />
                <Text style={styles.providerName}>Fymble</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Google Play option */}
      {(paymentMethod === "googleplay" || !paymentMethod) && (
        <TouchableOpacity
          style={[styles.paymentOption]}
          onPress={() => handlePaymentMethodChange("googleplay")}
        >
          <View style={styles.optionContent}>
            <View style={styles.providerContainer}>
              <View style={styles.providerBranding}>
                <Image
                  source={require("../../../assets/images/googleplay.png")}
                  style={styles.providerLogo}
                  resizeMode="contain"
                />
                <Text style={styles.providerName}>Google Play</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  changeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FF5757",
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 10,
    marginBottom: 6,
    overflow: "hidden",
  },
  paymentOptionSelected: {
    borderColor: "#FF5757",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingVertical: 10,
  },
  radioContainer: {
    marginRight: 15,
  },
  radioOuter: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#DDD",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#FF5757",
  },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: "#FF5757",
  },
  providerContainer: {
    flex: 1,
  },
  providerBranding: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerLogo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  providerName: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  paymentMethodsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  methodLogo: {
    width: 32,
    height: 20,
    marginRight: 4,
  },
  moreText: {
    fontSize: 12,
    color: "#777",
  },
  disclaimerContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FF5757",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
});

export default PaymentMethodSelector;
