"""
Model Manager & Consolidated Forecasters
========================================
Main model manager that handles loading, caching, and serving pre-trained .pkl models.
Includes all forecaster class definitions (Seasonal Naive, Linear Regression, SARIMA, Prophet, LSTM).
"""

import os
import sys
import pickle
import warnings
import numpy as np
import pandas as pd
from typing import Tuple, Optional, Dict, Any, List
from abc import ABC, abstractmethod

from ..utils.logger import get_logger
from ..utils.date_utils import generate_future_dates

logger = get_logger("model_manager")


# ==============================================================================
# Base Forecaster
# ==============================================================================
class BaseForecaster(ABC):
    def __init__(self, name: str):
        self.name = name
        self.fitted = False
        self.training_series: Optional[pd.Series] = None
        self.training_dates: Optional[pd.Series] = None
        self.last_date: Optional[str] = None
        self.notes: Optional[str] = None

    @abstractmethod
    def fit(self, series: pd.Series, dates: Optional[pd.Series] = None) -> "BaseForecaster":
        """Fits the forecasting model on historical series."""
        pass

    @abstractmethod
    def predict(self, horizon: int) -> Tuple[np.ndarray, Optional[np.ndarray], Optional[np.ndarray]]:
        """
        Generates out-of-sample forecasts for given horizon.
        Returns (point_forecasts, lower_bounds, upper_bounds).
        """
        pass

    def enforce_non_negative(self, array: np.ndarray) -> np.ndarray:
        """Enforces domain constraint that insurance premium and policy counts cannot be negative."""
        return np.maximum(array, 0.0)

    def get_info(self) -> Dict[str, Any]:
        return {
            "model_name": self.name,
            "fitted": self.fitted,
            "notes": self.notes
        }


# ==============================================================================
# Seasonal Naive Forecaster
# ==============================================================================
class SeasonalNaiveForecaster(BaseForecaster):
    def __init__(self, season_length: int = 12):
        super().__init__(name="Seasonal Naive")
        self.season_length = season_length
        self.seasonal_cycle: np.ndarray = np.array([])
        self.std_seasonal_diff = 0.0

    def fit(self, series: pd.Series, dates: Optional[pd.Series] = None) -> "SeasonalNaiveForecaster":
        clean_s = pd.to_numeric(series.dropna(), errors="coerce")
        n = len(clean_s)
        if n == 0:
            raise ValueError("Cannot fit Seasonal Naive model on empty series.")

        self.training_series = clean_s
        
        if n < self.season_length:
            self.notes = f"Insufficient observations ({n}) for {self.season_length}-month seasonality. Falling back to last observed value."
            self.seasonal_cycle = np.full(self.season_length, float(clean_s.iloc[-1]))
            self.std_seasonal_diff = 0.05 * abs(float(clean_s.iloc[-1]))
        else:
            self.seasonal_cycle = clean_s.iloc[-self.season_length:].to_numpy(dtype=float)
            seasonal_diffs = clean_s.diff(self.season_length).dropna()
            if len(seasonal_diffs) > 0 and seasonal_diffs.std() > 0:
                self.std_seasonal_diff = float(seasonal_diffs.std())
            else:
                self.std_seasonal_diff = 0.05 * float(clean_s.iloc[-1])

        self.fitted = True
        return self

    def predict(self, horizon: int) -> Tuple[np.ndarray, Optional[np.ndarray], Optional[np.ndarray]]:
        if not self.fitted:
            raise RuntimeError("Model must be fitted before predict.")

        reps = int(np.ceil(horizon / self.season_length))
        forecasts = np.tile(self.seasonal_cycle, reps)[:horizon]

        cycle_count = np.floor(np.arange(horizon) / self.season_length) + 1
        margin = 1.96 * self.std_seasonal_diff * np.sqrt(cycle_count)
        lower = self.enforce_non_negative(forecasts - margin)
        upper = self.enforce_non_negative(forecasts + margin)

        return self.enforce_non_negative(forecasts), lower, upper


# ==============================================================================
# Linear Regression Forecaster
# ==============================================================================
from sklearn.linear_model import Ridge

