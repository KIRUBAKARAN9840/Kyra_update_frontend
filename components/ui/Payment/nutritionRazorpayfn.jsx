import axiosInstance from "../../../services/axiosInstance";
import Constants from "expo-constants";

const DEFAULT_SKU = "nutri_basic";

let RazorpayCheckout;
if (Constants.executionEnvironment !== "storeClient") {
  RazorpayCheckout = require("react-native-razorpay").default;
} else {
  RazorpayCheckout = null;
}

const buildCommandUrl = (requestId) => {
  if (!requestId) return "";
  const base =
    (axiosInstance.defaults?.baseURL || "").replace(/\/$/, "") || "";
  return `${base}/api/v2/nutrition_purchase_new/razorpay/commands/${requestId}`;
};

const waitForCommandCompletion = async (
  requestId,
  label = "nutrition command",
) => {
  const commandUrl = buildCommandUrl(requestId);
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
      return data?.result || data?.data || {};
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

/**
 * Handles the full Razorpay purchase flow for nutrition consultation.
 *
 * @param {object} params
 * @param {function} params.onStep - (stepLabel: string) => void
 * @param {string}  params.productSku - e.g. "nutri_basic"
 * @returns {Promise<{ success: boolean, orderId?: string, pendingPolling?: boolean, userCancelled?: boolean, message?: string }>}
 */
export async function handleNutritionRazorpay({ onStep, productSku }) {
  const PRODUCT_SKU = productSku || DEFAULT_SKU;
  const step = (label) => {
    if (typeof onStep === "function") onStep(label);
  };

  let orderId = null;

  try {
    // STEP 1 — Create checkout order
    step("Creating order...");

    const idempotencyKey = `nutri_rzp_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const { data: checkoutCommand } = await axiosInstance.post(
      "/api/v2/nutrition_purchase_new/razorpay/checkout",
      {
        product_sku: PRODUCT_SKU,
        currency: "INR",
        idempotency_key: idempotencyKey,
      },
      {
        headers: {
          "Idempotency-Key": idempotencyKey,
          "ngrok-skip-browser-warning": "true",
        },
      },
    );

    // STEP 2 — Poll until checkout order is ready
    step("Setting up order...");
    const checkout = await waitForCommandCompletion(
      checkoutCommand?.request_id,
      "nutrition checkout",
    );

    const {
      order_id: checkoutOrderId,
      key_id,
      provider_order_id,
      amount,
      currency,
      prefill,
      display_title,
    } = checkout || {};

    orderId = checkoutOrderId;

    if (!provider_order_id || !key_id || !amount) {
      throw new Error("Server did not return a valid Razorpay order");
    }

    // STEP 3 — Open Razorpay Checkout
    step("Processing payment...");

    if (!RazorpayCheckout) {
      throw new Error("Razorpay not available on this platform");
    }

    const orderOptions = {
      key: key_id,
      order_id: provider_order_id,
      amount,
      currency: currency || "INR",
      name: "Fymble Nutrition",
      description: display_title || "1 Consultation Session",
      prefill: prefill || {},
      notes: { internal_order_id: String(checkoutOrderId) },
      theme: { color: "#FF5757" },
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
        emi: true,
        paylater: true,
      },
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
          preferences: { show_default_blocks: true },
        },
      },
      retry: { enabled: true, max_count: 3 },
      remember_customer: true,
    };

    const rp = await RazorpayCheckout.open(orderOptions);
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      rp || {};

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      throw new Error("Missing Razorpay response fields");
    }

    // STEP 4 — Verify payment with retries
    step("Confirming payment...");

    let verified = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const verifyKey = `nutri_rzp_verify_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`;

        const { data: verifyCommand } = await axiosInstance.post(
          "/api/v2/nutrition_purchase_new/razorpay/verify",
          {
            order_id: checkoutOrderId,
            razorpay_payment_id,
            razorpay_signature,
            idempotency_key: verifyKey,
          },
          {
            headers: {
              "Idempotency-Key": verifyKey,
              "ngrok-skip-browser-warning": "true",
            },
          },
        );

        const verification = await waitForCommandCompletion(
          verifyCommand?.request_id,
          "nutrition verify",
        );

        verified = verification;

        if (verified?.captured || verified?.verified || verified?.success) {
          break;
        }

        attempts++;
        if (attempts < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(4000, 2000 * attempts)),
          );
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(4000, 2000 * attempts)),
        );
      }
    }

    if (verified?.captured || verified?.verified || verified?.success) {
      step("Done");
      return { success: true, orderId };
    }

    // Not verified after retries — caller should start polling
    return { success: false, pendingPolling: true, orderId };
  } catch (error) {
    if (error?.userCancelled) {
      return { success: false, userCancelled: true, orderId };
    }
    return {
      success: false,
      message: error?.message || "Payment failed",
      orderId,
    };
  }
}
