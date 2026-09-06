from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import URLError, HTTPError
import json
import math
import time

app = FastAPI(title="AC Predictor Bitcoin ML API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BINANCE_BASE = "https://api.binance.com"
FEAR_GREED_URL = "https://api.alternative.me/fng/?limit=1"

# Keep a short in-memory cache so page refreshes do not repeatedly hit public APIs.
_cache = {"timestamp": 0.0, "data": None}
CACHE_SECONDS = 60


def get_json(url: str):
    request = Request(url, headers={"User-Agent": "AC-Predictor/3.0"})
    with urlopen(request, timeout=12) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_klines(limit: int = 1000):
    query = urlencode({
        "symbol": "BTCUSDT",
        "interval": "1h",
        "limit": limit,
    })
    rows = get_json(f"{BINANCE_BASE}/api/v3/klines?{query}")
    return [
        {
            "time": int(row[0]),
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
            "volume": float(row[5]),
        }
        for row in rows
    ]


def fetch_ticker():
    return get_json(f"{BINANCE_BASE}/api/v3/ticker/24hr?symbol=BTCUSDT")


def fetch_fear_greed():
    try:
        data = get_json(FEAR_GREED_URL)
        item = data["data"][0]
        return int(item["value"]), item["value_classification"]
    except Exception:
        return 50, "Neutral"


def mean(values):
    return sum(values) / len(values) if values else 0.0


def std(values):
    if len(values) < 2:
        return 1.0
    m = mean(values)
    return math.sqrt(sum((x - m) ** 2 for x in values) / len(values)) or 1.0


def sma(values, period):
    if len(values) < period:
        return mean(values)
    return mean(values[-period:])


def rsi(values, period=14):
    if len(values) <= period:
        return 50.0
    gains = []
    losses = []
    for i in range(len(values) - period, len(values)):
        delta = values[i] - values[i - 1]
        gains.append(max(delta, 0))
        losses.append(max(-delta, 0))
    avg_gain = mean(gains)
    avg_loss = mean(losses)
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def ema_series(values, period):
    if not values:
        return []
    multiplier = 2.0 / (period + 1.0)
    result = [values[0]]
    for value in values[1:]:
        result.append((value - result[-1]) * multiplier + result[-1])
    return result


def macd(values):
    fast = ema_series(values, 12)
    slow = ema_series(values, 26)
    line = [a - b for a, b in zip(fast, slow)]
    signal = ema_series(line, 9)
    return line[-1], signal[-1], line[-1] - signal[-1]


def volatility(values, period=24):
    if len(values) < period + 1:
        return 0.0
    returns = [
        math.log(values[i] / values[i - 1])
        for i in range(len(values) - period + 1, len(values))
        if values[i - 1] > 0 and values[i] > 0
    ]
    return std(returns) * math.sqrt(24.0)


def feature_vector(closes, volumes, index):
    window = closes[: index + 1]
    volume_window = volumes[: index + 1]

    price = window[-1]
    r1 = price / window[-2] - 1.0 if len(window) >= 2 else 0.0
    r6 = price / window[-7] - 1.0 if len(window) >= 7 else 0.0
    r24 = price / window[-25] - 1.0 if len(window) >= 25 else 0.0

    ma20 = sma(window, 20)
    ma50 = sma(window, 50)
    rsi_value = rsi(window, 14)
    macd_line, macd_signal, macd_hist = macd(window)

    recent_volume = mean(volume_window[-6:]) if len(volume_window) >= 6 else mean(volume_window)
    base_volume = mean(volume_window[-48:]) if len(volume_window) >= 48 else mean(volume_window)
    volume_ratio = recent_volume / base_volume if base_volume else 1.0

    return [
        r1 * 100.0,
        r6 * 100.0,
        r24 * 100.0,
        (rsi_value - 50.0) / 10.0,
        (price / ma20 - 1.0) * 100.0,
        (price / ma50 - 1.0) * 100.0,
        macd_hist / price * 10000.0,
        volume_ratio - 1.0,
        volatility(window, 24) * 100.0,
    ]


def sigmoid(value):
    value = max(-30.0, min(30.0, value))
    return 1.0 / (1.0 + math.exp(-value))


def standardize(rows):
    columns = list(zip(*rows))
    means = [mean(col) for col in columns]
    scales = [std(col) for col in columns]
    transformed = [
        [(value - means[j]) / scales[j] for j, value in enumerate(row)]
        for row in rows
    ]
    return transformed, means, scales


def transform_row(row, means, scales):
    return [(value - means[i]) / scales[i] for i, value in enumerate(row)]


def train_models(closes, volumes, horizon=6):
    # Build supervised samples from historical hourly candles.
    samples = []
    directions = []
    future_returns = []

    start = 60
    end = len(closes) - horizon
    for i in range(start, end):
        features = feature_vector(closes, volumes, i)
        future_return = closes[i + horizon] / closes[i] - 1.0
        samples.append(features)
        directions.append(1.0 if future_return > 0 else 0.0)
        future_returns.append(future_return)

    x, means, scales = standardize(samples)

    # Lightweight logistic regression trained with gradient descent.
    w_cls = [0.0] * len(x[0])
    b_cls = 0.0
    lr = 0.035

    for _ in range(280):
        grad_w = [0.0] * len(w_cls)
        grad_b = 0.0
        for row, target in zip(x, directions):
            p = sigmoid(sum(w * f for w, f in zip(w_cls, row)) + b_cls)
            error = p - target
            for j, f in enumerate(row):
                grad_w[j] += error * f
            grad_b += error

        n = len(x)
        for j in range(len(w_cls)):
            w_cls[j] -= lr * grad_w[j] / n
        b_cls -= lr * grad_b / n

    # Lightweight linear regression for the expected 6-hour return.
    # Target is scaled to percentage points to make optimization stable.
    y = [r * 100.0 for r in future_returns]
    w_reg = [0.0] * len(x[0])
    b_reg = 0.0
    lr_reg = 0.01

    for _ in range(350):
        grad_w = [0.0] * len(w_reg)
        grad_b = 0.0
        for row, target in zip(x, y):
            prediction = sum(w * f for w, f in zip(w_reg, row)) + b_reg
            error = prediction - target
            for j, f in enumerate(row):
                grad_w[j] += error * f
            grad_b += error

        n = len(x)
        for j in range(len(w_reg)):
            w_reg[j] -= lr_reg * grad_w[j] / n
        b_reg -= lr_reg * grad_b / n

    return w_cls, b_cls, w_reg, b_reg, means, scales


def build_prediction():
    now = time.time()
    if _cache["data"] and now - _cache["timestamp"] < CACHE_SECONDS:
        return _cache["data"]

    candles = fetch_klines(1000)
    if len(candles) < 150:
        raise RuntimeError("Not enough BTC market history returned by Binance.")

    closes = [c["close"] for c in candles]
    volumes = [c["volume"] for c in candles]

    ticker = fetch_ticker()
    fear_greed, fear_greed_label = fetch_fear_greed()
    try:
        alt_ticker = get_json("https://api.alternative.me/v2/ticker/1/?convert=USD")
        alt_quote = alt_ticker["data"]["1"]["quotes"]["USD"]
        market_cap = float(alt_quote.get("market_cap", 0.0))
    except Exception:
        market_cap = 0.0

    w_cls, b_cls, w_reg, b_reg, means, scales = train_models(closes, volumes)
    current_features = feature_vector(closes, volumes, len(closes) - 1)
    x_now = transform_row(current_features, means, scales)

    probability_up = sigmoid(sum(w * f for w, f in zip(w_cls, x_now)) + b_cls)
    predicted_return_pct = sum(w * f for w, f in zip(w_reg, x_now)) + b_reg

    # Prevent unstable outliers from becoming unrealistic UI forecasts.
    predicted_return_pct = max(-8.0, min(8.0, predicted_return_pct))
    current_price = closes[-1]
    predicted_price = current_price * (1.0 + predicted_return_pct / 100.0)

    if probability_up >= 0.56:
        trend = "Bullish"
    elif probability_up <= 0.44:
        trend = "Bearish"
    else:
        trend = "Neutral"

    confidence = 50.0 + abs(probability_up - 0.5) * 100.0
    confidence = max(50.0, min(95.0, confidence))

    price_24h_ago = closes[-25]
    change_24h = (current_price / price_24h_ago - 1.0) * 100.0

    ma20 = sma(closes, 20)
    rsi_value = rsi(closes, 14)
    macd_line, macd_signal, macd_hist = macd(closes)

    high_24h = max(c["high"] for c in candles[-24:])
    low_24h = min(c["low"] for c in candles[-24:])
    volume_24h = sum(c["volume"] * c["close"] for c in candles[-24:])

    chart = [
        {
            "time": c["time"],
            "price": round(c["close"], 2),
        }
        for c in candles
    ]

    result = {
        "current_price": round(current_price, 2),
        "predicted_price": round(predicted_price, 2),
        "change_percent": round(predicted_return_pct, 2),
        "change_24h": round(change_24h, 2),
        "confidence": round(confidence, 1),
        "trend": trend,
        "probability_up": round(probability_up * 100.0, 1),
        "rsi": round(rsi_value, 2),
        "macd": round(macd_hist, 2),
        "moving_average": round(ma20, 2),
        "fear_greed": fear_greed,
        "fear_greed_label": fear_greed_label,
        "high_24h": round(high_24h, 2),
        "low_24h": round(low_24h, 2),
        "volume_24h": round(volume_24h, 2),
        "market_cap": round(market_cap, 2),
        "symbol": "BTC/USDT",
        "model": "Online logistic + linear regression",
        "training_candles": len(candles) - 60 - 6,
        "horizon": "6 hours",
        "chart": chart,
        "source": "Binance 1h BTCUSDT candles + Alternative.me Fear & Greed",
        "updated_at": int(time.time()),
    }

    _cache["timestamp"] = now
    _cache["data"] = result
    return result


@app.get("/api")
def home():
    return {
        "status": "ok",
        "message": "AC Predictor live Bitcoin ML API is working",
    }


@app.get("/api/market")
def market():
    try:
        return build_prediction()
    except (HTTPError, URLError, TimeoutError) as exc:
        raise HTTPException(status_code=502, detail=f"Market data provider error: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/predict")
def predict():
    try:
        return build_prediction()
    except (HTTPError, URLError, TimeoutError) as exc:
        raise HTTPException(status_code=502, detail=f"Market data provider error: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
