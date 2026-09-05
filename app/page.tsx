'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronDown,
  CircleHelp,
  Clock3,
  Gauge,
  LineChart,
  Menu,
  Moon,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'

const periods = ['24H', '7D', '30D', '90D']
const points = [42, 46, 43, 50, 48, 57, 54, 59, 63, 61, 68, 66, 72, 70, 77, 74, 81, 79, 84, 82, 87, 84, 91, 88]
const forecastPoints = [88, 91, 94, 93, 97, 101, 99, 106, 110, 108, 114, 118]

function formatPrice(value: number) {
  return `$${value.toLocaleString('en-US')}`
}

function PriceChart({ period }: { period: string }) {
  const allPoints = [...points, ...forecastPoints]
  const width = 760
  const height = 250
  const min = 30
  const max = 125
  const getX = (index: number) => (index / (allPoints.length - 1)) * width
  const getY = (value: number) => height - ((value - min) / (max - min)) * height
  const actual = points.map((value, index) => `${getX(index)},${getY(value)}`).join(' ')
  const forecast = forecastPoints.map((value, index) => `${getX(index + points.length - 1)},${getY(value)}`).join(' ')
  const fill = `0,${height} ${actual} ${width * (points.length - 1) / (allPoints.length - 1)},${height}`

  return (
    <div className="chart-wrap">
      <div className="chart-meta"><span>BTC / USD</span><span>{period} performance</span></div>
      <svg className="price-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Bitcoin ${period} price history and forecast`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--orange)" stopOpacity=".2" />
            <stop offset="100%" stopColor="var(--orange)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="0" x2={width} y1={line * height / 4} y2={line * height / 4} className="chart-grid" />)}
        <polygon points={fill} fill="url(#areaFill)" />
        <polyline points={actual} fill="none" stroke="var(--orange)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={forecast} fill="none" stroke="var(--blue)" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" strokeLinejoin="round" />
        <line x1={getX(points.length - 1)} x2={getX(points.length - 1)} y1="0" y2={height} className="forecast-divider" />
        <circle cx={getX(points.length - 1)} cy={getY(points[points.length - 1])} r="5" fill="var(--orange)" stroke="var(--panel)" strokeWidth="3" />
        <circle cx={getX(allPoints.length - 1)} cy={getY(allPoints[allPoints.length - 1])} r="5" fill="var(--blue)" stroke="var(--panel)" strokeWidth="3" />
      </svg>
      <div className="chart-axis"><span>Sep 01</span><span>Sep 05</span><span>Sep 09</span><span>Sep 13</span><span>Sep 17</span><span>Sep 21</span></div>
      <div className="chart-legend"><span><i className="legend-dot orange" />Actual price</span><span><i className="legend-dot blue" />Model forecast</span><span><i className="legend-dot gray" />Forecast starts</span></div>
    </div>
  )
}

