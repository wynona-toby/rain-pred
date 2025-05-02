from flask import Flask, request, jsonify
import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model
from datetime import datetime, timedelta
import requests
from flask_cors import CORS
import os
import shap
import matplotlib.pyplot as plt
from io import BytesIO
import base64
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
import matplotlib
matplotlib.use('Agg')  # Use Agg backend to avoid GUI issues

app = Flask(__name__)
CORS(app)

# Load the pre-trained model
model = load_model("predictions15.keras")

# Function to fetch weather data
def fetch_weather_data(latitude, longitude, start_date, end_date):
    weather_url = "https://archive-api.open-meteo.com/v1/archive"
    weather_params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "daily": ["precipitation_sum", "rain_sum", "precipitation_hours"],
        "timezone": "GMT"
    }
    response = requests.get(weather_url, params=weather_params)
    if response.status_code == 200:
        data = response.json().get('daily', {})
        if 'time' in data:
            data['date'] = pd.to_datetime(data['time'])
            del data['time']
        return pd.DataFrame(data)
    return None

# Function to fetch river discharge data
def fetch_discharge_data(latitude, longitude, start_date, end_date):
    discharge_url = "https://flood-api.open-meteo.com/v1/flood"
    discharge_params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": ["river_discharge"],
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
    }
    response = requests.get(discharge_url, params=discharge_params)
    if response.status_code == 200:
        data = response.json().get('daily', {})
        if 'time' in data:
            data['date'] = pd.to_datetime(data['time'])
            del data['time']
        return pd.DataFrame(data)
    return None

# Function to prepare input data
def prepare_input_data(weather_data, discharge_data):
    combined_df = pd.merge(weather_data, discharge_data, on="date", how="inner")
    combined_df['date'] = pd.to_datetime(combined_df['date']).dt.tz_localize(None)

    features = ['precipitation_sum', 'rain_sum', 'precipitation_hours', 'river_discharge']
    for feature in features:
        if feature in combined_df:
            combined_df[feature] = pd.to_numeric(combined_df[feature], errors='coerce')
            combined_df[feature] = combined_df[feature].fillna(0)

    recent_data = combined_df[-1:].copy()
    input_data = recent_data[features].values
    recent_dates = recent_data['date'].tolist()
    return np.expand_dims(input_data, axis=0), recent_dates


def prepare_input_data_for_xai(weather_data, discharge_data):
    combined_df = pd.merge(weather_data, discharge_data, on="date", how="inner")
    combined_df['date'] = pd.to_datetime(combined_df['date']).dt.tz_localize(None)

    features = ['precipitation_sum', 'rain_sum', 'precipitation_hours', 'river_discharge']
    for feature in features:
        if feature in combined_df:
            combined_df[feature] = pd.to_numeric(combined_df[feature], errors='coerce')
            combined_df[feature] = combined_df[feature].fillna(0)

    recent_data = combined_df[-15:].copy()
    input_data = recent_data[features].values
    recent_dates = recent_data['date'].tolist()
    return np.expand_dims(input_data, axis=0), recent_dates

# Function to predict weather for 5 days
def predict_weather(input_data, recent_dates):
    predictions = []
    new_dates = recent_dates.copy()

    for _ in range(7):
        pred = model.predict(input_data)
        pred = np.maximum(pred, 0)
        predictions.append(pred[0])

        new_row = [float(pred[0][i]) for i in range(4)]
        new_date = new_dates[-1] + timedelta(days=1)
        new_dates.append(new_date)

        recent_data = np.vstack([input_data[0, 1:, :], new_row])
        input_data = np.expand_dims(recent_data, axis=0)

    return predictions, new_dates

# Modify the generate_shap_summary_plots function
def generate_shap_summary_plots(input_tensor):
    if input_tensor.shape != (1, 15, 4):
        raise ValueError("Expected input_tensor of shape (1, 15, 4)")

    input_reshaped = input_tensor[0]  # Shape: (15, 4)
    plots_base64 = {}
    feature_names = ["precipitation_sum", "rain_sum", "precipitation_hours", "river_discharge"]

    X = input_reshaped  # shape: (15, 4)

    def model_fn(X_input):
        input_copy = np.zeros((X_input.shape[0], 15, 4))
        input_copy[:] = input_tensor[0]
        input_copy[:, :, :] = X_input[:, np.newaxis, :]
        return model.predict(input_copy)[:, 0]  # Assume we're explaining the first output only

    explainer = shap.KernelExplainer(model_fn, X)
    shap_values = explainer.shap_values(X)  # shape: (15, 4)

    if isinstance(shap_values, list):
        shap_values = shap_values[0]

    # Plot SHAP value for each feature across 15 days
    for feature_idx, feature_name in enumerate(feature_names):
        shap_vals_for_feature = shap_values[:, feature_idx]  # shape: (15,)
        days = np.arange(1, 16)

        fig = plt.figure(figsize=(8, 6))
        plt.barh(days, shap_vals_for_feature, align='center')
        plt.xlabel("SHAP value")
        plt.ylabel("Day")
        plt.title(f"SHAP Values of {feature_name} over 15 Days")
        plt.gca().invert_yaxis()
        plt.grid(True)

        img = BytesIO()
        fig.savefig(img, format='png', bbox_inches='tight')
        plt.close(fig)  # Explicitly close the figure
        img.seek(0)
        plot_base64 = base64.b64encode(img.getvalue()).decode('utf-8')

        plots_base64[feature_name] = plot_base64

    return plots_base64


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        latitude = data["latitude"]
        longitude = data["longitude"]

        yesterday = datetime.today().date() - timedelta(days=1)
        start_date = yesterday - timedelta(days=15)

        weather_data = fetch_weather_data(latitude, longitude, start_date, yesterday)
        discharge_data = fetch_discharge_data(latitude, longitude, start_date, yesterday)

        if weather_data is None or discharge_data is None:
            return jsonify({"error": "Failed to fetch weather or discharge data"}), 500

        input_data, dates = prepare_input_data(weather_data, discharge_data)
        predictions, new_dates = predict_weather(input_data, dates)

        return jsonify({
            "predictions": [p.tolist() for p in predictions],
            "dates": [str(d.date()) for d in new_dates[1:]]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/xai', methods=['POST'])
def explain():
    try:
        data = request.json
        latitude = data["latitude"]
        longitude = data["longitude"]

        yesterday = datetime.today().date() - timedelta(days=1)
        start_date = yesterday - timedelta(days=15)

        weather_data = fetch_weather_data(latitude, longitude, start_date, yesterday)
        discharge_data = fetch_discharge_data(latitude, longitude, start_date, yesterday)

        if weather_data is None or discharge_data is None:
            return jsonify({"error": "Failed to fetch weather or discharge data"}), 500

        input_data, _ = prepare_input_data_for_xai(weather_data, discharge_data)
        shap_plots = generate_shap_summary_plots(input_data)

        return jsonify({
            "shap_images": shap_plots
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)