class LinearRegressionForecaster(BaseForecaster):
    def __init__(self, alpha: float = 1.0):
        super().__init__(name="Linear Regression (Time Features)")
        self.alpha = alpha
        self.model = Ridge(alpha=self.alpha)
        self.residual_std = 0.0
        self.last_t = 0
        self.last_iso_date = ""

    def _extract_features(self, t_indices: np.ndarray, months: np.ndarray) -> np.ndarray:
        t = t_indices.reshape(-1, 1)
        t_sq = (t_indices ** 2).reshape(-1, 1) / 1000.0
        
        sin_m = np.sin(2 * np.pi * months / 12.0).reshape(-1, 1)
        cos_m = np.cos(2 * np.pi * months / 12.0).reshape(-1, 1)
        q = np.ceil(months / 3.0).reshape(-1, 1)
        
        is_march = (months == 3).astype(float).reshape(-1, 1)
        is_april = (months == 4).astype(float).reshape(-1, 1)
        
        return np.hstack([t, t_sq, sin_m, cos_m, q, is_march, is_april])

    def fit(self, series: pd.Series, dates: Optional[pd.Series] = None) -> "LinearRegressionForecaster":
        clean_s = pd.to_numeric(series.dropna(), errors="coerce")
        n = len(clean_s)
        if n < 4:
            raise ValueError(f"Linear regression requires at least 4 observations, got {n}.")

        self.training_series = clean_s
        y = clean_s.to_numpy(dtype=float)

        t_indices = np.arange(1, n + 1)
        self.last_t = n

        if dates is not None and len(dates) == n:
            dt_series = pd.to_datetime(dates)
            months = dt_series.dt.month.to_numpy()
            self.last_iso_date = dt_series.iloc[-1].strftime("%Y-%m-01")
        else:
            months = ((np.arange(n)) % 12) + 1
            self.last_iso_date = "2024-01-01"

        X = self._extract_features(t_indices, months)
        self.model.fit(X, y)
        
        preds = self.model.predict(X)
        residuals = y - preds
        dof = max(1, n - X.shape[1])
        self.residual_std = float(np.sqrt(np.sum(residuals ** 2) / dof))

        self.fitted = True
        return self

    def predict(self, horizon: int) -> Tuple[np.ndarray, Optional[np.ndarray], Optional[np.ndarray]]:
        if not self.fitted:
            raise RuntimeError("Model must be fitted before predict.")

        future_t = np.arange(self.last_t + 1, self.last_t + horizon + 1)
        
        if self.last_iso_date:
            future_iso = generate_future_dates(self.last_iso_date, horizon)
            dt_idx = pd.to_datetime(future_iso)
            future_months = dt_idx.month.to_numpy() if hasattr(dt_idx, "month") else np.array([d.month for d in dt_idx])
        else:
            future_months = ((future_t - 1) % 12) + 1

        X_future = self._extract_features(future_t, future_months)
        forecasts = self.model.predict(X_future)

        h_idx = np.arange(1, horizon + 1)
        margin = 1.96 * self.residual_std * np.sqrt(1.0 + (h_idx / self.last_t))
        lower = self.enforce_non_negative(forecasts - margin)
        upper = self.enforce_non_negative(forecasts + margin)

        return self.enforce_non_negative(forecasts), lower, upper


# ==============================================================================
# SARIMA Forecaster
# ==============================================================================
from statsmodels.tsa.statespace.sarimax import SARIMAX

