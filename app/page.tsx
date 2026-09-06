'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CircleHelp,
  Clock3,
  Gauge,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'

const periods = ['24H', '7D', '30D', '90D']

const currencies = {
  USD: { symbol: '$', locale: 'en-US', rate: 1 },
  INR: { symbol: '₹', locale: 'en-IN', rate: 83.2 },
} as const

type Currency = keyof typeof currencies

type ChartPoint = {
  time: number
  price: number
}

type Prediction = {
  current_price: number
  predicted_price: number
  change_percent: number
  change_24h: number
  confidence: number
  trend: 'Bullish' | 'Bearish' | 'Neutral'
  probability_up: number
  rsi: number
  macd: number
  moving_average: number
  fear_greed: number
  fear_greed_label: string
  high_24h: number
  low_24h: number
  volume_24h: number
  market_cap: number
  model: string
  training_candles: number
  horizon: string
  chart: ChartPoint[]
  updated_at: number
}

function formatPrice(value: number, currency: Currency) {
  const selected = currencies[currency]
  return `${selected.symbol}${(value * selected.rate).toLocaleString(selected.locale, {
    maximumFractionDigits: 2,
  })}`
}

function formatCompact(value: number, currency: Currency) {
  const converted = value * currencies[currency].rate
  if (converted >= 1e12) return `${currencies[currency].symbol}${(converted / 1e12).toFixed(2)}T`
  if (converted >= 1e9) return `${currencies[currency].symbol}${(converted / 1e9).toFixed(2)}B`
  if (converted >= 1e6) return `${currencies[currency].symbol}${(converted / 1e6).toFixed(2)}M`
  return formatPrice(value, currency)
}

function formatTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PriceChart({
  period,
  currency,
  prediction,
}: {
  period: string
  currency: Currency
  prediction: Prediction | null
}) {
  if (!prediction?.chart?.length) {
    return <div className="chart-wrap">Waiting for live market data...</div>
  }

  const count =
    period === '24H' ? 24 :
    period === '7D' ? 168 :
    period === '30D' ? 720 :
    1000

  const actualPoints = prediction.chart.slice(-count)
  const last = actualPoints[actualPoints.length - 1]
  const steps = 6
  const forecastPoints = Array.from({ length: steps }, (_, index) => ({
   time: last.time + (index + 1) * 60 * 60,
    price:
      last.price +
      ((prediction.predicted_price - last.price) * (index + 1)) / steps,
  }))

  const allPoints = [...actualPoints, ...forecastPoints]
  const width = 760
  const height = 250
  const prices = allPoints.map((point) => point.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const padding = Math.max((maxPrice - minPrice) * 0.12, 1)
  const min = minPrice - padding
  const max = maxPrice + padding

  const getX = (index: number) => (index / (allPoints.length - 1)) * width
  const getY = (value: number) => height - ((value - min) / (max - min)) * height

  const actual = actualPoints
    .map((point, index) => `${getX(index)},${getY(point.price)}`)
    .join(' ')

  const forecast = [last, ...forecastPoints]
    .map((point, index) => {
      const actualIndex = actualPoints.length - 1 + index
      return `${getX(actualIndex)},${getY(point.price)}`
    })
    .join(' ')

  const fill = `0,${height} ${actual} ${
    getX(actualPoints.length - 1)
  },${height}`

  return (
    <div className="chart-wrap">
      <div className="chart-meta">
        <span>BTC / {currency}</span>
        <span>{period} live performance</span>
      </div>

      <svg
        className="price-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Bitcoin ${period} live price history and machine learning forecast`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--orange)" stopOpacity=".2" />
            <stop offset="100%" stopColor="var(--orange)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4].map((line) => (
          <line
            key={line}
            x1="0"
            x2={width}
            y1={(line * height) / 4}
            y2={(line * height) / 4}
            className="chart-grid"
          />
        ))}

        <polygon points={fill} fill="url(#areaFill)" />
        <polyline
          points={actual}
          fill="none"
          stroke="var(--orange)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={forecast}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="3"
          strokeDasharray="7 7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1={getX(actualPoints.length - 1)}
          x2={getX(actualPoints.length - 1)}
          y1="0"
          y2={height}
          className="forecast-divider"
        />
        <circle
          cx={getX(actualPoints.length - 1)}
          cy={getY(last.price)}
          r="5"
          fill="var(--orange)"
          stroke="var(--panel)"
          strokeWidth="3"
        />
        <circle
          cx={getX(allPoints.length - 1)}
          cy={getY(forecastPoints[forecastPoints.length - 1].price)}
          r="5"
          fill="var(--blue)"
          stroke="var(--panel)"
          strokeWidth="3"
        />
      </svg>

      <div className="chart-axis">
        <span>{formatTime(actualPoints[0].time)}</span>
        <span>{formatTime(actualPoints[Math.floor(actualPoints.length / 2)].time)}</span>
        <span>Now</span>
        <span>+6h</span>
      </div>

      <div className="chart-legend">
        <span><i className="legend-dot orange" />Live BTC price</span>
        <span><i className="legend-dot blue" />ML forecast</span>
        <span><i className="legend-dot gray" />Forecast starts</span>
      </div>
    </div>
  )
}