export default function Page() {
  const [period, setPeriod] = useState('7D')
  const [menuOpen, setMenuOpen] = useState(false)
  const [alertOn, setAlertOn] = useState(false)
  const confidence = useMemo(() => period === '24H' ? 82 : period === '7D' ? 76 : period === '30D' ? 64 : 52, [period])
  const chance = confidence >= 75 ? 'High chance' : confidence >= 60 ? 'Mid chance' : 'Low chance'

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">₿</div><div><strong>Satoshi Signal</strong><span>Bitcoin intelligence</span></div></div>
        <nav className="desktop-nav"><a className="active" href="#overview">Overview</a><a href="#analytics">Analytics</a><a href="#methodology">Methodology</a></nav>
        <div className="top-actions"><button className="icon-button" aria-label="Search"><Search size={18} /></button><button className={`icon-button ${alertOn ? 'is-active' : ''}`} onClick={() => setAlertOn(!alertOn)} aria-label="Toggle alerts"><Bell size={18} /></button><button className="profile-button"><span className="avatar">JD</span><span className="profile-name">Jordan Davis</span><ChevronDown size={15} /></button><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
      </header>
      {menuOpen && <nav className="mobile-nav"><a href="#overview">Overview</a><a href="#analytics">Analytics</a><a href="#methodology">Methodology</a></nav>}

      <div className="page-content" id="overview">
        <div className="page-heading"><div><p className="eyebrow"><span className="live-dot" />Market is live</p><h1>Bitcoin outlook</h1><p className="subheading">A clearer read on where BTC may be heading next.</p></div><button className="outline-button"><Clock3 size={16} /> Last updated 2 min ago</button></div>

        <section className="hero-grid">
          <article className="panel quote-card"><div className="panel-kicker"><span>BTC / USD</span><span className="positive"><ArrowUpRight size={15} /> 2.84%</span></div><div className="quote-price">$67,428.12</div><div className="quote-change">+$1,864.32 <span>today</span></div><div className="quote-foot"><span><Activity size={15} />Vol. $28.4B</span><span><Wallet size={15} />Mkt cap $1.33T</span></div></article>
          <article className="panel forecast-card"><div className="panel-heading"><div><p className="label">Model forecast</p><h2>Upward pressure</h2></div><div className="signal-icon"><TrendingUp size={20} /></div></div><div className="forecast-price">$71,850 <span>+6.6%</span></div><div className="confidence-row"><div><span className="label">Confidence</span><strong>{confidence}%</strong></div><div className={`chance-badge ${chance.toLowerCase().replace(' ', '-')}`}><span />{chance} of correct prediction</div></div><div className="confidence-bar"><span style={{ width: `${confidence}%` }} /></div><p className="forecast-note">Model sees accumulation across 4 of 5 leading indicators.</p></article>
        </section>

        <section className="panel chart-panel" id="analytics"><div className="section-heading"><div><p className="label">Price action</p><h2>Price history & forecast</h2></div><div className="period-tabs" role="tablist">{periods.map((item) => <button key={item} className={period === item ? 'selected' : ''} onClick={() => setPeriod(item)} role="tab" aria-selected={period === item}>{item}</button>)}</div></div><PriceChart period={period} /></section>

        <section className="analytics-grid">
          <article className="panel indicators-panel"><div className="section-heading"><div><p className="label">Signal strength</p><h2>Technical indicators</h2></div><Settings2 size={18} className="muted-icon" /></div><div className="indicator-list"><div className="indicator"><div className="indicator-name"><span>RSI (14)</span><strong>61.8</strong></div><div className="mini-bar"><span style={{ width: '62%' }} /></div><span className="indicator-status bullish">Bullish</span></div><div className="indicator"><div className="indicator-name"><span>MACD</span><strong>+184.2</strong></div><div className="mini-bar"><span style={{ width: '74%' }} /></div><span className="indicator-status bullish">Bullish</span></div><div className="indicator"><div className="indicator-name"><span>Moving average</span><strong>$64,920</strong></div><div className="mini-bar"><span style={{ width: '82%' }} /></div><span className="indicator-status bullish">Above MA</span></div><div className="indicator"><div className="indicator-name"><span>Fear & Greed</span><strong>74 / 100</strong></div><div className="mini-bar"><span className="yellow" style={{ width: '74%' }} /></div><span className="indicator-status caution">Greed</span></div></div></article>
          <article className="panel market-panel"><div className="section-heading"><div><p className="label">Market pulse</p><h2>Key metrics</h2></div><Gauge size={19} className="muted-icon" /></div><div className="metric-grid"><div><span>24h high</span><strong>$68,140</strong></div><div><span>24h low</span><strong>$65,502</strong></div><div><span>Dominance</span><strong>53.8%</strong></div><div><span>Funding rate</span><strong className="positive">0.012%</strong></div></div><div className="market-sentiment"><div><span>Market sentiment</span><strong>Optimistic</strong></div><div className="sentiment-track"><span /></div><div className="sentiment-labels"><span>Fear</span><span>Neutral</span><span>Greed</span></div></div></article>
        </section>

        <section className="panel accuracy-panel" id="methodology"><div className="section-heading"><div><p className="label">Track record</p><h2>Recent prediction accuracy</h2></div><button className="text-button">View all <ArrowUpRight size={15} /></button></div><div className="table-wrap"><table><thead><tr><th>Forecast date</th><th>Horizon</th><th>Predicted</th><th>Actual</th><th>Result</th><th>Confidence</th></tr></thead><tbody><tr><td>Sep 14, 2026</td><td>24 hours</td><td>$66,980</td><td>$67,428</td><td><span className="result correct"><ShieldCheck size={14} />Correct</span></td><td>82%</td></tr><tr><td>Sep 12, 2026</td><td>7 days</td><td>$64,250</td><td>$65,841</td><td><span className="result correct"><ShieldCheck size={14} />Correct</span></td><td>76%</td></tr><tr><td>Sep 05, 2026</td><td>7 days</td><td>$69,800</td><td>$65,102</td><td><span className="result missed"><ArrowDownRight size={14} />Missed</span></td><td>68%</td></tr></tbody></table></div><div className="accuracy-footer"><span><Sparkles size={16} /> 78.4% average accuracy across the last 30 predictions</span><span className="disclaimer"><CircleHelp size={14} /> Not financial advice</span></div></section>
        <footer><span>Satoshi Signal · Data refreshed every 5 minutes</span><span>Model v2.4.1</span></footer>
      </div>
    </main>
  )
}
