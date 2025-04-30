import { GoogleGenerativeAI } from "@google/generative-ai";
import Constants from "expo-constants";
const OPENWEATHER_API_KEY = Constants.expoConfig?.extra?.OPENWEATHER_API_KEY;
const AI_API_KEY = Constants.expoConfig?.extra?.AI_API_KEY;
const BACKEND = Constants.expoConfig?.extra?.BACKEND;

const genAI = new GoogleGenerativeAI(AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


// Function to get latitude & longitude from city name
export const getCoordinates = async (city: string) => {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${OPENWEATHER_API_KEY}`
    );
    const data = await response.json();
    if (data.length === 0) throw new Error("City not found");
    return { latitude: data[0].lat, longitude: data[0].lon };
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
};

// Function to get city name from latitude & longitude
export const getCity = async (latitude: number, longitude: number) => {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${OPENWEATHER_API_KEY}`
    );
    const data = await response.json();
    console.log(data)
    if (data.length === 0) throw new Error("Coordinates not found");
    return data;
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
};


//weather data
export const fetchWeather = async (latitude: number, longitude: number) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,rain_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();

    return {
      daily: {
        time: data.daily.time.map((t: string) => new Date(t)),
        temperature2mMax: data.daily.temperature_2m_max,
        temperature2mMin: data.daily.temperature_2m_min,
        rainSum: data.daily.rain_sum,
        precipitationProbabilityMax: data.daily.precipitation_probability_max,
        windSpeed10mMax: data.daily.wind_speed_10m_max,
      },
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
};

// Function to predict rain
export const fetchPredictedWeather = async (
  latitude: number,
  longitude: number
) => {
  try {
    const url = `http://127.0.0.1:5000/predict`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ latitude, longitude }),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();

    return {
      predicted: {
        time: data.dates.map((t: string) => new Date(t)), // Convert string to Date
        precipitation: data.predictions.map((p: number[]) => p[0]),
        rain: data.predictions.map((p: number[]) => p[1]),
        precipitationHours: data.predictions.map((p: number[]) => p[2]),
        riverDischarge: data.predictions.map((p: number[]) => p[3]),
        floodRisk: data.predictions.map(
          (p: number[]) =>
            (p[0] >= 5.0 && p[1] >= 10.0) || p[2] >= 5.0 || p[3] >= 12.0
        ),
      },
    };
  } catch (error) {
    console.error("Error fetching predicted weather:", error);
    return null;
  }
};


// Function for XAI
export const explainAI = async (weatherPrompt: string) => {
  try {
    console.log("Expo Constants: ", Constants.expoConfig?.extra);
    console.log("Gen AI API ", AI_API_KEY);
    console.log("API: ", genAI);
    const result = await model.generateContent(weatherPrompt);
    return result;
  } catch (error) {
    console.error("Could not fetch an explanation:", error);
    return null;
  }
};