export default function Page() {
  const [period, setPeriod] = useState('7D')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [menuOpen, setMenuOpen] = useState(false)
  const [alertOn, setAlertOn] = useState(false)
 const [showAllAccuracy, setShowAllAccuracy] = useState(false)
const [prediction, setPrediction] = useState<Prediction | null>(null)
const [predictionLoading, setPredictionLoading] = useState(true)
const [predictionError, setPredictionError] = useState('')
  useEffect(() => {
    let cancelled = false

    async function loadPrediction() {
      try {
        setPredictionLoading(true)
        setPredictionError('')

        const apiUrl =
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1'
            ? 'http://127.0.0.1:8000/api/predict'
            : '/api/predict'

       const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({}),
})

        if (!response.ok) {
          throw new Error('Live Python prediction request failed')
        }

        const data = await response.json()

        if (!cancelled) {
          setPrediction(data)
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setPredictionError('Live Python model unavailable')
        }
      } finally {
        if (!cancelled) {
          setPredictionLoading(false)
        }
      }
    }

    loadPrediction()
    const interval = window.setInterval(loadPrediction, 60_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const chance = useMemo(() => {
    if (!prediction) return 'Calculating'
    return prediction.confidence >= 75
      ? 'High confidence'
      : prediction.confidence >= 60
        ? 'Mid confidence'
        : 'Low confidence'
  }, [prediction])

  const sentiment = prediction
    ? prediction.fear_greed >= 75
      ? 'Extreme Greed'
      : prediction.fear_greed >= 55
        ? 'Greed'
        : prediction.fear_greed >= 45
          ? 'Neutral'
          : prediction.fear_greed >= 25
            ? 'Fear'
            : 'Extreme Fear'
    : 'Loading'

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">₿</div>
          <div>
            <strong>AC Predictor</strong>
            <span>Bitcoin intelligence</span>
          </div>
        </div>

        <nav className="desktop-nav">
          <a className="active" href="#overview">Overview</a>
          <a href="#analytics">Analytics</a>
          <a href="#methodology">Methodology</a>
        </nav>

        <div className="top-actions">
          <button className="icon-button" aria-label="Search">
            <Search size={18} />
          </button>
          <button
            className={`icon-button ${alertOn ? 'is-active' : ''}`}
            onClick={() => setAlertOn(!alertOn)}
            aria-label="Toggle alerts"
          >
            <Bell size={18} />
          </button>
          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav className="mobile-nav">
          <a href="#overview">Overview</a>
          <a href="#analytics">Analytics</a>
          <a href="#methodology">Methodology</a>
        </nav>
      )}

      <div className="page-content" id="overview">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              <span className="live-dot" />
              {predictionLoading ? 'Connecting to live market...' : 'Market is live'}
            </p>
            <h1>Bitcoin outlook</h1>
            <p className="subheading">
              Live market data + machine learning prediction.
            </p>
          </div>

          <div className="heading-actions">
            <label className="currency-picker">
              <span>Currency</span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as Currency)}
                aria-label="Select currency"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </label>

            <button className="outline-button">
              <Clock3 size={16} />
              {prediction
                ? `Updated ${new Date(prediction.updated_at * 1000).toLocaleTimeString('en-US', {
                   hour: '2-digit',
                   minute: '2-digit',
                   })}`
                 : 'Updating...'}
            </button>
          </div>
        </div>

        <section className="hero-grid">
          <article className="panel quote-card">
            <div className="panel-kicker">
              <span>BTC / {currency}</span>
              <span className={prediction && prediction.change_24h >= 0 ? 'positive' : 'negative'}>
                {prediction && prediction.change_24h >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                {prediction ? `${prediction.change_24h >= 0 ? '+' : ''}${prediction.change_24h}%` : '--'}
              </span>
            </div>

            <div className="quote-price">
              {prediction ? formatPrice(prediction.current_price, currency) : 'Loading...'}
            </div>

            <div className="quote-change">
              {prediction
                ? `${prediction.change_24h >= 0 ? '+' : ''}${formatPrice(
                    prediction.current_price * Math.abs(prediction.change_24h) / 100,
                    currency,
                  )}`
                : '--'}
              <span>24h</span>
            </div>

            <div className="quote-foot">
              <span>
                <Activity size={15} />
                Vol. {prediction ? formatCompact(prediction.volume_24h, currency) : '--'}
              </span>
              <span>
                <Wallet size={15} />
                Mkt cap {prediction ? formatCompact(prediction.market_cap, currency) : '--'}
              </span>
            </div>
          </article>

          <article className="panel forecast-card">
            <div className="panel-heading">
              <div>
                <p className="label">LIVE ML MODEL FORECAST</p>
                <h2>
                  {predictionLoading
                    ? 'Training on market data...'
                    : prediction?.trend === 'Bullish'
                      ? 'Upward pressure'
                      : prediction?.trend === 'Bearish'
                        ? 'Downward pressure'
                        : 'Neutral outlook'}
                </h2>
              </div>

              <div className="signal-icon">
                <TrendingUp size={20} />
              </div>
            </div>

            {predictionError ? (
              <div className="forecast-price">{predictionError}</div>
            ) : prediction ? (
              <>
                <div className="forecast-price">
                  {formatPrice(prediction.predicted_price, currency)}
                  <span>
                    {prediction.change_percent >= 0 ? '+' : ''}
                    {prediction.change_percent}%
                  </span>
                </div>

                <div className="confidence-row">
                  <div>
                    <span className="label">ML confidence</span>
                    <strong>{prediction.confidence}%</strong>
                  </div>

                  <div className="chance-badge">
                    <span />
                    {prediction.trend} · {chance}
                  </div>
                </div>

                <div className="confidence-bar">
                  <span style={{ width: `${prediction.confidence}%` }} />
                </div>

                <p className="forecast-note">
                  Trained on {prediction.training_candles} historical hourly candles.
                  Forecast horizon: {prediction.horizon}. Probability of upward movement: {prediction.probability_up}%.
                </p>
              </>
            ) : (
              <div className="forecast-price">Loading live model...</div>
            )}
          </article>
        </section>

        <section className="panel chart-panel" id="analytics">
          <div className="section-heading">
            <div>
              <p className="label">PRICE ACTION</p>
              <h2>Live price history & ML forecast</h2>
            </div>

            <div className="period-tabs" role="tablist">
              {periods.map((item) => (
                <button
                  key={item}
                  className={period === item ? 'selected' : ''}
                  onClick={() => setPeriod(item)}
                  role="tab"
                  aria-selected={period === item}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <PriceChart
            period={period}
            currency={currency}
            prediction={prediction}
          />
        </section>

        <section className="analytics-grid">
          <article className="panel indicators-panel">
            <div className="section-heading">
              <div>
                <p className="label">SIGNAL STRENGTH</p>
                <h2>Technical indicators</h2>
              </div>
              <Settings2 size={18} className="muted-icon" />
            </div>

            <div className="indicator-list">
              <div className="indicator">
                <div className="indicator-name">
                  <span>RSI (14)</span>
                  <strong>{prediction ? prediction.rsi : '--'}</strong>
                </div>
                <div className="mini-bar">
                  <span style={{ width: `${Math.min(prediction?.rsi ?? 0, 100)}%` }} />
                </div>
                <span className="indicator-status bullish">
                  {prediction && prediction.rsi >= 50 ? 'Bullish' : 'Bearish'}
                </span>
              </div>

              <div className="indicator">
                <div className="indicator-name">
                  <span>MACD histogram</span>
                  <strong>{prediction ? `${prediction.macd >= 0 ? '+' : ''}${prediction.macd}` : '--'}</strong>
                </div>
                <div className="mini-bar">
                  <span style={{ width: `${prediction ? Math.min(100, Math.max(12, 50 + prediction.macd / 5)) : 0}%` }} />
                </div>
                <span className={`indicator-status ${prediction && prediction.macd >= 0 ? 'bullish' : 'caution'}`}>
                  {prediction && prediction.macd >= 0 ? 'Bullish' : 'Weak'}
                </span>
              </div>

              <div className="indicator">
                <div className="indicator-name">
                  <span>Moving average</span>
                  <strong>{prediction ? formatPrice(prediction.moving_average, currency) : '--'}</strong>
                </div>
                <div className="mini-bar">
                  <span
                    style={{
                      width: prediction
                        ? `${Math.min(100, Math.max(10, (prediction.current_price / prediction.moving_average) * 50))}%`
                        : '0%',
                    }}
                  />
                </div>
                <span className="indicator-status bullish">
                  {prediction && prediction.current_price >= prediction.moving_average ? 'Above MA' : 'Below MA'}
                </span>
              </div>

              <div className="indicator">
                <div className="indicator-name">
                  <span>Fear & Greed</span>
                  <strong>{prediction ? `${prediction.fear_greed} / 100` : '--'}</strong>
                </div>
                <div className="mini-bar">
                  <span className="yellow" style={{ width: `${prediction?.fear_greed ?? 0}%` }} />
                </div>
                <span className="indicator-status caution">{sentiment}</span>
              </div>
            </div>
          </article>

          <article className="panel market-panel">
            <div className="section-heading">
              <div>
                <p className="label">MARKET PULSE</p>
                <h2>Key metrics</h2>
              </div>
              <Gauge size={19} className="muted-icon" />
            </div>

            <div className="metric-grid">
              <div>
                <span>24h high</span>
                <strong>{prediction ? formatPrice(prediction.high_24h, currency) : '--'}</strong>
              </div>
              <div>
                <span>24h low</span>
                <strong>{prediction ? formatPrice(prediction.low_24h, currency) : '--'}</strong>
              </div>
              <div>
                <span>ML probability</span>
                <strong>{prediction ? `${prediction.probability_up}%` : '--'}</strong>
              </div>
              <div>
                <span>Forecast horizon</span>
                <strong>{prediction?.horizon ?? '--'}</strong>
              </div>
            </div>

            <div className="market-sentiment">
              <div>
                <span>Market sentiment</span>
                <strong>{prediction ? prediction.fear_greed_label : 'Loading'}</strong>
              </div>
              <div className="sentiment-track">
                <span style={{ width: `${prediction?.fear_greed ?? 0}%` }} />
              </div>
              <div className="sentiment-labels">
                <span>Fear</span>
                <span>Neutral</span>
                <span>Greed</span>
              </div>
            </div>
          </article>
        </section>

        <section className="panel accuracy-panel" id="methodology">
          <div className="section-heading">
            <div>
              <p className="label">MODEL</p>
              <h2>Machine learning methodology</h2>
            </div>
            <button
              className="text-button"
              onClick={() => setShowAllAccuracy(!showAllAccuracy)}
              aria-expanded={showAllAccuracy}
            >
              {showAllAccuracy ? 'Show less' : 'View details'} <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="accuracy-footer">
            <span>
              <Sparkles size={16} />
              {prediction
                ? `${prediction.model} · ${prediction.training_candles} training samples`
                : 'Preparing model...'}
            </span>
            <span className="disclaimer">
              <CircleHelp size={14} />
              Not financial advice
            </span>
          </div>

          {showAllAccuracy && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Stage</th>
                    <th>What happens</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1. Market data</td>
                    <td>Fetches fresh BTC/USDT hourly candles</td>
                    <td>Binance</td>
                  </tr>
                  <tr>
                    <td>2. Features</td>
                    <td>RSI, MACD, returns, moving averages, volume and volatility</td>
                    <td>Derived from candles</td>
                  </tr>
                  <tr>
                    <td>3. Training</td>
                    <td>Logistic + linear regression trained on historical samples</td>
                    <td>Rolling historical window</td>
                  </tr>
                  <tr>
                    <td>4. Prediction</td>
                    <td>Estimates direction and 6-hour price movement</td>
                    <td>Live feature vector</td>
                  </tr>
                  <tr>
                    <td>5. Sentiment</td>
                    <td>Adds the latest Fear & Greed reading to the dashboard</td>
                    <td>Alternative.me</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer>
          <span>AC Predictor · Live data refreshed every minute</span>
          <span>ML Model v3.0.0</span>
        </footer>
      </div>
    </main>
  )
}
