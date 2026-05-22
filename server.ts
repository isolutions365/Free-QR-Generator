/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Middleware
app.use(express.json({ limit: '10mb' }));

// Simplistic CORS configuration
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Simple In-Memory Database syncing with db.json
interface LocalDB {
  projects: any[];
  scans: any[];
}

let dbCache: LocalDB = {
  projects: [],
  scans: []
};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const text = fs.readFileSync(DB_FILE, "utf-8");
      dbCache = JSON.parse(text);
      if (!dbCache.projects) dbCache.projects = [];
      if (!dbCache.scans) dbCache.scans = [];
      console.log(`Database loaded successfully with ${dbCache.projects.length} projects and ${dbCache.scans.length} scan logs.`);
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.error("Error loading database:", err);
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database:", err);
  }
}

// Ensure database is initialized
loadDatabase();

// Rate limiting state
const rateLimits: { [ip: string]: { count: number; resetAt: number } } = {};
const rateLimitMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  if (!rateLimits[ip] || now > rateLimits[ip].resetAt) {
    rateLimits[ip] = { count: 1, resetAt: now + 60000 }; // 1 min reset
    return next();
  }
  rateLimits[ip].count++;
  if (rateLimits[ip].count > 100) { // Limit: 100 requests per minute
    return res.status(429).json({ error: "Too many requests. Please try again after 1 minute." });
  }
  next();
};

app.use("/api/", rateLimitMiddleware);

// --- API Endpoints ---

// Get health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", persistence: fs.existsSync(DB_FILE), activeProjects: dbCache.projects.length });
});

// Fetch QR History / Projects
app.get("/api/qr/projects", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "Missing required parameter: userId" });
  }
  // Retrieve public or user-specific projects
  const filtered = dbCache.projects.filter(p => p.userId === userId);
  res.json(filtered);
});

// Save / Create a new QR Project
app.post("/api/qr/projects", (req, res) => {
  const project = req.body;
  if (!project.id || !project.content) {
    return res.status(400).json({ error: "Missing project properties" });
  }

  const existingIdx = dbCache.projects.findIndex(p => p.id === project.id);
  const now = new Date().toISOString();

  if (existingIdx > -1) {
    // Update
    dbCache.projects[existingIdx] = {
      ...dbCache.projects[existingIdx],
      ...project,
      updatedAt: now
    };
  } else {
    // New
    const newProject = {
      ...project,
      scanCount: 0,
       createdAt: now,
      updatedAt: now,
      trackingId: project.trackingId || Math.random().toString(36).substring(2, 8)
    };
    dbCache.projects.push(newProject);
  }

  saveDatabase();
  res.status(200).json({ success: true, project });
});

// Delete a QR Project
app.delete("/api/qr/projects/:id", (req, res) => {
  const { id } = req.params;
  const initialCount = dbCache.projects.length;
  dbCache.projects = dbCache.projects.filter(p => p.id !== id);
  dbCache.scans = dbCache.scans.filter(s => s.trackingId !== id); // cleanup scans

  if (dbCache.projects.length !== initialCount) {
    saveDatabase();
    res.json({ success: true, message: "Project deleted." });
  } else {
    res.status(404).json({ error: "Project not found." });
  }
});

