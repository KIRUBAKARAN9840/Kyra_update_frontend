import { Platform } from "react-native";
import { router } from "expo-router";

// Plan type checkers
export const isPureFreemium = (plan) => {
  return plan === "freemium" || plan === "freemium_gym";
};

export const isOnlyFree = (plan) => {
  return plan === "freemium" && plan !== "freemium_gym";
};
export const isGymFreemium = (plan) => {
  return plan === "freemium_gym";
};

export const isPurePremium = (plan) => {
  return plan === "premium" || plan === "premium_gym";
};

export const isGymPremium = (plan) => {
  return plan === "premium_gym";
};

export const isFittbotPremium = (plan) => {
  return plan === "premium" && plan !== "premium_gym";
};

// Navigation functions based on plan and platform
export const handleFreemiumAccess = (
  plan,
  targetPath = "/client/foodscanner",
) => {
  if (isPureFreemium(plan)) {
    if (Platform.OS === "android") {
      router.push("/client/subscription");
    } else if (Platform.OS === "ios") {
      return;
    }
  } else {
    router.push(targetPath);
  }
};

export const handlePremiumAccess = (
  plan,
  targetPath,
  fallbackPath = "/client/subscription",
) => {
  if (isPurePremium(plan)) {
    router.push(targetPath);
  } else {
    if (Platform.OS === "android") {
      router.push(fallbackPath);
    } else if (Platform.OS === "ios") {
      return;
    }
  }
};

export const handleGymPremiumAccess = (
  plan,
  targetPath,
  fallbackPath = "/client/subscription",
) => {
  if (isGymPremium(plan)) {
    router.push(targetPath);
  } else {
    if (Platform.OS === "android") {
      router.push(fallbackPath);
    } else if (Platform.OS === "ios") {
      return;
    }
  }
};

export const handleGymAccess = (
  plan,
  targetPath,
  fallbackPath = "/client/subscription",
) => {
  if (isGymFreemium(plan) || isGymPremium(plan)) {
    router.push(targetPath);
  } else {
    if (Platform.OS === "android") {
      router.push(fallbackPath);
    } else if (Platform.OS === "ios") {
      return;
    }
  }
};

// Generic access handler
export const handlePlanAccess = (
  plan,
  requiredPlanType,
  targetPath,
  fallbackPath = "/client/subscription",
) => {
  let hasAccess = false;

  switch (requiredPlanType) {
    case "pure_freemium":
      hasAccess = isPureFreemium(plan);
      break;
    case "gym_freemium":
      hasAccess = isGymFreemium(plan);
      break;
    case "pure_premium":
      hasAccess = isPurePremium(plan);
      break;
    case "gym_premium":
      hasAccess = isGymPremium(plan);
      break;
    case "gym_access":
      hasAccess = isGymFreemium(plan) || isGymPremium(plan);
      break;
    default:
      hasAccess = false;
  }

  if (hasAccess) {
    router.push(targetPath);
  } else {
    if (Platform.OS === "android") {
      router.push(fallbackPath);
    } else if (Platform.OS === "ios") {
      return;
    }
  }
};

// Specific functions for common use cases
export const scanFood = (plan) => {
  handleFreemiumAccess(plan, "/client/foodscanner");
};

export const accessGymFeature = (plan, targetPath) => {
  handleGymAccess(plan, targetPath);
};

export const accessPremiumFeature = (plan, targetPath) => {
  handlePremiumAccess(plan, targetPath);
};

export const accessGymPremiumFeature = (plan, targetPath) => {
  handleGymPremiumAccess(plan, targetPath);
};

export const accessGymStudios = (
  plan,
  fallbackPath = "/client/subscription",
) => {
  if (isFittbotPremium(plan)) {
    router.push({
      pathname: "/client/home",
      params: { tab: "Fitness Studios" },
    });
  } else {
    router.push(fallbackPath);
  }
};

//  Usage Examples:
//   import { scanFood, accessGymFeature, handlePlanAccess } from '../config/access';

//   // For food scanning (your current use case)
//   scanFood(plan);

//   // For gym-only features
//   accessGymFeature(plan, "/client/gym-feature");

//   // For premium-only features
//   handlePlanAccess(plan, "pure_premium", "/client/premium-feature");

//   // For gym premium only
//   handlePlanAccess(plan, "gym_premium", "/client/gym-premium-feature");
