import axiosInstance from "../../../services/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";

const DEFAULT_SKU = "nutri_1m";

// Module-level flag to ensure Purchases.configure() runs only once per app
// lifetime. Re-configuring mid-session can corrupt RevenueCat's internal
// purchase queue state and cause ITEM_NOT_OWNED errors.
let revenueCatConfigured = false;
const ensureRevenueCatConfigured = (apiKey) => {
  if (revenueCatConfigured) return;
  if (!apiKey) throw new Error("Missing RevenueCat API key");
  Purchases.configure({ apiKey });
  revenueCatConfigured = true;
};

const waitForCommandCompletion = async (
  requestId,
  label = "nutrition command",
) => {
  const maxAttempts = 20;
  let delayMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data } = await axiosInstance.get(
      `/api/v2/nutrition_purchase_new/googleplay/commands/${requestId}`,
      { headers: { "ngrok-skip-browser-warning": "true" } },
    );

    if (data?.status === "completed") return data?.result || data?.data || {};
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
 * Handles the full Google Play / RevenueCat purchase flow for nutrition package.
 * No booking date/schedule needed — purchase only grants sessions.
 *
 * @param {object} params
 * @param {function} params.onStep - (stepLabel: string) => void — called at each stage
 * @returns {Promise<{ success: boolean, orderId?: string, message?: string }>}
 */
export async function handleNutritionPay({ onStep, productSku }) {
  const PRODUCT_SKU = productSku || DEFAULT_SKU;
  const step = (label) => {
    if (typeof onStep === "function") onStep(label);
  };

  let orderId = null;

  try {
    // STEP 1 — Initiate purchase
    step("Creating order...");
    const { data: orderCommand } = await axiosInstance.post(
      `/api/v2/nutrition_purchase_new/googleplay/purchase`,
      {
        product_sku: PRODUCT_SKU,
        currency: "INR",
        os: Platform.OS,
      },
      {
        headers: { "ngrok-skip-browser-warning": "true" },
      },
    );

    // STEP 2 — Poll until order is ready
    step("Setting up order...");
    const order = await waitForCommandCompletion(
      orderCommand?.request_id,
      "nutrition order",
    );
    orderId = order?.order_id || null;

    // STEP 3 — Configure RevenueCat (once per app lifetime) & trigger Google Play purchase
    step("Setting up payment...");

    ensureRevenueCatConfigured(order?.api_key);
    await Purchases.logIn(String(order.client_id));
    await Purchases.setAttributes({
      order_id: order.order_id,
      client_id: String(order.client_id),
    });

    step("Processing payment...");
    const offerings = await Purchases.getOfferings();
    const allPackages = Object.values(offerings?.all ?? {}).flatMap(
      (o) => o.availablePackages ?? [],
    );

    const pkg = allPackages.find(
      (p) =>
        p.product?.identifier === PRODUCT_SKU || p.identifier === PRODUCT_SKU,
    );
    if (!pkg) {
      throw new Error(
        `Product "${PRODUCT_SKU}" not found. Available: [${allPackages.map((p) => p.identifier).join(", ")}]`,
      );
    }
    await Purchases.purchasePackage(pkg);

    // STEP 4 — Verify purchase
    step("Confirming payment...");
    const { data: verifyCommand } = await axiosInstance.post(
      `/api/v2/nutrition_purchase_new/googleplay/verify`,
      { order_id: orderId },
      {
        headers: { "ngrok-skip-browser-warning": "true" },
      },
    );

    // STEP 5 — Poll verify status
    const delays = [3000, 5000, 7000, 9000, 10000];
    let verificationResult = null;

    const pollVerify = async () => {
      return await waitForCommandCompletion(
        verifyCommand?.request_id,
        "nutrition verify",
      );
    };

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const result = await pollVerify();
        if (result && (result.captured || result.verified || result.success)) {
          verificationResult = result;
          break;
        }
        if (attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        }
      } catch {
        if (attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        }
      }
    }

    if (verificationResult) {
      step("Done");
      return { success: true, orderId };
    }

    // Not verified after retries — caller should start polling
    return { success: false, pendingPolling: true, orderId };
  } catch (error) {
    if (error.userCancelled) {
      return { success: false, userCancelled: true, orderId };
    }
    return {
      success: false,
      message: error?.message || "Payment failed",
      orderId,
    };
  }
}
