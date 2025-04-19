const OPENWEATHER_API_KEY = "548d28a6deb1f17129f9ce2c74e429bc"; // Replace with your API key

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


export const fetchPredictedWeather = async (
  latitude: number,
  longitude: number
) => {
  try {
    const url = `https://rain-pred-mdvg.onrender.com/predict`;

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
