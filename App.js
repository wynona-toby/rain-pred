import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  ScrollView,
  Dimensions,
  Animated,
  TouchableOpacity,
  Modal,
} from "react-native";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  fetchWeather,
  getCoordinates,
  getCity,
  fetchPredictedWeather,
  explainAI,
} from "./src/fetchrain";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");
const isMobile = width < 768;

export default function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [predictedData, setPredictedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("");
  const [error, setError] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [explanationVisible, setExplanationVisible] = useState(false);
  const [savedLocations, setSavedLocations] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [headerAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [modalVisible, setModalVisible] = useState(false);

  // Google Generative AI setup
  const genAI = new GoogleGenerativeAI(
    "AIzaSyCRcEF3YEFm9NUH1r_LZEafqadrFdMOgyc"
  );
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  useEffect(() => {
    // Request location permissions and get current location
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Permission to access location was denied");
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        const data = await getCity(latitude, longitude);
        console.log("Data: ", data);
        if (data.length > 0) {
          setCity(data[0].name);
          getWeather(data[0].name);
        }
      } catch (error) {
        console.error("Error getting location:", error);
        setError("Could not get your current location");
      }
    })();

    // Animate header on mount
    Animated.spring(headerAnim, {
      toValue: 1,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const animateContent = () => {
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.95);

    // Animate content
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getWeather = async (cityName) => {
    if (!cityName) {
      setError("Please enter a city name.");
      return;
    }

    setLoading(true);
    setError(null);

    const location = await getCoordinates(cityName);
    if (!location) {
      setError("City not found.");
      setLoading(false);
      return;
    }

    const data = await fetchWeather(location.latitude, location.longitude);
    const predicted = await fetchPredictedWeather(
      location.latitude,
      location.longitude
    );

    if (data && predicted) {
      setWeatherData(data);
      setPredictedData(predicted);
      setCity(cityName);

      if (!savedLocations.includes(cityName.toLowerCase())) {
        setSavedLocations([...savedLocations, cityName.toLowerCase()]);
      }

      animateContent();
    }

    setLoading(false);
  };

  const explainRainfall = async () => {
    if (!weatherData || !predictedData) return;

    const todayRain = weatherData.daily.rainSum[0].toFixed(2);
    const todayPrecipitation =
      predictedData.predicted.precipitation[0].toFixed(2);
    const todayRiverDischarge =
      predictedData.predicted.riverDischarge[0].toFixed(2);
    const todayFloodRisk = predictedData.predicted.floodRisk[0];
    const todayTempMax = weatherData.daily.temperature2mMax[0];
    const todayTempMin = weatherData.daily.temperature2mMin[0];
    const todayWindSpeed = weatherData.daily.windSpeed10mMax[0];
    const todayPrecipitationProbability =
      weatherData.daily.precipitationProbabilityMax[0];

    const weatherPrompt = `
    Given the following weather forecast for today:

    - Rainfall: ${todayRain} mm
    - Precipitation: ${todayPrecipitation} mm
    - Precipitation Probability: ${todayPrecipitationProbability}%
    - River Discharge: ${todayRiverDischarge} m³/s
    - Max Temperature: ${todayTempMax}°C
    - Min Temperature: ${todayTempMin}°C
    - Wind Speed: ${todayWindSpeed} km/h
    - Flood Risk: ${todayFloodRisk}

    Explain how these factors influence the forecast, the expected weather conditions, and how the probability of rain is determined. Provide recommendations for daily activities based on the forecast, including any precautions for heavy rain, light rain, or no rain.
    Dont include * or ** in your answer
    `;

    try {
      const result = await explainAI(weatherPrompt);
      setExplanation(result.response.text());
      setExplanationVisible(true);
    } catch (error) {
      console.error("Error fetching Gemini explanation:", error);
      setExplanation("Could not fetch an explanation from Gemini.");
      setExplanationVisible(true);
    }
  };

  const WeatherCard = ({ date, index }) => {
    const isToday = index === 0;
    const getWeatherIcon = (rain, temp) => {
      if (rain > 5) return "🌧️";
      if (rain > 0) return "🌦️";
      if (temp > 30) return "☀️";
      if (temp > 20) return "⛅";
      return "🌤️";
    };

    const rain = predictedData.predicted.rain[index + 1].toFixed(1);
    const temp = weatherData.daily.temperature2mMax[index + 1];
    const weatherIcon = getWeatherIcon(rain, temp);

    return (
      <View style={styles.card}>
        <LinearGradient
          colors={["rgba(255,255,255,0.15)", "rgba(255,255,255,0.05)"]}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardDate}>
              {date.toDateString().split(" ").slice(0, 3).join(" ")}
            </Text>
            <Text style={styles.weatherIcon}>{weatherIcon}</Text>
          </View>

          <View style={styles.cardMainInfo}>
            <Text style={styles.tempText}>{temp}°C</Text>
            <Text style={styles.rainAmount}>{rain} mm</Text>
          </View>

          {predictedData.predicted.floodRisk[index + 1] && (
            <View style={styles.floodWarning}>
              <Text style={styles.floodWarningText}>⚠️ Flood Risk</Text>
            </View>
          )}

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>⌛</Text>
              <Text style={styles.detailText}>
                {predictedData.predicted.precipitationHours[index + 1].toFixed(
                  1
                )}{" "}
                hrs
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>💨</Text>
              <Text style={styles.detailText}>
                {weatherData.daily.windSpeed10mMax[index + 1]} km/h
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🌊</Text>
              <Text style={styles.detailText}>
                {predictedData.predicted.riverDischarge[index + 1].toFixed(1)}{" "}
                m³/s
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>☔</Text>
              <Text style={styles.detailText}>
                {predictedData.predicted.precipitation[index + 1].toFixed(1)} mm
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a237e", "#0d47a1", "#01579b"]}
        style={styles.gradientBackground}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          style={styles.mainScroll}
        >
          {/* Header Section */}
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Rain and Flood Predictions</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={styles.infoButton}
              >
                <MaterialIcons name="info-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>Get accurate predictions</Text>
          </Animated.View>

          {/* Info Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Prediction Information</Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <MaterialIcons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={[styles.modalBody, styles.customScroll]}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.modalBodyContent}
                >
                  <Text style={styles.modalText}>
                    This weather prediction application uses advanced machine
                    learning models and APIs to provide accurate weather
                    forecasts:
                  </Text>
                  <View style={styles.modelDetail}>
                    <Text style={styles.modelTitle}>🤖 AI Model</Text>
                    <Text style={styles.modelDescription}>
                      Powered by Google's Gemini 1.5 Flash model for detailed
                      weather analysis and explanations.
                    </Text>
                  </View>
                  <View style={styles.modelDetail}>
                    <Text style={styles.modelTitle}>🌦️ Weather Data</Text>
                    <Text style={styles.modelDescription}>
                      Utilizes OpenWeather API for real-time weather information
                      and forecasting.
                    </Text>
                  </View>
                  <View style={styles.modelDetail}>
                    <Text style={styles.modelTitle}>🌊 Flood Predictions</Text>
                    <Text style={styles.modelDescription}>
                      Incorporates river discharge data and precipitation
                      patterns to assess flood risks.
                    </Text>
                  </View>
                  <View style={styles.modelDetail}>
                    <Text style={styles.modelTitle}>📍 Location Services</Text>
                    <Text style={styles.modelDescription}>
                      Uses Expo Location for precise geographical positioning
                      and city detection.
                    </Text>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <MaterialIcons
                name="search"
                size={24}
                color="#fff"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Search city..."
                value={city}
                onChangeText={setCity}
                onSubmitEditing={() => getWeather(city)}
                placeholderTextColor="rgba(255,255,255,0.7)"
                returnKeyType="search"
              />
              <TouchableOpacity
                style={styles.currentLocationBtn}
                onPress={async () => {
                  try {
                    let location = await Location.getCurrentPositionAsync({});
                    const { latitude, longitude } = location.coords;

                    const data = await getCity(latitude, longitude);
                    console.log("Data: ", data);
                    if (data.length > 0) {
                      setCity(data[0].name);
                      getWeather(data[0].name);
                    }
                  } catch (error) {
                    setError("Could not get your location");
                  }
                }}
              >
                <MaterialIcons name="my-location" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Saved Locations */}
          {savedLocations.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.savedLocations, styles.customScroll]}
            >
              {savedLocations.map((loc, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.savedLocationChip}
                  onPress={() => getWeather(loc.toLowerCase())}
                >
                  <Text style={styles.savedLocationText}>{loc}</Text>
                  <MaterialIcons
                    name="close"
                    size={16}
                    color="#fff"
                    style={styles.chipIcon}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSavedLocations(
                        savedLocations.filter((_, i) => i !== index)
                      );
                    }}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Error Message */}
          {error && (
            <Animated.View
              style={[
                styles.errorContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Text style={styles.error}>{error}</Text>
            </Animated.View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Fetching weather data...</Text>
            </View>
          ) : weatherData ? (
            <Animated.View
              style={[
                styles.weatherContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                },
              ]}
            >
              {/* Today's Weather */}
              <View style={styles.todayContainer}>
                <Text style={styles.date}>
                  {weatherData.daily.time[0].toDateString()}
                </Text>
                <View style={styles.mainWeatherInfo}>
                  <Text style={styles.temperature}>
                    {weatherData.daily.temperature2mMax[0]}°C
                  </Text>
                  <View>
                    <Text style={styles.rainfall}>
                      Rain: {predictedData.predicted.rain[0].toFixed(1)} mm
                    </Text>
                    <Text style={[styles.rainfall, { fontSize: 18 }]}>
                      Precip:{" "}
                      {predictedData.predicted.precipitation[0].toFixed(1)} mm
                    </Text>
                  </View>
                </View>

                {predictedData.predicted.floodRisk[0] && (
                  <View style={styles.warningBanner}>
                    <MaterialIcons name="warning" size={24} color="#fff" />
                    <Text style={styles.warningText}>Flood Risk Alert</Text>
                  </View>
                )}

                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <MaterialIcons name="thermostat" size={24} color="#fff" />
                    <Text style={styles.detailLabel}>Min/Max Temp</Text>
                    <Text style={styles.detailValue}>
                      {weatherData.daily.temperature2mMin[0]}°C /{" "}
                      {weatherData.daily.temperature2mMax[0]}°C
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MaterialIcons name="waves" size={24} color="#fff" />
                    <Text style={styles.detailLabel}>River Discharge</Text>
                    <Text style={styles.detailValue}>
                      {predictedData.predicted.riverDischarge[0].toFixed(1)}{" "}
                      m³/s
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MaterialIcons name="air" size={24} color="#fff" />
                    <Text style={styles.detailLabel}>Wind Speed</Text>
                    <Text style={styles.detailValue}>
                      {weatherData.daily.windSpeed10mMax[0]} km/h
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MaterialIcons name="access-time" size={24} color="#fff" />
                    <Text style={styles.detailLabel}>Precipitation Hours</Text>
                    <Text style={styles.detailValue}>
                      {predictedData.predicted.precipitationHours[0].toFixed(1)}
                      h
                    </Text>
                  </View>
                </View>
              </View>

              {/* Upcoming Days */}
              <Text style={styles.forecastTitle}>6-Day Forecast</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={[styles.forecastContainer, styles.customScroll]}
                contentContainerStyle={styles.forecastContent}
                snapToInterval={isMobile ? width / 1.2 + 8 : width / 6.8 + 15}
                decelerationRate="fast"
              >
                {weatherData.daily.time.slice(1).map((date, index) => (
                  <WeatherCard key={index} date={date} index={index} />
                ))}
              </ScrollView>

              {/* Explanation Section */}
              <TouchableOpacity
                style={styles.explanationButton}
                onPress={explainRainfall}
              >
                <Text style={styles.explanationButtonText}>
                  {explanationVisible ? "Hide Details" : "Show Details"}
                </Text>
                <MaterialIcons
                  name={explanationVisible ? "expand-less" : "expand-more"}
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>

              {explanationVisible && (
                <Animated.View
                  style={[
                    styles.explanationContainer,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <Text style={styles.explanationText}>{explanation}</Text>
                </Animated.View>
              )}
            </Animated.View>
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="cloud-off" size={64} color="#fff" />
              <Text style={styles.noData}>
                Search for a city to get started
              </Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    minHeight: height,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 40,
  },
  headerContainer: {
    padding: isMobile ? 15 : 20,
    alignItems: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: isMobile ? 28 : 32,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: isMobile ? 14 : 16,
    color: "rgba(255,255,255,0.8)",
  },
  searchSection: {
    paddingHorizontal: isMobile ? 15 : 20,
    marginBottom: isMobile ? 15 : 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 30,
    paddingHorizontal: isMobile ? 15 : 20,
    height: isMobile ? 45 : 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: isMobile ? 14 : 16,
    height: isMobile ? 45 : 50,
    outlineWidth: 0,
  },
  currentLocationBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  savedLocations: {
    paddingHorizontal: isMobile ? 15 : 20,
    marginBottom: isMobile ? 8 : 10,
    maxHeight: isMobile ? 40 : 50,
  },
  savedLocationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: isMobile ? 12 : 15,
    paddingHorizontal: isMobile ? 10 : 12,
    paddingVertical: isMobile ? 4 : 6,
    marginRight: isMobile ? 6 : 8,
    marginBottom: isMobile ? 6 : 8,
  },
  savedLocationText: {
    color: "#fff",
    marginRight: 8,
    textTransform: "capitalize",
    fontSize: isMobile ? 12 : 14,
  },
  chipIcon: {
    opacity: 0.8,
  },
  errorContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: "rgba(244,67,54,0.1)",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
  },
  error: {
    color: "#fff",
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
  weatherContainer: {
    padding: isMobile ? 10 : 20,
  },
  todayContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: isMobile ? 15 : 20,
    marginBottom: 20,
  },
  date: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 15,
    fontWeight: "500",
  },
  mainWeatherInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 15,
    padding: isMobile ? 12 : 15,
  },
  temperature: {
    fontSize: isMobile ? 36 : 42,
    fontWeight: "bold",
    color: "#fff",
  },
  rainfall: {
    fontSize: isMobile ? 20 : 24,
    color: "#fff",
    opacity: 0.9,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244,67,54,0.2)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  warningText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 15,
    padding: isMobile ? 12 : 15,
  },
  detailItem: {
    width: isMobile ? "100%" : "48%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: isMobile ? 10 : 12,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  detailLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: isMobile ? 12 : 13,
    marginTop: 4,
  },
  detailValue: {
    color: "#fff",
    fontSize: isMobile ? 14 : 16,
    fontWeight: "500",
    marginTop: 4,
  },
  forecastTitle: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
    textAlign: "center",
  },
  forecastContainer: {
    marginHorizontal: "auto",
    marginBottom: isMobile ? 15 : 20,
  },
  forecastContent: {
    paddingHorizontal: isMobile ? 10 : 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: isMobile ? "column" : "row",
  },
  explanationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  explanationButtonText: {
    color: "#fff",
    marginRight: 10,
    fontSize: 16,
  },
  explanationContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
  },
  explanationText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 22,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  noData: {
    color: "#fff",
    fontSize: 18,
    marginTop: 20,
    textAlign: "center",
  },
  card: {
    width: isMobile ? width / 1.2 : width / 6.8,
    margin: "auto",
    marginRight: isMobile ? 8 : 15,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 10,
  },
  cardGradient: {
    padding: isMobile ? 12 : 15,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isMobile ? 8 : 10,
  },
  cardDate: {
    fontSize: isMobile ? 14 : 16,
    fontWeight: "600",
    color: "#fff",
  },
  weatherIcon: {
    fontSize: 24,
  },
  cardMainInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isMobile ? 12 : 15,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: isMobile ? 8 : 10,
  },
  tempText: {
    fontSize: isMobile ? 24 : 28,
    fontWeight: "bold",
    color: "#fff",
  },
  rainAmount: {
    fontSize: isMobile ? 16 : 20,
    color: "#fff",
    opacity: 0.9,
  },
  cardDetails: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: isMobile ? 8 : 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    // justifyContent: "space-between",
    marginVertical: isMobile ? 3 : 4,
  },
  detailIcon: {
    fontSize: isMobile ? 14 : 16,
    marginRight: 8,
    color: "#fff",
  },
  detailText: {
    fontSize: isMobile ? 12 : 14,
    color: "#fff",
    opacity: 0.9,
  },
  floodWarning: {
    backgroundColor: "rgba(244,67,54,0.2)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  floodWarningText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  infoButton: {
    marginLeft: 10,
    padding: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1a237e",
    borderRadius: 20,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    padding: 0,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  modelDetail: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  modelTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  modelDescription: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    lineHeight: 20,
  },
  mainScroll: {
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(255,255,255,0.3) transparent",
  },
  customScroll: {
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(255,255,255,0.3) transparent",
    "&::-webkit-scrollbar": {
      width: "6px",
      height: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "rgba(255,255,255,0.3)",
      borderRadius: "20px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      backgroundColor: "rgba(255,255,255,0.5)",
    },
  },
  modalBodyContent: {
    paddingBottom: 20,
  },
});
