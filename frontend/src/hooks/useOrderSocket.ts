'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';

const ORDERS_SOCKET_URL = process.env.NEXT_PUBLIC_ORDERS_URL || 'http://localhost:3004';

interface OrderSocketEvent {
  order: any;
  message: string;
  timestamp: Date;
  oldStatus?: string;
  newStatus?: string;
}

export const useOrderSocket = (accessToken: string | null) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<OrderSocketEvent | null>(null);

  useEffect(() => {
    if (!accessToken) {
      // Disconnect if no token
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Initialize socket connection
    const socket = io(ORDERS_SOCKET_URL, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[Socket] Connected to orders service');
      setIsConnected(true);
      socket.emit('subscribe:orders');
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from orders service');
      setIsConnected(false);
    });

    socket.on('connected', (data) => {
      console.log('[Socket] Connection confirmed:', data);
      toast.success('🔔 Real-time order updates enabled!', {
        position: 'bottom-right',
        autoClose: 2000,
      });
    });

    socket.on('subscribed', (data) => {
      console.log('[Socket] Subscribed to orders:', data);
    });

    // Order events
    socket.on('order:created', (data: OrderSocketEvent) => {
      console.log('[Socket] Order created:', data);
      setLastEvent(data);
      toast.success(`✅ ${data.message} Testing`, {
        position: 'top-right',
        autoClose: 5000,
      });
    });

    socket.on('order:status_changed', (data: OrderSocketEvent) => {
      console.log('[Socket] Order status changed:', data);
      setLastEvent(data);

      const emoji = getStatusEmoji(data.newStatus);
      toast.info(`${emoji} ${data.message}`, {
        position: 'top-right',
        autoClose: 5000,
      });
    });

    socket.on('order:updated', (data: OrderSocketEvent) => {
      console.log('[Socket] Order updated:', data);
      setLastEvent(data);
      toast.info(`📝 ${data.message}`, {
        position: 'top-right',
        autoClose: 4000,
      });
    });

    socket.on('order:cancelled', (data: OrderSocketEvent) => {
      console.log('[Socket] Order cancelled:', data);
      setLastEvent(data);
      toast.warn(`❌ ${data.message}`, {
        position: 'top-right',
        autoClose: 5000,
      });
    });

    socket.on('order:completed', (data: OrderSocketEvent) => {
      console.log('[Socket] Order completed:', data);
      setLastEvent(data);
      toast.success(`🎉 ${data.message}`, {
        position: 'top-right',
        autoClose: 6000,
      });
    });

    // Error handling
    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      if (error.message.includes('Authentication')) {
        toast.error('Failed to connect to real-time updates. Please refresh the page.', {
          position: 'top-right',
        });
      }
    });

    // Cleanup
    return () => {
      console.log('[Socket] Cleaning up connection');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [accessToken]);

  return {
    isConnected,
    lastEvent,
    socket: socketRef.current,
  };
};

// Helper function to get emoji for status
const getStatusEmoji = (status?: string) => {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'processing':
      return '⚙️';
    case 'shipped':
      return '🚚';
    case 'delivered':
      return '📦';
    case 'cancelled':
      return '❌';
    default:
      return '📋';
  }
};
