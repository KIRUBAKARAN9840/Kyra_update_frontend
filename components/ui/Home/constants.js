import { Dimensions } from "react-native";

export const { width } = Dimensions.get("window");
export const ps = (n) => Math.round((width / 375) * n);

export const CARD_W = (width - 30) / 2;
export const CARD_GAP = 10;
export const MARQUEE_SPEED = 30;
export const GM_CARD_W = width - 32;
export const GM_AUTOPLAY_MS = 3500;
export const FETCH_COOLDOWN = 30000;

export const SESSION_IMAGES = {
  Aerobic: require("../../../assets/images/home_content/aerobics.webp"),
  Boxing: require("../../../assets/images/home_content/boxing.webp"),
  Dance: require("../../../assets/images/home_content/dance.webp"),
  Gymnastics: require("../../../assets/images/home_content/gymnastics.webp"),
  "Martial Arts": require("../../../assets/images/home_content/martial_arts.webp"),
  "Personal Trainer": require("../../../assets/images/home_content/personal_trainer.webp"),
  Pilates: require("../../../assets/images/home_content/pilates.webp"),
  Swimming: require("../../../assets/images/home_content/swimming.webp"),
  Yoga: require("../../../assets/images/home_content/yoga.webp"),
  Zumba: require("../../../assets/images/home_content/zumba.webp"),
};
export const DEFAULT_SESSION_IMAGE = require("../../../assets/images/home_content/aerobics.webp");

export const HOME_GIF_MAP = {
  falling_gif: "first",
  "99_offer": "second",
  ai_diet: "third",
  dailypass: "fourth",
  ai_diet_coach: "fifth",
  "199_plan": "sixth",
  gym_mate: "seventh",
};

export const getBgColor = (gif) => {
  switch (gif) {
    case "first":
    case "second":
    case "fifth":
    case "sixth":
      return "#C7DAFF";
    case "third":
      return "#20B6BB";
    case "fourth":
      return "#FFF5F5";
    case "seventh":
      return "#FFFFFF";
    default:
      return "#C7DAFF";
  }
};

export const getGifBgColor = (gif) => {
  switch (gif) {
    case "first":
    case "second":
    case "fifth":
    case "sixth":
      return "#C7DAFF";
    case "third":
    case "seventh":
      return "#FFFFFF";
    case "fourth":
      return "#FFF5F5";
    default:
      return "#C7DAFF";
  }
};

export const getNextBatchHours = () => {
  const nowIstMs = Date.now() + 5.5 * 60 * 60 * 1000;
  const istDay = new Date(nowIstMs).getUTCDay();
  return istDay === 6 ? 48 : 24;
};
