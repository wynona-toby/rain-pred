import "dotenv/config";

export default {
  expo: {
    name: "Rain and Flood Predictions",
    slug: "rain-flood-predictions",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      OPENWEATHER_API_KEY: process.env.EXPO_OPENWEATHER_API_KEY,
      AI_API_KEY: process.env.GEN_AI_API_KEY,
      BACKEND: process.env.EXPO_BACKEND
    },
  },
};

console.log("OPENWEATHER_API_KEY Key:", process.env.EXPO_OPENWEATHER_API_KEY);
console.log("AI Key:", process.env.GEN_AI_API_KEY);
console.log("BACKEND Key:", process.env.EXPO_BACKEND);
