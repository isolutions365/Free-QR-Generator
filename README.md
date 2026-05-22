# Free QR Generator 🚀

Free QR Generator is an all-in-one, custom-design QR Code workstation and real-time analytics tracker. Built using a robust full-stack React + Express framework, it enables creating customized QR codes (adjusting corners, internal dots, gradients, and custom logos) while tracking scan locations, browsers, and user hardware characteristics securely.

---

## 🛠 Features

### 💻 Frontend (Web App Workspace)
- **Visual Options**: Style QR codes with customizable solid or linear/radial gradient foregrounds, position corner styles (*Square, Rounded, Circle, Leaf*), internal dot shapes (*Square, Circles, Smooth Rounded, Connected Classy*), and customized centerpiece brand logos with precise error-correction scales.
- **Dynamic Previews**: Render responsive canvas templates client-side.
- **Flexible Exporters**: Instantly print high-resolution SVG vector codes, premium PNG structures, or print directly to custom PDF layout sheets.
- **Simulation Suite**: Built-in smartphone simulator that decodes canvas elements quickly to ensure readability before printing.
- **Projects Save**: Save setups directly to your history ledger. Restore complex presets instantly with a single click.

### 🔌 Backend (Scan Tracking Redirections API)
- **Analytics Trackers**: QR short links point to `/qr/:trackingId`. When clicked, the Express controller inspects header states, extracts hardware agents/browser targets, approximates geographical cities based on IP language fallbacks, increments the project's scan counters, and redirects cleanly to the final target location.
- **Mock Inject Sandbox**: An options slider to inject synthetic logs instantly, checking dashboards and map matrices easily in offline sandboxes.
- **Rate-Limiting**: Blocks denial-of-service/financial wallet exhaust attacks using a sliding limit (Max 100 API reads/min per origin IP).
- **CORS & CORS-Preflights**: Universal access configuration for mobile sync frameworks.

### 📱 Mobile (Android & iOS Deliverables)
- Includes completed React Native (TypeScript) and Flutter (Dart) camera scanning core boilers using best-practice native dependencies (like `mobile_scanner` and `react-native-vision-camera`), with local storage persistent caching mechanisms for offline operations.

---

## 📂 Project Directory Structure

```text
/
├── firebase-applet-config.json  # Safe intermediate schema mappings for standard Firestore
├── package.json                 # Custom scripts (tsx, esbuild, bundlers, and packages)
├── tsconfig.json                # TypeScript bundler resolutions
├── vite.config.ts               # Vite configuration with strict HMR switches
├── server.ts                    # Express API server (Rate limiter, tracking redirects, project history)
├── db.json                      # Local JSON persistent database (auto-loaded & saved)
└── src/
    ├── main.tsx                 # Web mounting entry point
    ├── App.tsx                  # Primary workspace manager (Tab view controllers, API syncs, profile modal)
    ├── index.css                # CSS typography definitions (Inter, Space Grotesk, JetBrains Mono)
    ├── types.ts                 # Shared global schemas
    ├── lib/
    │   └── firebase.ts          # Safe Firestore & Auth triggers (redundant offline-resilience fallbacks)
    ├── utils/
    │   └── qrRenderer.ts        # QR Core Engine (Computes matrix and prints canvas & SVG tags)
    └── components/
        ├── ControlPanel.tsx     # Custom QR type builders, gradient widgets, custom eye-selectors
        ├── PreviewPanel.tsx     # Live preview canvas, PDF printable, copy links and scanner
        ├── SavedProjects.tsx    # Saved designs ledger, copy/test direct short URLs, Backup exports
        ├── AnalyticsDashboard.tsx # Recharts board, metrics matrices, logs tables, map trackers
        └── MobileAppMockup.tsx  # Smartphone frame rendering Flutter and React Native deliverables
```

---

## 🚀 Installation & Localhost Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn package managers

### Steps
1. **Clone & Extract Workspace** into any local folder.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment variables** by establishing a `.env` file referencing `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. **Boot Up Development Server**:
   ```bash
   npm run dev
   ```
   *This starts the integrated Express server on `http://localhost:3000` with the Vite frontend running on the background.*
5. **Compile Production Bundle**:
   ```bash
   npm run build
   ```
6. **Deploy or Run Production Server**:
   ```bash
   npm run start
   ```

---

## 📡 API Documentation Specs

All endpoints reside under the `/api/` routing namespace (except tracking redirects):

### 1. Health & Resilience Status
- **Method**: `GET /api/health`
- **Output**:
  ```json
  { "status": "ok", "persistence": true, "activeProjects": 3 }
  ```

### 2. Save Workspace Project
- **Method**: `POST /api/qr/projects`
- **Payload**:
  ```json
  {
    "id": "proj-983",
    "userId": "user-LeadDev",
    "name": "My Workspace QR",
    "type": "url",
    "content": "https://google.com",
    "design": {
      "size": 350,
      "margin": 20,
      "fgColor": "#0f172a",
      "bgColor": "#ffffff",
      "gradientType": "radial",
      "gradientColor": "#4f46e5",
      "dotStyle": "classy",
      "eyeStyle": "leaf",
      "errorCorrectionLevel": "Q"
    },
    "trackingEnabled": true,
    "trackingId": "g2y8da"
  }
  ```

### 3. Load Saved Project Ledger
- **Method**: `GET /api/qr/projects?userId=user-LeadDev`
- **Output**: Array of Saved QR configuration records.

### 4. Delete Project Preset
- **Method**: `DELETE /api/qr/projects/:id`
- **Output**: Confirmation status.

### 5. Capture & Click Redirect Scan Analytics
- **Method**: `GET /qr/:trackingId`
- **Function**: Automatically captures request headers, maps User-Agent to device types (Mobile, Desktop, Tablet, etc.) and locations, increments scan logs records on `db.json`, then triggers an instantaneous `302 HTTP redirect` redirecting browser assets to the target destination.

### 6. Get Comprehensive Analytics Reports
- **Method**: `GET /api/qr/analytics?userId=user-LeadDev`
- **Output**: Compiled scan records detailing locations, times, devices, browsers and IPs.

---

## 🔐 Quality & Security Architecture

1. **Zero-Trust Input Safety**: Restricts string input arrays using length limit filters, preventing network spam exhaustion payloads.
2. **Double-Layer Data Resilience**: Fallbacks immediately to fast local cache blocks during database connection drops, aligning with enterprise workflows.
3. **Rate Limiting Protection**: Custom middleware protecting computational processes from request flooding.
