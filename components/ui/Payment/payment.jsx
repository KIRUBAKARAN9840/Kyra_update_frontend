import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import axios from "axios";

import RazorpayCheckout from "react-native-razorpay";
import axiosInstance from "../../../services/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showToast } from "../../../utils/Toaster";

const BASE_URL = "https://app.fittbot.com";

export default function PaymentScreen() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      showToast({
        type: "error",
        title: "Invalid amount",
        desc: "Please enter a valid amount",
      });
      return;
    }
    setLoading(true);
    try {
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
      }
      const { data: order } = await axios.post(
        `${BASE_URL}/razorpay/payments`,
        {
          amount: Math.round(parseFloat(amount) * 100),
          currency: "INR",
          client_id,
          plan: 12,
        },
      );

      const options = {
        description: "Payment for Fymble Subscription",
        currency: order.currency,
        key: order.key_id,
        amount: order.amount,
        order_id: order.order_id,
        name: "Fymble",
        theme: { color: "#F37254" },
        // Explicitly enable payment methods for iOS
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          emi: true,
          paylater: true,
        },
        // Configure display preferences
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI",
                channels: [
                  { name: "Paytm" },
                  { name: "Google Pay" },
                  { name: "PhonePe" },
                  { name: "Amazon Pay" },
                  { name: "BHIM" },
                ],
              },
            },
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
        remember_customer: true,
      };

      const paymentData = await RazorpayCheckout.open(options);

      // 2️⃣  server verification
      const verifyRes = await axiosInstance.post(
        `${BASE_URL}/razorpay/verify`,
        {
          order_id: paymentData.razorpay_order_id,
          payment_id: paymentData.razorpay_payment_id,
          signature: paymentData.razorpay_signature,
        },
      );

      if (verifyRes.data.status === "captured") {
        showToast({
          type: "success",
          title: "Payment Successful",
          desc: `ID: ${paymentData.razorpay_payment_id}`,
        });
      } else if (verifyRes.data.status === "authorized") {
        showToast({
          type: "info",
          title: "Processing",
          desc: "We are verifying your payment. You will be notified soon.",
        });
      } else {
        showToast({
          type: "error",
          title: "Failed",
          desc: "Payment failed or was cancelled. Try again.",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: err?.message || "Something went wrong. Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Make Payment</Text>

      <Text style={styles.label}>Enter amount (₹):</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="e.g. 499"
        value={amount}
        onChangeText={setAmount}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#F37254" style={styles.loader} />
      ) : (
        <TouchableOpacity
          style={styles.payButton}
          onPress={handlePayment}
          activeOpacity={0.8}
        >
          <Text style={styles.payButtonText}>Pay Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 25,
    borderRadius: 8,
    fontSize: 16,
  },
  payButton: {
    backgroundColor: "#F37254",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  payButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  loader: {
    marginVertical: 20,
  },
});
