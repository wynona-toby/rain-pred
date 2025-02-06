import React, { useState } from "react";
import { View, Text, Button, ActivityIndicator, StyleSheet, TextInput, ScrollView } from "react-native";
import { fetchWeather, getCoordinates } from "./src/fetchrain";

export default function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("");
  const [error, setError] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [explanationVisible, setExplanationVisible] = useState(false); // New state for toggling visibility

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
    setWeatherData(data);
    setLoading(false);
  };

  const explainRainfall = () => {
    if (!weatherData) return;

    const todayRain = weatherData.daily.rainSum[0];

    let explanationText = `Based on today's rainfall prediction: \n`;

    if (todayRain > 10) {
      explanationText += `Heavy rainfall is expected today.\n`;
    } else if (todayRain > 0) {
      explanationText += `Light rain is expected today.\n`;
    } else {
      explanationText += `No rain is expected today.\n`;
    }

    explanationText += `\nHow this conclusion was reached: \n`;
    explanationText += `The prediction is based on a combination of historical weather data and current atmospheric conditions, including temperature, humidity, wind speed, and pressure. These factors contribute to the forecast model used to predict rainfall. The forecast model applies statistical algorithms and machine learning techniques trained on large datasets of historical weather patterns. The model incorporates real-time data to ensure accuracy in prediction.\n`;

    explanationText += `\nPreferred Activities: \n`;
    if (todayRain > 10) {
      explanationText += `- Stay indoors or plan indoor activities like reading, cooking, or watching movies. \n`;
    } else if (todayRain > 0) {
      explanationText += `- You can still enjoy some outdoor activities, but carry an umbrella just in case. \n`;
    } else {
      explanationText += `- Ideal for outdoor activities like sports, walks, or sightseeing. \n`;
    }
    setExplanation(explanationText);
    setExplanationVisible(!explanationVisible); // Toggle explanation visibility
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
            🌧️ {weatherData.daily.rainSum[0]} mm
          </Text>

          {/* Other Details Below */}
          <View style={styles.details}>
            <Text>🌡️ Max Temp: {weatherData.daily.temperature2mMax[0]}°C</Text>
            <Text>❄️ Min Temp: {weatherData.daily.temperature2mMin[0]}°C</Text>
            <Text>☔ Precipitation: {weatherData.daily.precipitationProbabilityMax[0]}%</Text>
            <Text>💨 Wind Speed: {weatherData.daily.windSpeed10mMax[0]} km/h</Text>
          </View>

          {/* Scrollable Cards for Future Days */}
          <Text style={[styles.scrollHeader, styles.boldText]}>Upcoming Days</Text>
          <ScrollView horizontal style={styles.scrollContainer}>
            {weatherData.daily.time.slice(1).map((date, index) => (
              <View key={index} style={styles.card}>
                <Text style={styles.cardDate}>{date.toDateString()}</Text>
                <Text>🌧️ {weatherData.daily.rainSum[index + 1]} mm</Text>
                <Text>🌡️ {weatherData.daily.temperature2mMax[index + 1]}°C</Text>
                <Text>💨 Wind: {weatherData.daily.windSpeed10mMax[index + 1]} km/h</Text>
              </View>
            ))}
          </ScrollView>

          <Button title={explanationVisible ? "Collapse Explanation" : "Explain Rainfall"} onPress={explainRainfall} />
          
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