class SARIMAForecaster(BaseForecaster):
    def __init__(self, order=(1, 1, 1), seasonal_order=(1, 1, 0, 12)):
        super().__init__(name="SARIMA")
        self.order = order
        self.seasonal_order = seasonal_order
        self.fitted_model = None

    def fit(self, series: pd.Series, dates: Optional[pd.Series] = None) -> "SARIMAForecaster":
        clean_s = pd.to_numeric(series.dropna(), errors="coerce")
        n = len(clean_s)
        if n < 12:
            raise ValueError(f"SARIMA requires at least 12 observations, got {n}.")

        self.training_series = clean_s
        y = clean_s.to_numpy(dtype=float)

        fitted = False
        if n >= 24:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    model = SARIMAX(
                        y,
                        order=self.order,
                        seasonal_order=self.seasonal_order,
                        enforce_stationarity=False,
                        enforce_invertibility=False
                    )
                    self.fitted_model = model.fit(disp=False, maxiter=50)
                    fitted = True
                    self.notes = f"Fitted SARIMA{self.order}x{self.seasonal_order}"
            except Exception as e:
                logger.warning(f"Seasonal SARIMA failed to fit: {e}. Falling back to non-seasonal ARIMA.")

        if not fitted:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    model = SARIMAX(
                        y, order=(1, 1, 1),
                        enforce_stationarity=False,
                        enforce_invertibility=False
                    )
                    self.fitted_model = model.fit(disp=False, maxiter=50)
                    fitted = True
                    self.notes = "Fitted non-seasonal ARIMA(1,1,1)."
            except Exception as e:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    model = SARIMAX(y, order=(1, 0, 0))
                    self.fitted_model = model.fit(disp=False, maxiter=50)
                    fitted = True
                    self.notes = "Fitted simple AR(1) fallback."

        self.fitted = fitted
        return self

    def predict(self, horizon: int) -> Tuple[np.ndarray, Optional[np.ndarray], Optional[np.ndarray]]:
        if not self.fitted or self.fitted_model is None:
            raise RuntimeError("SARIMA model must be successfully fitted before predict.")

        forecast_res = self.fitted_model.get_forecast(steps=horizon)
        forecasts = forecast_res.predicted_mean
        conf = forecast_res.conf_int(alpha=0.05)

        lower = conf[:, 0]
        upper = conf[:, 1]

        return (
            self.enforce_non_negative(np.array(forecasts)),
            self.enforce_non_negative(np.array(lower)),
            self.enforce_non_negative(np.array(upper))
        )


# ==============================================================================
# Prophet Forecaster
# ==============================================================================
PROPHET_AVAILABLE = False
Prophet = None

import importlib
for _mod_name in ["prophet", "fbprophet"]:
    try:
        _mod = importlib.import_module(_mod_name)
        _prophet_cls = getattr(_mod, "Prophet", None)
        if _prophet_cls is not None:
            Prophet = _prophet_cls
            PROPHET_AVAILABLE = True
            break
    except Exception:
        pass


