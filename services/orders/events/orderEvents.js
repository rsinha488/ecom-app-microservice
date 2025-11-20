const EventEmitter = require('events');

class OrderEventEmitter extends EventEmitter {}

const orderEvents = new OrderEventEmitter();

// Event types
const ORDER_EVENTS = {
  CREATED: 'order:created',
  UPDATED: 'order:updated',
  STATUS_CHANGED: 'order:status_changed',
  CANCELLED: 'order:cancelled',
  COMPLETED: 'order:completed',
};

module.exports = {
  orderEvents,
  ORDER_EVENTS,
};
