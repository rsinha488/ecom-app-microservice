import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { productsAPI } from '@/lib/api';
import { Product, PaginatedResponse } from '@/types';

interface ProductsState {
  items: Product[];
  currentProduct: Product | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    search?: string;
    sort?: string;
  };
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  items: [],
  currentProduct: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  filters: {},
  loading: false,
  error: null,
};

// Async thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params: {
    page?: number;
    limit?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    search?: string;
    sort?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await productsAPI.getProducts(params);
      // New API format: response.data.data contains the actual data
      return {
        products: response.data.data.products,
        count: response.data.data.count,
        meta: response.data.meta
      };
    } catch (error: any) {
      // Error is already handled by interceptor
      const message = error.message || 'Failed to fetch products';
      return rejectWithValue(message);
    }
  }
);

// Load more products (for infinite scroll)
export const loadMoreProducts = createAsyncThunk(
  'products/loadMoreProducts',
  async (params: {
    page: number;
    limit?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    search?: string;
    sort?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await productsAPI.getProducts(params);
      return {
        products: response.data.data.products,
        count: response.data.data.count,
        meta: response.data.meta,
        requestedPage: params.page // Include the requested page to ensure state updates
      };
    } catch (error: any) {
      const message = error.message || 'Failed to load more products';
      return rejectWithValue(message);
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await productsAPI.getProductById(id);
      // New API format: response.data.data.product contains the product
      return response.data.data.product;
    } catch (error: any) {
      // Error is already handled by interceptor
      const message = error.message || 'Failed to fetch product';
      return rejectWithValue(message);
    }
  }
);

export const searchProducts = createAsyncThunk(
  'products/searchProducts',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await productsAPI.searchProducts(query);
      // New API format: response.data.data contains products and count
      return {
        products: response.data.data.products,
        count: response.data.data.count
      };
    } catch (error: any) {
      // Error is already handled by interceptor
      const message = error.message || 'Search failed';
      return rejectWithValue(message);
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ProductsState['filters']>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to first page when filters change
    },
    clearFilters: (state) => {
      state.filters = {};
      state.pagination.page = 1;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Products
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.products;
        state.pagination.total = action.payload.count;
        // Update pagination if meta is provided
        if (action.payload.meta) {
          state.pagination = {
            page: action.payload.meta.page || state.pagination.page,
            limit: action.payload.meta.limit || state.pagination.limit,
            total: action.payload.meta.total || action.payload.count,
            pages: action.payload.meta.pages || Math.ceil(action.payload.count / state.pagination.limit)
          };
        }
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Product by ID
    builder
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Search Products
    builder
      .addCase(searchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.products;
        state.pagination.total = action.payload.count;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Load More Products (Infinite Scroll)
    builder
      .addCase(loadMoreProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadMoreProducts.fulfilled, (state, action) => {
        state.loading = false;
        // Append new products to existing items
        state.items = [...state.items, ...action.payload.products];
        state.pagination.total = action.payload.count;
        // Update pagination - use requestedPage as fallback
        if (action.payload.meta) {
          state.pagination = {
            page: action.payload.meta.page || action.payload.requestedPage,
            limit: action.payload.meta.limit || state.pagination.limit,
            total: action.payload.meta.total || action.payload.count,
            pages: action.payload.meta.pages || Math.ceil(action.payload.count / state.pagination.limit)
          };
        } else {
          // If no meta, manually update the page number
          state.pagination.page = action.payload.requestedPage;
          state.pagination.pages = Math.ceil(action.payload.count / state.pagination.limit);
        }
      })
      .addCase(loadMoreProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, setPage, clearCurrentProduct } = productsSlice.actions;
export default productsSlice.reducer;
