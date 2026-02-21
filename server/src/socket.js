/**
 * Socket.IO Setup — Real-time events for FleetFlow
 *
 * Server->Client events:
 *   vehicle:update   — vehicleId + new status + odometer
 *   trip:created     — new trip data
 *   trip:dispatched  — dispatched trip data
 *   trip:completed   — completed trip data
 *   trip:cancelled   — cancelled trip data
 *   maintenance:added — new maintenance log + vehicle
 *   driver:update    — driver data change
 *
 * Client->Server events:
 *   trip:complete — client triggers completion (server validates & emits)
 *   join:role     — join a role-based room
 */
const jwt = require('jsonwebtoken');

function setupSocket(io) {
  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Allow unauthenticated connections for demo purposes
      socket.user = { role: 'guest' };
      return next();
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      // Allow connection but mark as guest
      socket.user = { role: 'guest' };
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id} (role: ${socket.user?.role})`);

    // Join role-based room to reduce noise
    if (socket.user?.role) {
      socket.join(`role:${socket.user.role}`);
    }

    // Client can join specific rooms
    socket.on('join:role', (role) => {
      socket.join(`role:${role}`);
    });

    // Handle trip completion from client
    socket.on('trip:complete', async (data) => {
      // This is handled via REST API — socket event is informational
      console.log(`[Socket] Trip complete requested: ${data?.tripId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = setupSocket;
