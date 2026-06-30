import axiosInstance from "../../../services/axiosInstance";
import Constants from "expo-constants";
import { editDailyPassAPI } from "../../../services/clientApi";

const buildCommandUrl = (
  requestId,
  commandPath = "/pay/dailypass_v2/commands/",
) => {
  if (!requestId) return "";
  const base = (axiosInstance.defaults?.baseURL || "").replace(/\/$/, "") || "";
  const path = commandPath.endsWith("/") ? commandPath : `${commandPath}/`;
  return `${base}${path}${requestId}`;
};

const waitForCommandCompletion = async (
  requestId,
  commandPath = "/pay/dailypass_v2/commands/",
  label = "dailypass command",
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
  gymId,
  clientId,
  dates,
  numberOfUsers,
  reward,
  packSize,
}) {
  let orderId = null;

  try {
    if (!gymId) throw new Error("gymId is required");
    if (!clientId) throw new Error("clientId is required");
    if (!dates?.length) throw new Error("Atleast One day is required");

    // 1) Create unified checkout (server does all pricing & validation)
    const { data: checkoutCommand } = await axiosInstance.post(
      "/pay/dailypass_v2/checkout",
      {
        gymId: Number(gymId),
        clientId: String(clientId),
        dates,
        numberOfUsers,
        reward,
        ...(packSize != null && { packSize: Number(packSize) }),
      },
    );

    const checkout = await waitForCommandCompletion(
      checkoutCommand?.request_id,
      "/pay/dailypass_v2/commands/",
      "dailypass checkout",
    );

    const {
      orderId: checkoutOrderId,
      razorpayOrderId,
      razorpayKeyId,
      amount, // <-- authoritative amount (paise)
      currency,
      description,
      reward_applied,
      prefill,
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
      amount, // paise (from server)
      prefill: prefill,
      currency: currency || "INR",
      name: "Fymble",
      description: description || `${daysTotal} days starting ${startDate}`,
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
                // List of popular UPI apps to show on iOS
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
      // Enable retry for failed payments
      retry: {
        enabled: true,
        max_count: 3,
      },
      // Remember customer for faster checkout
      remember_customer: true,
    };

    const rp = await RazorpayCheckout.open(orderOptions);
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      rp || {};
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      throw new Error("Missing Razorpay response fields");
    }

    // 3) Verify payment (unified verification)
    let verified = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const { data: verifyCommand } = await axiosInstance.post(
          "/pay/dailypass_v2/verify",
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
          "/pay/dailypass_v2/commands/",
          "dailypass verify",
        );

        verified = verification;

        // If verification is successful, break the loop
        if (verified?.success || verified?.verified) {
          break;
        }

        // If it's a failed status, retry
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

    return { ...verified, orderId };
  } catch (error) {
    // Return error with orderId if available
    return {
      success: false,
      message: error?.message || "Payment failed",
      orderId,
      error: true,
    };
  }
}

