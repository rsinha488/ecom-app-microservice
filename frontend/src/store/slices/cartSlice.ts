import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Product } from '@/types';

export interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
};

// Helper function to calculate totals
const calculateTotals = (items: CartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { totalItems, totalPrice };
};

// Load cart from localStorage
const loadCartFromStorage = (): CartItem[] => {
  if (typeof window !== 'undefined') {
    try {
      const savedCart = localStorage.getItem('cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      return [];
    }
  }
  return [];
};

// Save cart to localStorage
const saveCartToStorage = (items: CartItem[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('cart', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ product: Product; quantity?: number, flag?: number }>) => {
      const { product, quantity = 1, flag = 0 } = action.payload;

      const existing = state.items.find((item) => item._id === product._id);

      if (existing && flag === 0) {//flag for card page add to cart will inc items existing
        existing.quantity += quantity;
      } else if (existing && flag === 1) {//flag 1 addtocart will replace in
        existing.quantity = quantity;
      } else {
        state.items.push({ ...product, quantity });
      }

      const totals = calculateTotals(state.items);
      state.totalItems = totals.totalItems;
      state.totalPrice = totals.totalPrice;

      saveCartToStorage(state.items);
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item._id !== action.payload);

      const totals = calculateTotals(state.items);
      state.totalItems = totals.totalItems;
      state.totalPrice = totals.totalPrice;

      saveCartToStorage(state.items);
    },

    updateQuantity: (
      state,
      action: PayloadAction<{ productId: string; quantity: number }>
    ) => {
      const item = state.items.find((item) => item._id === action.payload.productId);

      if (item) {
        if (action.payload.quantity <= 0) {
          state.items = state.items.filter((item) => item._id !== action.payload.productId);
        } else {
          item.quantity = action.payload.quantity;
        }
      }

      const totals = calculateTotals(state.items);
      state.totalItems = totals.totalItems;
      state.totalPrice = totals.totalPrice;

      saveCartToStorage(state.items);
    },

    incrementQuantity: (state, action: PayloadAction<string>) => {
      const item = state.items.find((item) => item._id === action.payload);
      if (item) {
        item.quantity += 1;
      }

      const totals = calculateTotals(state.items);
      state.totalItems = totals.totalItems;
      state.totalPrice = totals.totalPrice;

      saveCartToStorage(state.items);
    },

    decrementQuantity: (state, action: PayloadAction<string>) => {
      const item = state.items.find((item) => item._id === action.payload);
      if (item) {
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          state.items = state.items.filter((item) => item._id !== action.payload);
        }
      }

      const totals = calculateTotals(state.items);
      state.totalItems = totals.totalItems;
      state.totalPrice = totals.totalPrice;

      saveCartToStorage(state.items);
    },

    clearCart: (state) => {
      state.items = [];
      state.totalItems = 0;
      state.totalPrice = 0;

      saveCartToStorage([]);
    },

    loadCart: (state) => {
      const items = loadCartFromStorage();
      state.items = items;
      const totals = calculateTotals(items);
      state.totalItems = totals.totalItems;
      state.totalPrice = totals.totalPrice;
    },

    // Sync cart with server (for logged-in users)
    syncCart: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
      const totals = calculateTotals(action.payload);
      state.totalItems = totals.totalItems;
      state.totalPrice = totals.totalPrice;

      saveCartToStorage(action.payload);
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  incrementQuantity,
  decrementQuantity,
  clearCart,
  loadCart,
  syncCart,
} = cartSlice.actions;

export default cartSlice.reducer;
