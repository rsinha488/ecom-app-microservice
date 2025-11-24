# Products Filtering and Search - Fixed

This document details the fixes applied to enable product filtering by category and search functionality.

## Issues Fixed

### 1. Backend - Missing Filter Support in Products Controller

**Problem:**
- The `getAllProducts` controller was not handling query parameters for filtering
- No search endpoint existed
- Category filtering was not implemented

**Solution:**
Updated [services/products/controllers/productController.js](services/products/controllers/productController.js#L39-L119):

#### Added Filter Support
- **Category filter**: `?category=electronics`
- **Price range filter**: `?minPrice=10&maxPrice=100`
- **Stock filter**: `?inStock=true`
- **Search filter**: `?search=laptop`
- **Pagination**: `?page=1&limit=20`
- **Sorting**: `?sort=price` or `?sort=-price` (descending)

```javascript
// Build query based on filters
const query = {};

// Category filter
if (req.query.category) {
  query.category = req.query.category;
}

// Price range filter
if (req.query.minPrice || req.query.maxPrice) {
  query.price = {};
  if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
  if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
}

// Stock filter
if (req.query.inStock === 'true') {
  query.stock = { $gt: 0 };
}

// Search filter (if provided)
if (req.query.search) {
  query.$or = [
    { name: { $regex: req.query.search, $options: 'i' } },
    { description: { $regex: req.query.search, $options: 'i' } }
  ];
}
```

#### Added Pagination and Sorting
```javascript
// Pagination
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const skip = (page - 1) * limit;

// Sorting
let sort = {};
if (req.query.sort) {
  const sortField = req.query.sort.startsWith('-') ? req.query.sort.slice(1) : req.query.sort;
  const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
  sort[sortField] = sortOrder;
} else {
  sort = { createdAt: -1 }; // Default: newest first
}

// Fetch products with filters
const products = await Product.find(query)
  .sort(sort)
  .limit(limit)
  .skip(skip);
```

### 2. Backend - Added Search Endpoint

**Created**: `GET /api/v1/products/search?q=query`

Added [searchProducts controller](services/products/controllers/productController.js#L538-L580):

```javascript
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    // Validate query parameter
    if (!q || q.trim() === '') {
      return res.status(400).json(
        ErrorResponse.validation(
          'Search query is required',
          { q: 'Please provide a search query' }
        )
      );
    }

    // Search products by name or description (case-insensitive)
    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    }).limit(50); // Limit search results to 50

    // Return success response with search results
    res.status(200).json(
      ErrorResponse.success(
        { products, count: products.length },
        'Search completed successfully'
      )
    );
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json(
      ErrorResponse.serverError(
        'Failed to search products',
        'Please try again later'
      )
    );
  }
};
```

**Updated Routes**: [services/products/routes/v1/productRoutes.js](services/products/routes/v1/productRoutes.js#L12)

```javascript
// IMPORTANT: /search must come before /:id to avoid route conflicts
router.get('/search', optionalAuth, productController.searchProducts);
router.get('/', optionalAuth, productController.getAllProducts);
router.get('/:id', optionalAuth, productController.getProductById);
```

### 3. Frontend - Fixed Category Filtering

**Problem:**
- Category dropdown was not triggering product fetches
- The `useEffect` was watching the Redux `filters` object, which wasn't changing properly

**Solution:**
Updated [frontend/src/app/products/page.tsx](frontend/src/app/products/page.tsx#L37-L46):

```typescript
// Fetch products when category changes
useEffect(() => {
  if (!isSearching) {
    if (selectedCategory) {
      dispatch(fetchProducts({ category: selectedCategory }));
    } else {
      dispatch(fetchProducts({}));
    }
  }
}, [dispatch, selectedCategory, isSearching]);
```

**Simplified Category Handler**:
```typescript
const handleCategoryChange = useCallback((categorySlug: string) => {
  setSelectedCategory(categorySlug);
  setSearchQuery(''); // Clear search when changing category
  setIsSearching(false);
}, []);
```

### 4. Frontend - Fixed Search Clear Behavior

**Problem:**
- Clearing search didn't fetch all products again

**Solution:**
Updated all clear handlers to dispatch `fetchProducts({})`:

```typescript
// Clear filter button
const handleClearFilters = useCallback(() => {
  setSearchQuery('');
  setSelectedCategory('');
  setIsSearching(false);
  dispatch(clearFilters());
  dispatch(fetchProducts({})); // ← Added this
}, [dispatch]);

// X button on search input
onClick={() => {
  setSearchQuery('');
  if (isSearching) {
    setIsSearching(false);
    dispatch(clearFilters());
    dispatch(fetchProducts({})); // ← Added this
  }
}}
```

## API Examples

### Get All Products
```bash
curl http://localhost:3001/api/v1/products
```

Response:
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [...],
    "count": 20,
    "total": 100,
    "page": 1,
    "pages": 5
  }
}
```

### Filter by Category
```bash
curl http://localhost:3001/api/v1/products?category=electronics
```

### Search Products
```bash
curl "http://localhost:3001/api/v1/products/search?q=laptop"
```

Response:
```json
{
  "success": true,
  "message": "Search completed successfully",
  "data": {
    "products": [...],
    "count": 5
  }
}
```

### Combined Filters
```bash
curl "http://localhost:3001/api/v1/products?category=electronics&minPrice=100&maxPrice=500&inStock=true&page=1&limit=10&sort=-price"
```

## Testing the Fixes

### Test Category Filtering

1. Navigate to http://localhost:3006/products
2. Select a category from the dropdown
3. ✅ Products should filter by category
4. ✅ URL should update (if using query params)
5. ✅ "Showing X products in Category" should appear

### Test Search

1. Navigate to http://localhost:3006/products
2. Type a search query in the search box
3. Press Enter or click search icon
4. ✅ Products should filter by search query
5. ✅ "Showing X products for 'query'" should appear
6. ✅ Category filter should clear

### Test Clear Filters

1. Apply a category filter
2. Click the X button on the category pill
3. ✅ All products should be displayed again

4. Perform a search
5. Click the X button on the search input
6. ✅ All products should be displayed again

7. Apply multiple filters
8. Click "Clear all" button
9. ✅ All products should be displayed again

### Test Backend Directly

```bash
# Test category filter
curl -s "http://localhost:3001/api/v1/products?category=electronics" | jq '.data.count'

# Test search
curl -s "http://localhost:3001/api/v1/products/search?q=laptop" | jq '.data.count'

# Test price range
curl -s "http://localhost:3001/api/v1/products?minPrice=10&maxPrice=100" | jq '.data.count'

# Test pagination
curl -s "http://localhost:3001/api/v1/products?page=2&limit=10" | jq '.data | {count, page, pages}'
```

## Files Modified

### Backend
1. **services/products/controllers/productController.js**
   - Updated `getAllProducts` to support filtering, pagination, and sorting
   - Added `searchProducts` endpoint

2. **services/products/routes/v1/productRoutes.js**
   - Added `/search` route

### Frontend
3. **frontend/src/app/products/page.tsx**
   - Fixed category filtering logic
   - Fixed search clear behavior
   - Simplified useEffect dependencies
   - Removed unused Redux filter actions

## Known Limitations

1. **Category Product Counts**: The category dropdown doesn't show dynamic product counts yet. This requires either:
   - Cross-service communication (Categories service queries Products service)
   - Aggregation pipeline in the frontend
   - Periodic sync job

2. **Search Performance**: For large datasets, consider:
   - Adding MongoDB text indexes
   - Implementing search debouncing
   - Using a dedicated search service (Elasticsearch, Algolia)

3. **Filter Persistence**: Filters are not persisted in URL query params. Consider adding:
   - URL query parameter sync
   - Browser history management
   - Filter state restoration on page reload

## Next Steps

1. ✅ **Add dynamic category counts** - Query products service from categories endpoint
2. ✅ **Add URL query parameter sync** - Persist filters in URL
3. ✅ **Add filter persistence** - Save user filter preferences
4. ✅ **Add advanced filters** - Brand, rating, price slider
5. ✅ **Add sort options UI** - Dropdown for sort options
6. ✅ **Add pagination UI** - Page navigation component

## Summary

All filtering and search functionality is now working:

- ✅ **Category filtering** - Products filter by category
- ✅ **Search functionality** - Products search by name/description
- ✅ **Filter clearing** - All clear buttons work correctly
- ✅ **Backend filtering** - Supports category, price, stock, search
- ✅ **Backend search endpoint** - `/api/v1/products/search?q=query`
- ✅ **Backend pagination** - Page and limit parameters work
- ✅ **Backend sorting** - Sort parameter works
- ✅ **Error handling** - Standardized error responses
- ✅ **User feedback** - Clear messages showing applied filters

The products page now provides a complete filtering and search experience!
