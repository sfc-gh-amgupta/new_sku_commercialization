# Nestlé US Launch Optimizer — React App

Interactive 11-dashboard application for monitoring new product launch performance across retailers, geographies, and consumer sentiment. Built with Next.js, React, Plotly.js, Tailwind CSS, and TypeScript.

## Quick Start

**Prerequisites:** Node.js 18+ installed ([download](https://nodejs.org))

```bash
unzip nestle-launch-react.zip
cd nestle-launch-react
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

## What's Included

### 11 Dashboards
| Page | Description |
|------|-------------|
| Executive Summary | KPIs, health scorecard, critical alerts, Snowflake Intelligence chat |
| Sales Performance | Revenue vs forecast by SKU × retailer |
| Distribution | Store build tracking, ACV by retailer |
| Pricing Compliance | MAP compliance trends, retailer violations |
| Promotions | Execution rates, lift analysis, promo calendar |
| Trial & Repeat | HH penetration, repeat rates, new buyer acquisition |
| Consumer Sentiment | Social/NPS with benchmarks, verbatim comments, alerts |
| Geo Performance | US state choropleth heatmap with retailer/time filters |
| Inventory Management | OOS risk, DC stock, diversion optimization |
| Architecture | Data sources, Snowflake features, dashboard coverage map |

### 4 SKUs (Synthetic Data)
- Starbucks Iced Espresso Classics 40oz (RTD Coffee)
- DiGiorno Croissant Crust Pizza 26oz (Frozen Pizza)
- Toll House Edible Cookie Dough Bites 8oz (Sweet Snacks)
- Purina Pro Plan LiveClear 7lb (Pet Food)

### 4 Retailers
Walmart, Kroger, Target, Costco

### Key Features
- Snowflake Intelligence conversational AI interface
- Critical alert detection with root cause analysis
- Consumer sentiment benchmarked against prior launches with verbatim quotes
- US geo heatmap with SKU × retailer × time period filtering
- Inventory diversion optimization with haversine distance calculations
- Health scoring across 6 dimensions (sales, distribution, pricing, promo, trial, sentiment)

## Sharing on Your Network

To let others on your WiFi/VPN access the app:

```bash
npx next dev --hostname 0.0.0.0
```

Others open: `http://<your-ip>:3000`
Find your IP: `ipconfig getifaddr en0` (Mac) or `hostname -I` (Linux)

## SPCS Deployment

See `DEPLOY-TO-SPCS.md` for full instructions on deploying to Snowpark Container Services. Includes Dockerfile, service spec, and role-based access grants.

## Tech Stack
- **Next.js 14** — App Router, file-based routing
- **React 18** — Client-side rendering
- **Plotly.js** — Interactive charts, US choropleth maps
- **Tailwind CSS** — Dark Snowflake-branded theme
- **TypeScript** — Type-safe synthetic data layer with seeded PRNG