class ProphetForecaster(BaseForecaster):
    def __init__(self):
        super().__init__(name="Prophet")
        self.use_fallback = not PROPHET_AVAILABLE
        self.prophet_model = None
        self.fallback_model = None
        self.last_iso_date = ""
        self.fallback_residual_std = 0.0

    def fit(self, series: pd.Series, dates: Optional[pd.Series] = None) -> "ProphetForecaster":
        clean_s = pd.to_numeric(series.dropna(), errors="coerce")
        n = len(clean_s)
        if n < 4:
            raise ValueError(f"Prophet requires at least 4 observations, got {n}.")

        self.training_series = clean_s
        
        if dates is not None and len(dates) == n:
            ds = pd.to_datetime(dates).dt.strftime("%Y-%m-%d").tolist()
            self.last_iso_date = ds[-1]
        else:
            base_dates = pd.date_range(end="2024-03-01", periods=n, freq="MS")
            ds = base_dates.strftime("%Y-%m-%d").tolist()
            self.last_iso_date = ds[-1]

        y = clean_s.to_numpy(dtype=float)

        if PROPHET_AVAILABLE and not self.use_fallback:
            try:
                df_prophet = pd.DataFrame({"ds": pd.to_datetime(ds), "y": y})
                m = Prophet(
                    yearly_seasonality=True if n >= 24 else False,
                    weekly_seasonality=False,
                    daily_seasonality=False,
                    interval_width=0.95
                )
                m.fit(df_prophet)
                self.prophet_model = m
                self.fitted = True
                self.notes = "Fitted Prophet model with 95% uncertainty intervals."
                return self
            except Exception as e:
                logger.warning(f"Prophet execution failed: {e}. Switching to Holt-Winters fallback.")
                self.use_fallback = True

        from statsmodels.tsa.holtwinters import ExponentialSmoothing
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                if n >= 24:
                    hw = ExponentialSmoothing(
                        y, trend="add", seasonal="add",
                        seasonal_periods=12, initialization_method="estimated"
                    ).fit()
                    self.notes = "Prophet Fallback: Fitted Holt-Winters Exponential Smoothing with 12m additive seasonality."
                elif n >= 8:
                    hw = ExponentialSmoothing(
                        y, trend="add", seasonal=None, initialization_method="estimated"
                    ).fit()
                    self.notes = "Prophet Fallback: Fitted Holt Exponential Smoothing."
                else:
                    hw = ExponentialSmoothing(y, trend=None, seasonal=None).fit()
                    self.notes = "Prophet Fallback: Fitted Simple Exponential Smoothing."

                self.fallback_model = hw
                residuals = y - hw.fittedvalues
                self.fallback_residual_std = float(np.std(residuals)) if len(residuals) > 0 else 0.05 * float(y[-1])
                self.fitted = True
        except Exception as e:
            logger.error(f"Holt-Winters fallback failed: {e}")
            self.fitted = False
            raise RuntimeError(f"Failed fitting Prophet and fallback models: {e}")

        return self

    def predict(self, horizon: int) -> Tuple[np.ndarray, Optional[np.ndarray], Optional[np.ndarray]]:
        if not self.fitted:
            raise RuntimeError("ProphetForecaster must be fitted before predict.")

        if self.prophet_model is not None and not self.use_fallback:
            future = self.prophet_model.make_future_dataframe(periods=horizon, freq="MS")
            forecast = self.prophet_model.predict(future)
            out_forecast = forecast.iloc[-horizon:]
            yhat = out_forecast["yhat"].to_numpy()
            lower = out_forecast["yhat_lower"].to_numpy()
            upper = out_forecast["yhat_upper"].to_numpy()
            return (
                self.enforce_non_negative(yhat),
                self.enforce_non_negative(lower),
                self.enforce_non_negative(upper)
            )
        else:
            forecasts = self.fallback_model.forecast(horizon)
            h_idx = np.arange(1, horizon + 1)
            margin = 1.96 * self.fallback_residual_std * np.sqrt(h_idx)
            lower = self.enforce_non_negative(forecasts - margin)
            upper = self.enforce_non_negative(forecasts + margin)
            return (
                self.enforce_non_negative(np.array(forecasts)),
                self.enforce_non_negative(np.array(lower)),
                self.enforce_non_negative(np.array(upper))
            )


# ==============================================================================
# LSTM Forecaster
# ==============================================================================
TF_AVAILABLE = False
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.callbacks import EarlyStopping
    from sklearn.preprocessing import MinMaxScaler
    TF_AVAILABLE = True
except ImportError:
    pass

def _create_sequences(data: np.ndarray, look_back: int):
    X, y = [], []
    for i in range(look_back, len(data)):
        X.append(data[i - look_back : i, 0])
        y.append(data[i, 0])
    return np.array(X), np.array(y)