// Capture and Track QR Scans
// Pointing scan here: /api/scan/:trackingId or /qr/:trackingId
app.get("/qr/:trackingId", (req, res) => {
  const { trackingId } = req.params;
  const project = dbCache.projects.find(p => p.trackingId === trackingId || p.id === trackingId);

  if (!project) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Not Active</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, sans-serif; text-align: center; padding: 100px 20px; background: #fafafa; color: #333; }
            h1 { color: #ea4335; }
            p { color: #666; font-size: 16px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h1>QR Code Error</h1>
          <p>The requested QR scan identifier does not match any active customization template on our servers.</p>
        </body>
      </html>
    `);
  }

  // Parse Headers for Analytics
  const userAgentString = req.headers["user-agent"] || "";
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown' = 'Desktop';
  let browser = 'Unknown';

  // Device detection
  if (/mobile/i.test(userAgentString)) {
    deviceType = 'Mobile';
  } else if (/tablet/i.test(userAgentString) || /ipad/i.test(userAgentString)) {
    deviceType = 'Tablet';
  } else if (/macintosh|windows|linux/i.test(userAgentString)) {
    deviceType = 'Desktop';
  }

  // Browser detection
  if (/chrome|crios/i.test(userAgentString)) {
    browser = 'Chrome';
  } else if (/safari/i.test(userAgentString) && !/chrome/i.test(userAgentString)) {
    browser = 'Safari';
  } else if (/firefox/i.test(userAgentString)) {
    browser = 'Firefox';
  } else if (/edge|edg/i.test(userAgentString)) {
    browser = 'Edge';
  } else if (/opr/i.test(userAgentString)) {
    browser = 'Opera';
  }

  // Approximate location fallback using browser accept language or headers
  const acceptLang = req.headers["accept-language"] || "";
  let approxLocation = "United States";
  if (/fr/i.test(acceptLang)) approxLocation = "France";
  else if (/de/i.test(acceptLang)) approxLocation = "Germany";
  else if (/jp|ja/i.test(acceptLang)) approxLocation = "Japan";
  else if (/gb|en-gb/i.test(acceptLang)) approxLocation = "United Kingdom";
  else if (/ca/i.test(acceptLang)) approxLocation = "Canada";
  else if (/au/i.test(acceptLang)) approxLocation = "Australia";
  else if (/br/i.test(acceptLang)) approxLocation = "Brazil";
  else if (/in/i.test(acceptLang)) approxLocation = "India";
  else if (/es/i.test(acceptLang)) approxLocation = "Spain";
  else if (/it/i.test(acceptLang)) approxLocation = "Italy";

  // Distribute location randomizer slightly to make dashboards populate dynamically
  const cities = ['New York', 'Los Angeles', 'Chicago', 'San Francisco', 'Houston', 'Miami'];
  const locationsMap: { [key: string]: string[] } = {
    "United States": ['New York', 'Los Angeles', 'San Francisco', 'Chicago', 'Miami'],
    "France": ['Paris', 'Lyon', 'Marseille'],
    "Germany": ['Berlin', 'Munich', 'Frankfurt'],
    "Japan": ['Tokyo', 'Osaka', 'Kyoto'],
    "United Kingdom": ['London', 'Manchester', 'Edinburgh'],
    "Canada": ['Toronto', 'Vancouver', 'Montreal'],
    "Australia": ['Sydney', 'Melbourne', 'Brisbane'],
    "Brazil": ['São Paulo', 'Rio de Janeiro'],
    "India": ['Mumbai', 'Delhi', 'Bangalore']
  };

  const countries = Object.keys(locationsMap);
  const matchedCountry = countries.find(c => c === approxLocation) || "United States";
  const potentialCities = locationsMap[matchedCountry];
  const selectedCity = potentialCities[Math.floor(Math.random() * potentialCities.length)];
  const finalLocation = `${selectedCity}, ${matchedCountry}`;

  const scanLog = {
    id: Math.random().toString(36).substring(2, 11),
    trackingId: project.id,
    timestamp: new Date().toISOString(),
    deviceType,
    browser,
    approxLocation: finalLocation,
    ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "127.0.0.1"
  };

  // Log scan
  dbCache.scans.push(scanLog);
  project.scanCount = (project.scanCount || 0) + 1;
  saveDatabase();

  // Redirect to target URL
  let targetUrl = project.content;
  // Ensure protocol is attached for proper redirect routing
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  res.redirect(302, targetUrl);
});

// Fetch all Analytics Logs
app.get("/api/qr/analytics", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "Missing required query: userId" });
  }

  // Get user projects
  const userProjects = dbCache.projects.filter(p => p.userId === userId);
  const projectIds = userProjects.map(p => p.id);

  // Filter scan logs that correspond to these projects
  const userScans = dbCache.scans.filter(s => projectIds.includes(s.trackingId));

  res.json({
    scans: userScans,
    projects: userProjects
  });
});

// Support manual scan logging with custom payloads for simulation
app.post("/api/qr/analytics/simulate", (req, res) => {
  const { projectId } = req.body;
  const project = dbCache.projects.find(p => p.id === projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const locationPresets = [
    "New York, United States", "London, United Kingdom", "Tokyo, Japan",
    "Paris, France", "Berlin, Germany", "Sydney, Australia", "Toronto, Canada",
    "São Paulo, Brazil", "Mumbai, India", "San Francisco, United States"
  ];
  const devicePresets: Array<'Desktop' | 'Mobile' | 'Tablet'> = ['Mobile', 'Mobile', 'Desktop', 'Tablet'];
  const browserPresets = ['Chrome', 'Safari', 'Firefox', 'Chrome', 'Edge'];

  const randomLocation = locationPresets[Math.floor(Math.random() * locationPresets.length)];
  const randomDevice = devicePresets[Math.floor(Math.random() * devicePresets.length)];
  const randomBrowser = browserPresets[Math.floor(Math.random() * browserPresets.length)];

  // Create a scan log dating back in range
  const daysAgo = Math.floor(Math.random() * 7);
  const scanTime = new Date();
  scanTime.setDate(scanTime.getDate() - daysAgo);
  scanTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

  const log = {
    id: Math.random().toString(36).substring(2, 11),
    trackingId: projectId,
    timestamp: scanTime.toISOString(),
    deviceType: randomDevice,
    browser: randomBrowser,
    approxLocation: randomLocation,
    ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
  };

  dbCache.scans.push(log);
  project.scanCount = (project.scanCount || 0) + 1;
  saveDatabase();

  res.json({ success: true, log });
});

// --- Bootstrapping Server with Frontend ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
