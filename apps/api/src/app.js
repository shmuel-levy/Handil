const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Browsers often open http://localhost:4000/ — avoid a confusing 404 during local dev.
app.get("/", (req, res) => {
  res.status(200).json({
    service: "handil-api",
    hint: "Use GET /api/health to verify the server is up."
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "handil-api" });
});

module.exports = app;
