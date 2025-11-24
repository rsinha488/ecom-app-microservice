/**
 * useOrderSocket Hook
 *
 * This hook provides access to the global order socket connection.
 * It should be used within components wrapped by OrderSocketProvider.
 *
 * @deprecated Direct use - Use useOrderSocketContext from OrderSocketProvider instead
 * This re-export maintains backward compatibility
 */

export { useOrderSocketContext as useOrderSocket } from '@/providers/OrderSocketProvider';
