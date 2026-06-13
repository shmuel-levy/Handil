require("dotenv").config();
const http      = require("http");
const os        = require("os");
const mongoose  = require("mongoose");
const app       = require("./app");
const { initSocket } = require("./socket");

const PORT      = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

function getLanIPs() {
  const nets = os.networkInterfaces();
  const ips  = [];
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

async function startServer() {
  try {
    if (MONGO_URI) {
      await mongoose.connect(MONGO_URI);
      console.log("✅ MongoDB connected");
    } else {
      console.log("⚠️  MONGO_URI missing — starting without DB");
    }

    const httpServer = http.createServer(app);
    initSocket(httpServer);  // attach Socket.io

    httpServer.listen(PORT, "0.0.0.0", () => {
      const env = process.env.NODE_ENV ?? "development";
      const lanIPs = getLanIPs();
      console.log(`\n🚀 הנדיל API ready  [${env}]`);
      console.log(`   Local  → http://localhost:${PORT}`);
      if (env === "development") {
        for (const { name, address } of lanIPs) {
          console.log(`   LAN (${name}) → http://${address}:${PORT}  ← use this in .env`);
        }
        console.log(
          `\n📱 Update apps/mobile/.env:\n   EXPO_PUBLIC_API_BASE_URL=http://${lanIPs[0]?.address ?? "YOUR_IP"}:${PORT}/api\n`
        );
      }
    });

    // Graceful shutdown — lets Docker/cloud platforms drain connections cleanly
    function shutdown(signal) {
      console.log(`\n${signal} received — shutting down gracefully`);
      httpServer.close(() => {
        mongoose.disconnect().finally(() => {
          console.log("✅ Connections closed, exiting");
          process.exit(0);
        });
      });
      // Force exit if shutdown takes too long
      setTimeout(() => process.exit(1), 10_000);
    }
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));

  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
