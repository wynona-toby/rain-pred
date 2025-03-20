import React, { useState } from "react";
import { View, Text, Button, ActivityIndicator, StyleSheet, TextInput, ScrollView, Alert } from "react-native";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchWeather, getCoordinates, fetchPredictedWeather } from "./src/fetchrain";

export default function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [predictedData, setPredictedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("");
  const [error, setError] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [explanationVisible, setExplanationVisible] = useState(false);

  // Google Generative AI setup
  const genAI = new GoogleGenerativeAI("AIzaSyCRcEF3YEFm9NUH1r_LZEafqadrFdMOgyc");  // Replace with your actual API key
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const getWeather = async () => {
    if (!city) {
      setError("Please enter a city name.");
      return;
    }

    setLoading(true);
    setError(null);

    const location = await getCoordinates(city);
    if (!location) {
      setError("City not found.");
      setLoading(false);
      return;
    }

    const data = await fetchWeather(location.latitude, location.longitude);
    const predicted = await fetchPredictedWeather(location.latitude, location.longitude);
    console.log(predicted.predicted);
    setWeatherData(data);
    setPredictedData(predicted);
    setLoading(false);
  };

  const explainRainfall = async () => {
    if (!weatherData || !predictedData) return;

    // const todayPredRain = predictedData.predicted.rain[0].toFixed(2);
    const todayRain = weatherData.daily.rainSum[0].toFixed(2);
    const todayPrecipitation = predictedData.predicted.precipitation[0].toFixed(2);
    const todayPrecipitationHrs = predictedData.predicted.precipitationHours[0].toFixed(2);
    const todayRiverDischarge = predictedData.predicted.riverDischarge[0].toFixed(2);
    const todayFloodRisk = predictedData.predicted.floodRisk[0];
    const todayTempMax = weatherData.daily.temperature2mMax[0];
    const todayTempMin = weatherData.daily.temperature2mMin[0];
    const todayWindSpeed = weatherData.daily.windSpeed10mMax[0];
    const todayPrecipitationProbability = weatherData.daily.precipitationProbabilityMax[0];

    const weatherPrompt = `
    Given the following weather forecast for today:

    - Rainfall: ${todayRain} mm
    - Precipitation: ${todayPrecipitation} mm
    - Precipitation Probability: ${todayPrecipitationProbability}%
    - Precipitation Hours: ${todayPrecipitationHrs} hours
    - River Discharge: ${todayRiverDischarge} m³/s
    - Max Temperature: ${todayTempMax}°C
    - Min Temperature: ${todayTempMin}°C
    - Wind Speed: ${todayWindSpeed} km/h
    - Flood Risk: ${todayFloodRisk}

    Explain how these factors influence the forecast, the expected weather conditions, and how the probability of rain is determined. Provide recommendations for daily activities based on the forecast, including any precautions for heavy rain, light rain, or no rain.
    Dont include * or ** in your answer
    `;

    try {
      const result = await model.generateContent(weatherPrompt);
      setExplanation(result.response.text());
      setExplanationVisible(true);
    } catch (error) {
      console.error("Error fetching Gemini explanation:", error);
      setExplanation("Could not fetch an explanation from Gemini.");
      setExplanationVisible(true);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Search Bar */}
      <TextInput
        style={styles.input}
        placeholder="Enter city name"
        value={city}
        onChangeText={setCity}
      />
      <Button title="Get Weather" onPress={getWeather} />

      {/* Show Error if City Not Found */}
      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <ActivityIndicator size="large" color="blue" />
      ) : weatherData ? (
        <View style={styles.weatherContainer}>
          {/* Today's Weather */}
          <Text style={[styles.date, styles.boldText]}>
            📅 {weatherData.daily.time[0].toDateString()}
          </Text>

          {/* Centered Rainfall */}
          <Text style={[styles.rainText, styles.boldText]}>
            🌧️ {predictedData.predicted.rain[0].toFixed(2)} mm
          </Text>

          {/* Other Details Below */}
          <View style={styles.details}>
            <Text style={{ color: "red" }}>
              ⚠️ Flood Risk:{" "}
              {predictedData.predicted.floodRisk[0] ? "Yes" : "No"}
            </Text>
            <br />
            <Text>🌡️ Max Temp: {weatherData.daily.temperature2mMax[0]}°C</Text>
            <Text>❄️ Min Temp: {weatherData.daily.temperature2mMin[0]}°C</Text>
            <Text>
              ☔ Precipitation:{" "}
              {predictedData.predicted.precipitation[0].toFixed(2)} mm
            </Text>
            <Text>
              ⌛ Precipitation Hours:{" "}
              {predictedData.predicted.precipitationHours[0].toFixed(2)} hrs
            </Text>
            <Text>
              🌊 River Discharge:{" "}
              {predictedData.predicted.riverDischarge[0].toFixed(2)} m³/s
            </Text>
            <Text>
              💨 Wind Speed: {weatherData.daily.windSpeed10mMax[0]} km/h
            </Text>
          </View>

          {/* Scrollable Cards for Future Days */}
          <Text style={[styles.scrollHeader, styles.boldText]}>
            Upcoming Days
          </Text>
          <ScrollView horizontal style={styles.scrollContainer}>
            {weatherData.daily.time.slice(1).map((date, index) => (
              <View key={index} style={styles.card}>
                <Text style={styles.cardDate}>{date.toDateString()}</Text>
                <Text style={{ color: "red" }}>
                  ⚠️ Flood Risk:{" "}
                  {predictedData.predicted.floodRisk[0] ? "Yes" : "No"}
                </Text>
                <Text>
                  🌧️ {predictedData.predicted.rain[index + 1].toFixed(2)} mm
                </Text>
                <Text>
                  🌡️ {weatherData.daily.temperature2mMax[index + 1]}°C
                </Text>
                <Text>
                  ⌛{" "}
                  {predictedData.predicted.precipitationHours[
                    index + 1
                  ].toFixed(2)}{" "}
                  hrs
                </Text>
                <Text>
                  🌊{" "}
                  {predictedData.predicted.riverDischarge[index + 1].toFixed(2)}{" "}
                  m³/s
                </Text>
                <Text>
                  💨 {weatherData.daily.windSpeed10mMax[index + 1]} km/h
                </Text>
              </View>
            ))}
          </ScrollView>

          <Button
            title={
              explanationVisible ? "Collapse Explanation" : "Explain Rainfall"
            }
            onPress={explainRainfall}
          />

          {explanationVisible && (
            <View style={styles.explanationContainer}>
              <Text style={styles.explanationText}>{explanation}</Text>
            </View>
          )}
        </View>
      ) : (
        <Text>No data available</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: "white",
    width: "100%",
  },
  error: {
    color: "red",
    marginBottom: 10,
  },
  weatherContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    elevation: 5,
    width: "90%",
  },
  date: {
    fontSize: 18,
    marginBottom: 10,
  },
  rainText: {
    fontSize: 40,
    color: "blue",
    marginVertical: 20,
  },
  details: {
    marginTop: 10,
    alignItems: "center",
  },
  scrollHeader: {
    fontSize: 18,
    marginVertical: 20,
  },
  scrollContainer: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  card: {
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 10,
    marginRight: 15,
    width: 150,
    alignItems: "center",
    elevation: 3,
  },
  cardDate: {
    fontWeight: "bold",
    marginBottom: 5,
  },
  explanationContainer: {
    marginTop: 20,
    backgroundColor: "#e1f5fe",
    padding: 15,
    borderRadius: 10,
    width: "100%",
  },
  explanationText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
  },
  boldText: {
    fontWeight: "bold",
  },
});