class LSTMForecaster(BaseForecaster):
    def __init__(self, look_back: int = 12, epochs: int = 30, batch_size: int = 16):
        super().__init__(name="LSTM")
        self.look_back = look_back
        self.epochs = epochs
        self.batch_size = batch_size
        self.use_fallback = not TF_AVAILABLE
        self.keras_model = None
        self.scaler = None
        self.scaled_series: Optional[np.ndarray] = None
        self.fallback_model = None
        self.fallback_residual_std: float = 0.0
        self.last_window: Optional[np.ndarray] = None

    def fit(self, series: pd.Series, dates: Optional[pd.Series] = None) -> "LSTMForecaster":
        clean_s = pd.to_numeric(series.dropna(), errors="coerce")
        n = len(clean_s)

        if n < max(self.look_back + 2, 12):
            raise ValueError(f"LSTM requires at least {max(self.look_back + 2, 12)} observations, got {n}.")

        self.training_series = clean_s
        y_raw = clean_s.to_numpy(dtype=float).reshape(-1, 1)

        if not self.use_fallback:
            try:
                self._fit_keras(y_raw, n)
                self.fitted = True
                self.notes = f"Fitted LSTM(64→32) with look_back={self.look_back}m."
                return self
            except Exception as exc:
                logger.warning(f"Keras LSTM training failed ({exc}). Switching to Holt-Winters fallback.")
                self.use_fallback = True

        self._fit_holtwinters(y_raw.flatten(), n)
        return self

    def _fit_keras(self, y_raw: np.ndarray, n: int):
        from sklearn.preprocessing import MinMaxScaler
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        scaled = self.scaler.fit_transform(y_raw)
        self.scaled_series = scaled

        X, y_seq = _create_sequences(scaled, self.look_back)
        X = X.reshape(X.shape[0], X.shape[1], 1)
        self.last_window = scaled[-self.look_back :].copy()

        model = Sequential([
            LSTM(64, return_sequences=True, input_shape=(self.look_back, 1)),
            Dropout(0.2),
            LSTM(32),
            Dropout(0.2),
            Dense(1),
        ])
        model.compile(optimizer="adam", loss="mse")

        early_stop = EarlyStopping(monitor="loss", patience=5, restore_best_weights=True, verbose=0)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model.fit(X, y_seq, epochs=self.epochs, batch_size=self.batch_size, callbacks=[early_stop], verbose=0)
        self.keras_model = model

    def _fit_holtwinters(self, y_flat: np.ndarray, n: int):
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                if n >= 24:
                    hw = ExponentialSmoothing(
                        y_flat, trend="add", seasonal="add",
                        seasonal_periods=12, initialization_method="estimated"
                    ).fit()
                    self.notes = "LSTM Fallback: Holt-Winters with 12m additive seasonality."
                elif n >= 8:
                    hw = ExponentialSmoothing(y_flat, trend="add", seasonal=None, initialization_method="estimated").fit()
                    self.notes = "LSTM Fallback: Holt Exponential Smoothing."
                else:
                    hw = ExponentialSmoothing(y_flat, trend=None, seasonal=None).fit()
                    self.notes = "LSTM Fallback: Simple Exponential Smoothing."

            self.fallback_model = hw
            residuals = y_flat - hw.fittedvalues
            self.fallback_residual_std = float(np.std(residuals)) if len(residuals) > 0 else 0.0
            self.fitted = True
        except Exception as exc:
            raise RuntimeError(f"Holt-Winters fallback failed: {exc}")

    def predict(self, horizon: int) -> Tuple[np.ndarray, Optional[np.ndarray], Optional[np.ndarray]]:
        if not self.fitted:
            raise RuntimeError("LSTMForecaster must be fitted before predict().")

        if not self.use_fallback and self.keras_model is not None:
            return self._predict_keras(horizon)
        else:
            return self._predict_holtwinters(horizon)

    def _predict_keras(self, horizon: int) -> Tuple[np.ndarray, Optional[np.ndarray], Optional[np.ndarray]]:
        window = self.last_window.copy()
        predictions_scaled = []

        for _ in range(horizon):
            x_input = window.reshape(1, self.look_back, 1)
            pred_scaled = float(self.keras_model.predict(x_input, verbose=0)[0, 0])
            predictions_scaled.append(pred_scaled)
            window = np.roll(window, -1, axis=0)
            window[-1, 0] = pred_scaled

        pred_arr = np.array(predictions_scaled).reshape(-1, 1)
        forecasts = self.scaler.inverse_transform(pred_arr).flatten()

        residual_std = self._estimate_residual_std()
        h_idx = np.arange(1, horizon + 1)
        margin = 1.96 * residual_std * np.sqrt(h_idx)
        lower = self.enforce_non_negative(forecasts - margin)
        upper = self.enforce_non_negative(forecasts + margin)

        return self.enforce_non_negative(forecasts), lower, upper

    def _predict_holtwinters(self, horizon: int) -> Tuple[np.ndarray, Optional[np.ndarray], Optional[np.ndarray]]:
        forecasts = np.array(self.fallback_model.forecast(horizon), dtype=float)
        h_idx = np.arange(1, horizon + 1)
        margin = 1.96 * self.fallback_residual_std * np.sqrt(h_idx)
        lower = self.enforce_non_negative(forecasts - margin)
        upper = self.enforce_non_negative(forecasts + margin)
        return self.enforce_non_negative(forecasts), lower, upper

    def _estimate_residual_std(self) -> float:
        if self.training_series is None or self.scaler is None or self.keras_model is None:
            return 0.0
        y_raw = self.training_series.to_numpy(dtype=float).reshape(-1, 1)
        scaled = self.scaler.transform(y_raw)
        X, y_true_s = _create_sequences(scaled, self.look_back)
        if len(X) == 0:
            return 0.0
        X = X.reshape(X.shape[0], X.shape[1], 1)
        y_pred_s = self.keras_model.predict(X, verbose=0).flatten()
        y_true_inv = self.scaler.inverse_transform(y_true_s.reshape(-1, 1)).flatten()
        y_pred_inv = self.scaler.inverse_transform(y_pred_s.reshape(-1, 1)).flatten()
        return float(np.std(y_true_inv - y_pred_inv))


