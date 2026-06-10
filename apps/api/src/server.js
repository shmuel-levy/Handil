require("dotenv").config();
const http      = require("http");
const os        = require("os");
const mongoose  = require("mongoose");
const app       = require("./app");
const initSocket = require("./socket");

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
      const lanIPs = getLanIPs();
      console.log("\n🚀 הנדיל API ready");
      console.log(`   Local  → http://localhost:${PORT}`);
      for (const { name, address } of lanIPs) {
        console.log(`   LAN (${name}) → http://${address}:${PORT}  ← use this in .env`);
      }
      console.log(
        `\n📱 Update apps/mobile/.env:\n   EXPO_PUBLIC_API_BASE_URL=http://${lanIPs[0]?.address ?? "YOUR_IP"}:${PORT}/api\n`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
