# Backend Machine Learning Models & Training Guide

This document provides a complete guide on **which models are used**, **whether they are pre-trained**, **how they are invoked via API routes**, and **how to set up and extract the final `.pkl` model files**.

---

## 1. Summary of ML Models Used

The backend uses **5 distinct time-series forecasting models** implemented in `backend/app/models/model_manager.py`:

| Model Name | Class / Implementation | Description & Use Case |
| :--- | :--- | :--- |
| **1. Seasonal Naive** | `SeasonalNaiveForecaster` | 12-month lag seasonal baseline. Captures annual cyclical patterns (e.g. March tax-planning surge). |
| **2. Linear Regression** | `LinearRegressionForecaster` | Ridge regression with engineered time features (trend, harmonic sine/cosine, quarter markers, March/April flags). |
| **3. SARIMA** | `SARIMAForecaster` | Seasonal Autoregressive Integrated Moving Average $(1,1,1) \times (1,1,0)_{12}$. Captures linear autocorrelation & seasonal components. |
| **4. Prophet / Holt-Winters** | `ProphetForecaster` | Non-linear trend forecaster with annual seasonality. Falls back to Holt-Winters Triple Exponential Smoothing if Prophet is not installed. |
| **5. LSTM** | `LSTMForecaster` | Deep learning sequential model using Keras/TensorFlow. Uses look-back window sequences for forecasting. |

---

## 2. Are the Models Trained or Not?

### Pre-trained `.pkl` Model Artifacts:
- **Yes!** The platform is designed to run on **pre-trained `.pkl` artifacts** saved in `Backend/models/`.
- Pre-training runs on full historical series for standard industry targets:
  1. `premium_month_cr` (New Business Premium in ₹ Cr)
  2. `policies_month` (Number of Policies)
- Pre-trained `.pkl` files are stored in `Backend/models/`:
  - `industry_premium_seasonal_naive.pkl`
  - `industry_premium_linear_regression.pkl`
  - `industry_premium_sarima.pkl`
  - `industry_premium_prophet.pkl`
  - `industry_premium_lstm.pkl`
  - `industry_policies_seasonal_naive.pkl`
  - `industry_policies_linear_regression.pkl`
  - `industry_policies_sarima.pkl`
  - `industry_policies_prophet.pkl`
  - `industry_policies_lstm.pkl`

### Online Dynamic Fitting (Fallback):
- If a `.pkl` file is missing, or when filtering by custom granular levels (specific insurer, specific category), the system automatically fits the model **on-the-fly (online fitting)** so requests never crash.

---

## 3. How the Model is Called & API Routes

### Execution Flow:
```
Client Request (Frontend / Postman)
       │
       ▼
1. FastAPI Route (backend/app/api/routes_forecast.py)
       │
       ▼
2. Forecasting Service (backend/app/services/forecasting_service.py)
       │
       ▼
3. Model Manager (backend/app/models/model_manager.py)
       │
       ├─► Reads & loads pre-trained .pkl file from models/ (Fast)
       └─► If .pkl not found -> Fits model on-the-fly via MODEL_REGISTRY
       │
       ▼
4. Model Prediction (.predict(horizon))
       │
       ▼
Returns Forecast JSON with Point Estimates & Confidence Intervals
```

### API Routes calling the models:

1. **`POST /api/forecast`**
   - **File**: `backend/app/api/routes_forecast.py` (`generate_forecast`)
   - **Request Body**:
     ```json
     {
       "level": "industry",
       "target": "premium_month_cr",
       "horizon": 24,
       "selected_model": "auto"
     }
     ```
   - **Action**: Loads the `.pkl` model (or auto-selects recommended best model), generates out-of-sample predictions and 95% confidence intervals.

2. **`POST /api/forecast/compare`**
   - **File**: `backend/app/api/routes_forecast.py` (`compare_forecasting_models`)
   - **Action**: Runs chronological Train/Val/Test holdout evaluation across all 5 models and returns sMAPE, MAE, RMSE metrics.

3. **`POST /api/export/forecast`**
   - **File**: `backend/app/api/routes_forecast.py` (`export_forecast`)
   - **Action**: Generates forecast and returns a downloadable CSV file.

---

## 4. Setup & How to Generate / Export Final `.pkl` Files

Follow these step-by-step instructions to set up the environment, run the training pipeline, and extract the final `.pkl` model files.

### Step 1: Install Dependencies
Open terminal inside `TODO/Backend/` and install required packages:
```bash
python3 -m pip install -r backend/requirements.txt
```

### Step 2: Run the Model Training Pipeline
Execute the training script from the `Backend/` directory:
```bash
python3 scripts/train_and_save_models.py
```

### Step 3: Extract the Final `.pkl` Files
Once the script finishes execution, all trained `.pkl` files and evaluation metrics will be generated in `Backend/models/`:
- `models/industry_premium_seasonal_naive.pkl`
- `models/industry_premium_linear_regression.pkl`
- `models/industry_premium_sarima.pkl`
- `models/industry_premium_prophet.pkl`
- `models/industry_premium_lstm.pkl`
- `models/industry_policies_seasonal_naive.pkl`
- `models/industry_policies_linear_regression.pkl`
- `models/industry_policies_sarima.pkl`
- `models/industry_policies_prophet.pkl`
- `models/industry_policies_lstm.pkl`
- `models/evaluation_report.csv`

### Step 4: Run the Backend API Server
To start the FastAPI web backend:
```bash
python3 -m uvicorn backend.app.main:app --reload --port 8000
```
Or run using shell script:
```bash
bash run_project.sh
```
The API documentation will be available at `http://localhost:8000/docs`.
