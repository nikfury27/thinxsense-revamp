# 🌡️ Thinxsense IIoT Platform (Revamp)

An enterprise-grade Industrial IoT (IIoT) & Cold Chain Monitoring platform. Built with **React 19**, **Vite**, **Tailwind CSS**, and **Node.js/Express**, Thinxsense provides real-time environmental telemetry tracking, Excursion Severity Index (ESI) analytics, spatial thermal heatmaps, an automated AI support bot, and a Meta WhatsApp live human escalation bridge.

---

## 🚀 Key Features

* **⚡ Real-Time Telemetry & Alerting**: Live tracking of BLE sensors, gateway statuses, temperature/humidity excursions, and battery health.
* **📊 Excursion Severity Index (ESI)**: Weighted mathematical scoring (`ESI = Deviation × Duration`) to prioritize critical excursions over transient spikes.
* **🗺️ Spatial Thermal Heatmap**: 2D grid visualization of warehouse chambers with multi-sensor inverse distance weighting (IDW) interpolation.
* **🤖 Conversational AI Bot**: Built-in chat assistant offering automated system status reports, alert queries, and sensor locator utilities.
* **💬 Meta WhatsApp Escalation Bridge**: Direct handoff from web chat to support staff on WhatsApp with session mapping, FIFO queue management, and support console monitoring.
* **🎧 Support Console View**: Real-time admin dashboard for support agents to observe active chats, monitor queues, and respond directly.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, Vite, Tailwind CSS, Chart.js
* **Backend**: Node.js, Express, WebSockets (`ws`), CORS, Dotenv
* **Orchestration**: Concurrently (runs frontend & backend together)

---

## 📋 Prerequisites

Before running the project, ensure you have the following installed on your machine:

* **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
* **npm**: `v9.0.0` or higher (comes bundled with Node.js)
* **Git**: ([Download Git](https://git-scm.com/))

Check your installed versions by running:
```bash
node -v
npm -v
git --version
```

---

## ⚙️ Environment Configuration

1. Navigate to the `server` directory.
2. Create a `.env` file by copying `.env.example`:

### 🪟 Windows (Command Prompt - CMD):
```cmd
copy server\.env.example server\.env
```

### 🍎 macOS / Linux (Terminal):
```bash
cp server/.env.example server/.env
```

3. Update `server/.env` with your actual Meta API credentials if testing live WhatsApp messaging:
```env
PORT=5000
META_ACCESS_TOKEN=your_meta_access_token
META_PHONE_NUMBER_ID=your_phone_number_id
META_APP_SECRET=your_app_secret
WEBHOOK_VERIFY_TOKEN=thinxsense_token
AGENT_PHONE_NUMBER=whatsapp:+1234567890
```
*(Note: If Meta API keys are omitted or set to mock values, the backend automatically runs in **Mock WhatsApp Mode** for local testing without external API calls).*

---

## 📥 Installation Steps

Follow these steps according to your operating system to set up the project:

### 🪟 Windows (Command Prompt - CMD)

1. **Clone the Repository**:
   ```cmd
   git clone https://github.com/nikfury27/thinxsense-revamp.git
   cd thinxsense-revamp
   ```

2. **Install Root (Frontend) Dependencies**:
   ```cmd
   npm install
   ```

3. **Install Server (Backend) Dependencies**:
   ```cmd
   cd server
   npm install
   cd ..
   ```

---

### 🍎 macOS / Linux (Terminal)

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/nikfury27/thinxsense-revamp.git
   cd thinxsense-revamp
   ```

2. **Install Root (Frontend) Dependencies**:
   ```bash
   npm install
   ```

3. **Install Server (Backend) Dependencies**:
   ```bash
   cd server && npm install && cd ..
   ```

---

## ▶️ Running the Application

### Method 1: Concurrent Execution (Recommended)

Run both the React Vite frontend and the Express Node.js backend simultaneously in a single terminal command.

#### 🪟 Windows (CMD):
```cmd
npm run dev
```

#### 🍎 macOS / Linux (Terminal):
```bash
npm run dev
```

* **Frontend Web App**: [`http://localhost:5173`](http://localhost:5173)
* **Backend API & WebSockets**: [`http://localhost:5000`](http://localhost:5000)

---

### Method 2: Running Frontend & Backend Separately

If you prefer to run the client and server in dedicated terminal windows:

#### 1️⃣ Terminal 1: Backend Express Server
* **Windows (CMD)**:
  ```cmd
  npm run server
  ```
* **macOS / Linux (Terminal)**:
  ```bash
  npm run server
  ```

#### 2️⃣ Terminal 2: Frontend Vite App
* **Windows (CMD)**:
  ```cmd
  npx vite
  ```
* **macOS / Linux (Terminal)**:
  ```bash
  npx vite
  ```

---

## 📜 Available NPM Scripts

From the root directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs frontend (Vite) & backend (Node server) concurrently |
| `npm run server` | Starts only the backend Express server on port `5000` |
| `npm run build` | Compiles production build for frontend in `dist/` |
| `npm run preview` | Previews the compiled production build locally |
| `npm run lint` | Runs Oxlint linter across the codebase |

---

## 📂 Project Structure

```
thinxsense-revamp/
├── public/                 # Static web assets
├── server/                 # Express backend server
│   ├── .env.example        # Environment variables template
│   ├── db.js               # In-memory database & file persistence engine
│   ├── db.json             # DB persistence storage file
│   ├── mockData.js         # Sensor, Gateway, and Alert mock datasets
│   ├── package.json        # Backend dependencies (express, ws, cors, dotenv)
│   └── server.js           # REST API, WebSocket server & Meta Webhook handlers
├── src/                    # React frontend application
│   ├── components/         # Navigation, Header, Login, Support, AI Chatbot
│   ├── views/              # Groups, Sensors, Alerts, Heatmap views
│   ├── App.jsx             # Main Application Routing & State
│   └── main.jsx            # React Entry Point
├── index.html              # HTML entry point
├── package.json            # Root configuration & scripts (vite, react, concurrently)
├── tailwind.config.js      # Tailwind CSS design system configuration
├── WHATSAPP_SETUP.md       # Detailed Meta WhatsApp Developer integration guide
├── HEATMAP_FORMULAS.md     # Thermal interpolation mathematical formulas
├── LOGICS.md               # Sensor neighbor validation & ESI calculation logics
└── README.md               # Project documentation & run guide
```

---

## 📖 Extended Documentation

* 💬 [WhatsApp Integration Guide](WHATSAPP_SETUP.md): Instructions for setting up Meta App Developer credentials and Webhook tunnels.
* 🌡️ [Thermal Heatmap Formulas](HEATMAP_FORMULAS.md): IDW mathematical calculations and grid interpolation logic.
* ⚙️ [Business & Validation Logic](LOGICS.md): Spatial neighbor consensus algorithm and ESI scoring formulas.
* 🏗️ [Backend Architecture Blueprint](backend_architecture_kt.md): Production SQL schemas, TimescaleDB, and API specifications.

---

## 📄 License

This repository is maintained for Thinxsense IIoT Platform Revamp. All rights reserved.