// ─── Pack-based checkout (7-day, 15-day) ────────────────────────────────────
export async function handlePayPack({ gymId, clientId, packSize, reward }) {
  let orderId = null;

  try {
    if (!gymId) throw new Error("gymId is required");
    if (!clientId) throw new Error("clientId is required");
    if (!packSize) throw new Error("packSize is required");

    // 1) Create checkout
    const { data: checkoutCommand } = await axiosInstance.post(
      "/pay/dailypass_v2/checkout",
      {
        gymId: Number(gymId),
        clientId: String(clientId),
        packSize: Number(packSize),
        reward: !!reward,
      },
    );

    const checkout = await waitForCommandCompletion(
      checkoutCommand?.request_id,
      "/pay/dailypass_v2/commands/",
      "dailypass pack checkout",
    );

    const {
      orderId: checkoutOrderId,
      razorpayOrderId,
      razorpayKeyId,
      amount,
      currency,
      description,
      prefill,
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
      prefill: prefill,
      currency: currency || "INR",
      name: "Fymble",
      description: description || `${packSize} Day Pack`,
      notes: { client_id: String(clientId), gym_id: String(gymId) },
      theme: { color: "#0ea5e9" },
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
          "/pay/dailypass_v2/verify",
          {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
          },
          {
            headers: { "Idempotency-Key": String(orderId || razorpayOrderId) },
          },
        );

        const verification = await waitForCommandCompletion(
          verifyCommand?.request_id,
          "/pay/dailypass_v2/commands/",
          "dailypass pack verify",
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

export async function handlePayUpgrade({
  gymId,
  clientId,
  pass_id,
  days,
  total_upgrade_cost,

  // subscription flags (optional)
  includeSubscription = false,
  selectedPlan = null,

  // optional metadata
  userType = "existing",
  planDetails = null,
}) {
  let orderId = null;

  try {
    if (!gymId) throw new Error("gymId is required");
    if (!clientId) throw new Error("clientId is required");

    if (includeSubscription && !selectedPlan) {
      throw new Error(
        "selectedPlan is required when includeSubscription is true",
      );
    }

    // 1) Create unified checkout (server does all pricing & validation)
    const { data: checkoutCommand } = await axiosInstance.post(
      "/pay/dailypass_v2/upgrade/checkout",
      {
        new_gym_id: Number(gymId),
        client_id: String(clientId),
        pass_id: pass_id,
        remaining_days_count: days,
        delta_minor: total_upgrade_cost,

        // includeSubscription: !!includeSubscription,
        // selectedPlan: includeSubscription ? Number(selectedPlan) : null,

        // userType,
        // planDetails,
      },
    );

    const checkout = await waitForCommandCompletion(
      checkoutCommand?.request_id,
      "/pay/dailypass_v2/commands/",
      "dailypass upgrade checkout",
    );

    const {
      orderId: checkoutOrderId,
      razorpayOrderId,
      razorpayKeyId,
      amount,
      currency,
      description,
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
      amount, // paise (from server)
      currency: currency || "INR",
      name: "Fymble",
      description: description || "Upgrade Pass",
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

    // 3) Verify payment (unified verification)
    let verified = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const { data: verifyCommand } = await axiosInstance.post(
          "/pay/dailypass_v2/upgrade/verify",
          {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            pass_id: pass_id,
          },
          {
            headers: { "Idempotency-Key": String(orderId || razorpayOrderId) },
          },
        );

        verified = await waitForCommandCompletion(
          verifyCommand?.request_id,
          "/pay/dailypass_v2/commands/",
          "dailypass upgrade verify",
        );

        // If verification is successful, break the loop
        if (verified?.success || verified?.verified) {
          break;
        }

        // If it's a failed status, retry
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

    return { ...verified, orderId };
  } catch (error) {
    // Return error with orderId if available
    return {
      success: false,
      message: error?.message || "Payment failed",
      orderId,
      error: true,
    };
  }
}

export async function handlePayEditTopup({
  pass_id,
  client_id,
  new_start_date,
  delta_minor,
}) {
  let orderId = null;

  try {
    if (!pass_id) throw new Error("pass_id is required");
    if (!client_id) throw new Error("client_id is required");
    if (!new_start_date) throw new Error("new_start_date is required");
    if (!delta_minor || Number(delta_minor) <= 0)
      throw new Error("delta_minor must be > 0");

    // 1) Create checkout for edit topup
    const { data: checkoutCommand } = await axiosInstance.post(
      "/pay/dailypass_v2/edit_topup/checkout",
      {
        pass_id: String(pass_id),
        client_id: String(client_id),
        new_start_date: String(new_start_date),
        delta_minor: Number(delta_minor),
      },
    );

    const checkout = await waitForCommandCompletion(
      checkoutCommand?.request_id,
      "/pay/dailypass_v2/commands/",
      "dailypass edit checkout",
    );

    const {
      orderId: checkoutOrderId,
      razorpayOrderId,
      razorpayKeyId,
      amount,
      currency,
      description,
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
      amount, // paise (from server)
      currency: currency || "INR",
      name: "Fymble",
      description: description || `Pass edit - additional payment`,
      notes: { client_id: String(client_id), pass_id: String(pass_id) },
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

    // 3) Verify payment for edit topup
    let verified = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const { data: verifyCommand } = await axiosInstance.post(
          "/pay/dailypass_v2/edit_topup/verify",
          {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            pass_id,
          },
          {
            headers: { "Idempotency-Key": String(orderId || razorpayOrderId) },
          },
        );

        const verification = await waitForCommandCompletion(
          verifyCommand?.request_id,
          "/pay/dailypass_v2/commands/",
          "dailypass edit verify",
        );

        verified = verification;

        // If verification is successful, break the loop
        if (verified?.success || verified?.verified) {
          break;
        }

        // If it's a failed status, retry
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

    // 4) After successful payment verification, update the pass dates
    if (verified?.success || verified?.verified) {
      const editPayload = {
        pass_id: pass_id,
        client_id: client_id,
        new_start_date: new_start_date,
        paid: true,
      };

      const editResponse = await editDailyPassAPI(editPayload);

      if (!editResponse?.pass_id) {
        throw new Error(
          editResponse?.detail || "Failed to update pass after payment",
        );
      }

      return { ...verified, orderId, pass_updated: true };
    }

    return { ...verified, orderId };
  } catch (error) {
    // Return error with orderId if available
    return {
      success: false,
      message: error?.message || "Payment failed",
      orderId,
      error: true,
    };
  }
}

// ─── Credits Razorpay Purchase ───────────────────────────────────────────────

export async function handleCreditsRazorpayPurchase({ clientId, productSku }) {
  let orderId = null;

  try {
    if (!clientId) throw new Error("clientId is required");

    // 1) Create checkout order
    const idempotencyKey = `cr_rzp_order_${clientId}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const { data: checkoutCommand } = await axiosInstance.post(
      "/api/v2/credits/razorpay/checkout",
      {
        product_sku: productSku || "credit_50",
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

    const checkout = await waitForCommandCompletion(
      checkoutCommand?.request_id,
      "/api/v2/credits/razorpay/commands/",
      "credits razorpay checkout",
    );

    const {
      order_id: checkoutOrderId,
      key_id,
      provider_order_id,
      amount,
      currency,
      prefill,
    } = checkout || {};

    orderId = checkoutOrderId;

    if (!provider_order_id || !key_id || !amount) {
      throw new Error("Server did not return a valid Razorpay order");
    }

    // 2) Open Razorpay Checkout
    if (!RazorpayCheckout)
      throw new Error("Razorpay not available on this platform");

    const orderOptions = {
      key: key_id,
      order_id: provider_order_id,
      amount,
      currency: currency || "INR",
      name: "Fymble",
      description: "50 KyraAI Credits",
      prefill: prefill || {},
      notes: { client_id: String(clientId), order_id: String(checkoutOrderId) },
      theme: { color: "#E6A800" },
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

    // 3) Verify payment
    let verified = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const verifyKey = `cr_rzp_verify_${clientId}_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`;

        const { data: verifyCommand } = await axiosInstance.post(
          "/api/v2/credits/razorpay/verify",
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
          "/api/v2/credits/razorpay/commands/",
          "credits razorpay verify",
        );

        verified = verification;

        if (verified?.verified || verified?.captured) {
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

    return { ...verified, orderId };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Payment failed",
      orderId,
      error: true,
      userCancelled: error?.userCancelled ?? false,
    };
  }
}

export default handlePay;
