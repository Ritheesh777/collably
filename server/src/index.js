import http from 'http';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { initChat } from './sockets/chat.js';

async function start() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: [...env.clientOrigins, 'http://localhost:5173', 'capacitor://localhost', 'http://localhost'],
      credentials: true,
    },
  });
  initChat(io);

  server.listen(env.port, () => {
    console.log(`🚀 Collably API running on http://localhost:${env.port} [${env.nodeEnv}]`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
