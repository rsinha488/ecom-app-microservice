const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { orderEvents, ORDER_EVENTS } = require('../events/orderEvents');
const { statusToString, getStatusLabel } = require('../constants/orderStatus');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3006',
      methods: ['GET', 'POST', 'PUT', 'PATCH'],
      credentials: true,
    },
    path: '/socket.io/',
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
        issuer: process.env.ISSUER,
      });
      socket.userId = decoded.sub;
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.userId} (Socket ID: ${socket.id})`);

    // Join user-specific room
    const roomName = `user:${socket.userId}`;
    socket.join(roomName);
    console.log(`[Socket] User ${socket.userId} joined room: ${roomName}`);

    // Send connection success
    socket.emit('connected', {
      message: 'Successfully connected to order updates',
      userId: socket.userId,
    });
    console.log(`[Socket] Connection confirmation sent to user ${socket.userId}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`); // Added log
      console.log(`[Socket] User disconnected: ${socket.userId} (Socket ID: ${socket.id})`);
    });

    // Handle custom events
    socket.on('subscribe:orders', () => {
      console.log(`[Socket] User ${socket.userId} subscribed to order updates`);
      socket.emit('subscribed', { message: 'Subscribed to order updates' });
    });
  });

  // Listen to order events and emit to clients
  orderEvents.on(ORDER_EVENTS.CREATED, (order) => {
    console.log(`[Socket] Event received: ORDER_CREATED for user ${order.userId}`); // Added log
    console.log(`[Socket] Order placed: ${order._id} for user: ${order.userId}`);
    const roomName = `user:${order.userId}`; // Added roomName variable
    io.to(roomName).emit('order:created', {
      order,
      message: `Your order #${order.orderNumber} has been placed!`,
      timestamp: new Date(),
    });
    console.log(`[Socket] Emitted order:created to room ${roomName}`); // Added log
  });

  orderEvents.on(ORDER_EVENTS.STATUS_CHANGED, ({ order, oldStatus, newStatus }) => {
    const oldStatusString = statusToString(oldStatus);
    const newStatusString = statusToString(newStatus);
    const newStatusLabel = getStatusLabel(newStatus);

    console.log(`[Socket] Order status changed: ${order._id} from ${oldStatusString} to ${newStatusString} for user: ${order.userId}`);
    console.log(`[Socket] Emitting to room: user:${order.userId}`);
    console.log(`[Socket] Connected clients in room:`, io.sockets.adapter.rooms.get(`user:${order.userId}`)?.size || 0);

    const eventData = {
      order,
      oldStatus: oldStatusString,
      newStatus: newStatusString,
      message: `Order #${order.orderNumber} status updated to ${newStatusLabel}`,
      timestamp: new Date(),
    };

    console.log(`[Socket] Event data:`, JSON.stringify(eventData, null, 2));
    io.to(`user:${order.userId}`).emit('order:status_changed', eventData);
    console.log(`[Socket] Event emitted successfully`);
  });

  orderEvents.on(ORDER_EVENTS.UPDATED, (order) => {
    console.log(`[Socket] Order updated: ${order._id} for user: ${order.userId}`);
    io.to(`user:${order.userId}`).emit('order:updated', {
      order,
      message: `Order #${order.orderNumber} has been updated`,
      timestamp: new Date(),
    });
  });

  orderEvents.on(ORDER_EVENTS.CANCELLED, (order) => {
    console.log(`[Socket] Order cancelled: ${order._id} for user: ${order.userId}`);
    io.to(`user:${order.userId}`).emit('order:cancelled', {
      order,
      message: `Order #${order.orderNumber} has been cancelled`,
      timestamp: new Date(),
    });
  });

  orderEvents.on(ORDER_EVENTS.COMPLETED, (order) => {
    console.log(`[Socket] Order completed: ${order._id} for user: ${order.userId}`);
    io.to(`user:${order.userId}`).emit('order:completed', {
      order,
      message: `Order #${order.orderNumber} has been delivered!`,
      timestamp: new Date(),
    });
  });

  console.log('Socket.io initialized successfully');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};
