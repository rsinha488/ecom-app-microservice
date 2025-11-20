const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { orderEvents, ORDER_EVENTS } = require('../events/orderEvents');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3006',
      methods: ['GET', 'POST'],
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
    console.log(`User connected: ${socket.userId} (Socket ID: ${socket.id})`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Send connection success
    socket.emit('connected', {
      message: 'Successfully connected to order updates',
      userId: socket.userId,
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });

    // Handle custom events
    socket.on('subscribe:orders', () => {
      console.log(`User ${socket.userId} subscribed to order updates`);
      socket.emit('subscribed', { message: 'Subscribed to order updates' });
    });
  });

  // Listen to order events and emit to clients
  orderEvents.on(ORDER_EVENTS.CREATED, (order) => {
    console.log(`[Socket] Order placed: ${order._id}`);
    io.to(`user:${order.user_id}`).emit('order:created', {
      order,
      message: `Your order #${order.orderNumber} has been placed!`,
      timestamp: new Date(),
    });
  });

  orderEvents.on(ORDER_EVENTS.STATUS_CHANGED, ({ order, oldStatus, newStatus }) => {
    console.log(`[Socket] Order status changed: ${order._id} from ${oldStatus} to ${newStatus}`);
    io.to(`user:${order.user_id}`).emit('order:status_changed', {
      order,
      oldStatus,
      newStatus,
      message: `Order #${order.orderNumber} status updated to ${newStatus}`,
      timestamp: new Date(),
    });
  });

  orderEvents.on(ORDER_EVENTS.UPDATED, (order) => {
    console.log(`[Socket] Order updated: ${order._id}`);
    io.to(`user:${order.user_id}`).emit('order:updated', {
      order,
      message: `Order #${order.orderNumber} has been updated`,
      timestamp: new Date(),
    });
  });

  orderEvents.on(ORDER_EVENTS.CANCELLED, (order) => {
    console.log(`[Socket] Order cancelled: ${order._id}`);
    io.to(`user:${order.user_id}`).emit('order:cancelled', {
      order,
      message: `Order #${order.orderNumber} has been cancelled`,
      timestamp: new Date(),
    });
  });

  orderEvents.on(ORDER_EVENTS.COMPLETED, (order) => {
    console.log(`[Socket] Order completed: ${order._id}`);
    io.to(`user:${order.user_id}`).emit('order:completed', {
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
