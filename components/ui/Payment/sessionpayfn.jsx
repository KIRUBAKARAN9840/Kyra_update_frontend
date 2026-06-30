import axiosInstance from "../../../services/axiosInstance";
import Constants from "expo-constants";

// Generate UUID using Math.random
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const buildCommandUrl = (
  requestId,
  commandPath = "/pay/session_v1/commands/",
) => {
  if (!requestId) return "";
  const base = (axiosInstance.defaults?.baseURL || "").replace(/\/$/, "") || "";
  const path = commandPath.endsWith("/") ? commandPath : `${commandPath}/`;
  return `${base}${path}${requestId}`;
};

const waitForCommandCompletion = async (
  requestId,
  commandPath = "/sessions_payment/commands",
  label = "session command",
) => {
  const commandUrl = buildCommandUrl(requestId, commandPath);
  if (!commandUrl) {
    throw new Error(`Unable to resolve ${label} status URL`);
  }

  const maxAttempts = 20;
  let delayMs = 1500;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data } = await axiosInstance.get(commandUrl, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });

    if (data?.status === "completed") {
      return data?.data || {};
    }

    if (data?.status === "failed") {
      throw new Error(data?.error || `${label} failed. Please try again.`);
    }

    const jitterMs = Math.random() * 300;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(delayMs + jitterMs, 10000)),
    );
    delayMs = Math.min(delayMs * 1.5, 10000);
  }

  throw new Error(
    `${label} is taking longer than expected. Please retry in a moment.`,
  );
};

let RazorpayCheckout;
if (Constants.executionEnvironment !== "storeClient") {
  RazorpayCheckout = require("react-native-razorpay").default;
} else {
  RazorpayCheckout = null;
}

export async function handlePay({
  clientId,
  gymId,
  sessionId,
  sessionsCount,
  reward,
  sessionType,
  scheduledDates,
  schedule_id,
  customSlot,
  trainer_id,
  // offer eligibility flag (for ₹99 session offer)
  is_offer_eligible = false,
}) {
  let orderId = null;

  try {
    if (!gymId) throw new Error("gymId is required");
    if (!clientId) throw new Error("clientId is required");
    if (!sessionId) throw new Error("sessionId is required");
    if (!sessionsCount || Number(sessionsCount) <= 0)
      throw new Error("sessionsCount must be > 0");
    if (!sessionType) throw new Error("sessionType is required");
    if (!scheduledDates || scheduledDates.length === 0)
      throw new Error("scheduledDates is required");

    // Generate idempotency key
    const idempotencyKey = generateUUID();

    // 1) Create session checkout
    const { data: checkoutCommand } = await axiosInstance.post(
      "/sessions_payment/checkout",
      {
        client_id: String(clientId),
        gym_id: Number(gymId),
        session_id: Number(sessionId),
        sessions_count: Number(sessionsCount),
        reward: Boolean(reward),
        idempotency_key: idempotencyKey,
        session_type: sessionType,
        scheduled_dates: scheduledDates,
        schedule_id: schedule_id,
        custom_slot: customSlot,
        trainer_id: trainer_id,
        is_offer_eligible: Boolean(is_offer_eligible),
      },
    );

    const checkout = await waitForCommandCompletion(
      checkoutCommand?.request_id,
      "/sessions_payment/commands",
      "session checkout",
    );

    const {
      orderId: checkoutOrderId,
      razorpayOrderId,
      razorpayKeyId,
      amount,
      currency,
      description,
      reward_applied,
      prefill
    } = checkout || {};

    orderId = checkoutOrderId;

    if (!razorpayOrderId || !razorpayKeyId || !amount) {
      throw new Error("Server did not return a valid Razorpay order");
    }

    // 2) Open Razorpay Checkout
    if (!RazorpayCheckout)
      throw new Error("Razorpay not available on this platform");

    const orderOptions = {
      key: razorpayKeyId,
      order_id: razorpayOrderId,
      amount,
      prefill:prefill,
      currency: currency || "INR",
      name: "Fymble",
      description: description || `${sessionsCount} sessions`,
      notes: { client_id: String(clientId), gym_id: String(gymId) },
      theme: { color: "#0ea5e9" },
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

    const rp = await RazorpayCheckout.open(orderOptions);
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      rp || {};
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      throw new Error("Missing Razorpay response fields");
    }

    // 3) Verify payment
    let verified = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const { data: verifyCommand } = await axiosInstance.post(
          "/sessions_payment/verify",
          {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            reward,
            reward_applied,
          },
          {
            headers: { "Idempotency-Key": String(orderId || razorpayOrderId) },
          },
        );

        const verification = await waitForCommandCompletion(
          verifyCommand?.request_id,
          "/sessions_payment/commands",
          "session verify",
        );

        verified = verification;

        if (verified?.success || verified?.verified) {
          break;
        }

        attempts++;
        if (attempts < maxAttempts) {
          const delayMs = Math.min(4000, 2000 * attempts);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        const delayMs = Math.min(4000, 2000 * attempts);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return { ...verified, orderId };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Payment failed",
      orderId,
      error: true,
    };
  }
}

export default handlePay;
