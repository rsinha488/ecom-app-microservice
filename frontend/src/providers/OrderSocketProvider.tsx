'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
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

interface OrderSocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  lastEvent: OrderSocketEvent | null;
}

const OrderSocketContext = createContext<OrderSocketContextValue>({
  socket: null,
  isConnected: false,
  lastEvent: null,
});

export const useOrderSocketContext = () => {
  const context = useContext(OrderSocketContext);
  if (!context) {
    throw new Error('useOrderSocketContext must be used within OrderSocketProvider');
  }
  return context;
};

interface OrderSocketProviderProps {
  children: ReactNode;
  accessToken: string | null;
}

export function OrderSocketProvider({ children, accessToken }: OrderSocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<OrderSocketEvent | null>(null);

  useEffect(() => {
    // If no token, disconnect existing socket
    if (!accessToken) {
      console.log('[OrderSocketProvider] No accessToken provided');
      if (socketRef.current) {
        console.log('[OrderSocketProvider] Disconnecting existing socket...');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    console.log('[OrderSocketProvider] AccessToken available:', accessToken?.substring(0, 20) + '...');

    // If socket already exists with same token, don't recreate
    if (socketRef.current?.connected) {
      console.log('[OrderSocketProvider] Socket already connected, skipping initialization');
      return;
    }

    console.log('[OrderSocketProvider] Initializing socket connection...');
    console.log('[OrderSocketProvider] Connecting to:', ORDERS_SOCKET_URL);

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
      console.log('[OrderSocketProvider] ✅ Connected to orders service');
      console.log('[OrderSocketProvider] Socket ID:', socket.id);
      setIsConnected(true);
      socket.emit('subscribe:orders');
      console.log('[OrderSocketProvider] Emitted subscribe:orders event');
    });

    socket.on('disconnect', (reason) => {
      console.log('[OrderSocketProvider] ❌ Disconnected from orders service. Reason:', reason);
      setIsConnected(false);
    });

    socket.on('connected', (data) => {
      console.log('[OrderSocketProvider] 🎉 Server connection confirmed:', data);
      toast.success('🔔 Real-time order updates enabled!', {
        position: 'bottom-right',
        autoClose: 2000,
      });
    });

    socket.on('subscribed', (data) => {
      console.log('[OrderSocketProvider] ✅ Subscribed to orders:', data);
    });

    // Order events
    socket.on('order:created', (data: OrderSocketEvent) => {
      console.log('[Socket] Order created:', data);
      setLastEvent(data);
      toast.success(`✅ ${data.message}`, {
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
      console.error('[OrderSocketProvider] ⚠️ Connection error:', error.message);
      console.error('[OrderSocketProvider] Full error:', error);
      if (error.message.includes('Authentication')) {
        toast.error('Failed to connect to real-time updates. Please refresh the page.', {
          position: 'top-right',
        });
      }
    });

    socket.on('error', (error) => {
      console.error('[OrderSocketProvider] ⚠️ Socket error:', error);
    });

    // Cleanup function - only disconnect when component unmounts or token changes
    return () => {
      console.log('[Socket] Cleaning up connection');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connected');
      socket.off('subscribed');
      socket.off('order:created');
      socket.off('order:status_changed');
      socket.off('order:updated');
      socket.off('order:cancelled');
      socket.off('order:completed');
      socket.off('connect_error');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [accessToken]);

  const value: OrderSocketContextValue = {
    socket: socketRef.current,
    isConnected,
    lastEvent,
  };

  return (
    <OrderSocketContext.Provider value={value}>
      {children}
    </OrderSocketContext.Provider>
  );
}

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