# ==============================================================================
# Model Registry & Manager
# ==============================================================================
MODEL_REGISTRY = {
    "seasonal_naive": SeasonalNaiveForecaster,
    "linear_regression": LinearRegressionForecaster,
    "sarima": SARIMAForecaster,
    "prophet": ProphetForecaster,
    "lstm": LSTMForecaster,
}


class ModelManager:
    """
    Main manager for .pkl model loading, caching, and forecast generation.
    """
    def __init__(self, models_dir: Optional[str] = None):
        if models_dir is None:
            models_dir = os.path.normpath(
                os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "models")
            )
        self.models_dir = models_dir
        self._cache: Dict[str, BaseForecaster] = {}

    def get_model_path(self, label: str, model_key: str) -> str:
        return os.path.join(self.models_dir, f"{label}_{model_key}.pkl")

    def load_model(self, label: str, model_key: str) -> Optional[BaseForecaster]:
        cache_key = f"{label}_{model_key}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        pkl_path = self.get_model_path(label, model_key)
        if os.path.exists(pkl_path):
            try:
                with open(pkl_path, "rb") as f:
                    model = pickle.load(f)
                self._cache[cache_key] = model
                logger.info(f"Loaded .pkl model successfully: {pkl_path}")
                return model
            except Exception as e:
                logger.warning(f"Failed to load .pkl model {pkl_path}: {e}")
        return None

    def list_saved_models(self) -> List[str]:
        if not os.path.exists(self.models_dir):
            return []
        return [f for f in os.listdir(self.models_dir) if f.endswith(".pkl")]


model_manager = ModelManager()


# ==============================================================================
# Backward Compatibility & Module Aliasing for Unpickling
# ==============================================================================
import types
_this_mod = sys.modules[__name__]

# 1. Alias 'app' module
if "app" not in sys.modules:
    _app_mod = types.ModuleType("app")
    sys.modules["app"] = _app_mod
else:
    _app_mod = sys.modules["app"]

# 2. Alias 'app.models'
if "app.models" not in sys.modules:
    _models_mod = types.ModuleType("app.models")
    sys.modules["app.models"] = _models_mod
    setattr(_app_mod, "models", _models_mod)
else:
    _models_mod = sys.modules["app.models"]
    if not hasattr(_app_mod, "models"):
        setattr(_app_mod, "models", _models_mod)

setattr(_models_mod, "model_manager", _this_mod)

# 3. Alias legacy module paths
for _legacy_name in [
    "app.models.model_manager",
    "app.models.base",
    "app.models.seasonal_naive",
    "app.models.linear_regression",
    "app.models.sarima_model",
    "app.models.prophet_model",
    "app.models.lstm_model",
]:
    sys.modules[_legacy_name] = _this_mod
    _sub_name = _legacy_name.split(".")[-1]
    setattr(_models_mod, _sub_name, _this_mod)


