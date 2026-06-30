import { useCallback, useRef, useState } from "react";
import { createGymOrderAPI, verifyGymPaymentAPI } from "../services/clientApi";
import Constants from "expo-constants";

let RazorpayCheckout;

if (Constants.executionEnvironment !== "storeClient") {
  RazorpayCheckout = require("react-native-razorpay").default;
} else {
  RazorpayCheckout = null;
}

export function useGymMembershipCheckout() {
  const [busy, setBusy] = useState(false);
  const abortRef = useRef(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort?.();
    abortRef.current = null;
    setBusy(false);
  }, []);

  const start = useCallback(
    async (opts) => {
      if (busy) return { ok: false, error: "Payment is already in progress." };
      setBusy(true);
      abortRef.current = new AbortController();
      let order_id = null;

      try {
        // 1) Create server order (authoritative)
        const orderRes = await createGymOrderAPI(
          opts.gym_id,
          opts.selectedPlan,
          opts.client_id,
          opts.selectedPlanPrice,
          opts.reward,
          opts.coupon_code,
        );
        const {
          razorpay_order_id,
          razorpay_key_id,
          amount_minor,
          currency,
          display_title,
          reward_applied,
          prefill,
        } = orderRes;

        order_id = orderRes?.order_id;

        // Validate required fields
        if (!razorpay_key_id) {
          return {
            ok: false,
            error:
              "Merchant key not configured properly. Please contact support.",
          };
        }
        if (!razorpay_order_id) {
          return {
            ok: false,
            error: "Order creation failed. Please try again.",
          };
        }

        // 2) Launch Razorpay Checkout
        const checkoutOptions = {
          key: razorpay_key_id,
          order_id: razorpay_order_id,
          amount: amount_minor,
          currency: "INR",
          prefill: prefill,
          name: "Fymble",
          description: "Gym membership/Personal Training",
          theme: { color: opts.themeColor || "#111827" },
          retry: { enabled: true, max_count: 1 },
          notes: {
            gymId: String(opts.gym_id),
            planId: String(opts.selectedPlanId),
          },
          // Explicitly enable payment methods for iOS
          method: {
            upi: true,
            card: true,
            netbanking: true,
            wallet: true,
            emi: true,
            paylater: true,
          },
          // Configure display preferences for UPI apps
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
          // Remember customer for faster checkout
          remember_customer: true,
        };

        const rzpResp = await new Promise((resolve, reject) => {
          RazorpayCheckout.open(checkoutOptions).then(resolve).catch(reject);
        });

        const { razorpay_payment_id, razorpay_signature } = rzpResp || {};
        if (!razorpay_payment_id || !razorpay_signature) {
          return { ok: false, error: "Payment response incomplete." };
        }

        // 3) Verify on backend with retry logic
        let verifyRes = null;
        let attempts = 0;
        const maxAttempts = 6;

        while (attempts < maxAttempts) {
          try {
            verifyRes = await verifyGymPaymentAPI(
              razorpay_payment_id,
              razorpay_order_id,
              razorpay_signature,
              opts.client_id,
              opts.reward,
              reward_applied,
            );

            // If verification is successful and captured, break the loop
            if (verifyRes?.verified && verifyRes?.captured) {
              break;
            }

            // If verified but not captured, retry
            attempts++;
            if (attempts < maxAttempts) {
              // Wait before retrying (exponential backoff: 2s, 4s)
              const delayMs = Math.min(4000, 2000 * attempts);
              await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
          } catch (error) {
            attempts++;
            if (attempts >= maxAttempts) {
              throw error;
            }
            // Wait before retrying on error
            const delayMs = Math.min(4000, 2000 * attempts);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }

        if (verifyRes?.verified && verifyRes?.captured) {
          return { ok: true, data: { ...verifyRes, orderId: order_id } };
        }

        if (
          verifyRes?.status === "failed" ||
          verifyRes?.status === "refunded"
        ) {
          return {
            ok: false,
            error: `Payment ${verifyRes.status}`,
            orderId: order_id,
          };
        }

        return {
          ok: false,
          error: "Payment verification pending. Please check later.",
          orderId: order_id,
        };
      } catch (err) {
        const msg = err?.message || "Payment failed";
        return { ok: false, error: msg, code: err?.status, orderId: order_id };
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  return { start, cancel, busy };
}
