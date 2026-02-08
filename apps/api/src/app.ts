import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import { logger } from "./logger";
import routes from "./routes";

dotenv.config();

const app: Express = express();

import expressWinston from "express-winston";

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "https://your-shopflow-app.vercel.app", // Add your Vercel URL here
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use(expressWinston.logger({
  winstonInstance: logger,
  statusLevels: true, // Output different log levels for different status codes
  meta: true, // optional: control whether you want to log the meta data about the request (default to true)
  msg: "HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
  expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
  colorize: false, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
  ignoreRoute: function (req, res) { return false; } // optional: allows to skip some log messages based on request and/or response
}));

// Clerk Middleware - adds auth context to all requests
app.use(clerkMiddleware());

// Health Check
app.get("/", (req: Request, res: Response) => {
  res.json({ 
    status: "ok",
    message: "ShopFlow API is running...",
    version: "1.0.0"
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ 
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Import routes

// Use routes
app.use("/api", routes);


export default app;
