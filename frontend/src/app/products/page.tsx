'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchProducts, searchProducts, clearFilters, loadMoreProducts } from '@/store/slices/productsSlice';
import ProductCard from '@/components/product/ProductCard';
import { FiSearch, FiGrid, FiList, FiX, FiLoader } from 'react-icons/fi';
import { Category } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

export default function ProductsPage() {
  const dispatch = useAppDispatch();
  const { items, loading, error, pagination } = useAppSelector((state) => state.products);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query with 500ms delay
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Calculate if there are more items to load
  const hasMore = useMemo(() => {
    return pagination.page < pagination.pages;
  }, [pagination.page, pagination.pages]);

  // Load more products callback for infinite scroll
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = pagination.page + 1;
      const params: any = {
        page: nextPage,
        limit: pagination.limit,
      };

      if (selectedCategory) {
        params.category = selectedCategory;
      }

      dispatch(loadMoreProducts(params));
    }
  }, [dispatch, loading, hasMore, pagination.page, pagination.limit, selectedCategory]);

  // Infinite scroll sentinel ref
  const loadMoreRef = useInfiniteScroll(loadMore, hasMore, loading);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Memoized category fetch function
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_CATEGORIES_URL}/v1/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data?.categories || data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  // Auto-search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      setIsSearching(true);
      setSelectedCategory(''); // Clear category when searching
      dispatch(searchProducts(debouncedSearchQuery.trim()));
    } else if (isSearching) {
      // If search was cleared, fetch all products
      setIsSearching(false);
      dispatch(fetchProducts({}));
    }
  }, [debouncedSearchQuery, dispatch, isSearching]);

  // Fetch products when category changes
  useEffect(() => {
    if (!isSearching && !searchQuery.trim()) {
      if (selectedCategory) {
        dispatch(fetchProducts({ category: selectedCategory }));
      } else {
        dispatch(fetchProducts({}));
      }
    }
  }, [dispatch, selectedCategory, isSearching, searchQuery]);

  // Memoized category select handler
  const handleCategoryChange = useCallback((categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setSearchQuery(''); // Clear search when changing category
    setIsSearching(false);
  }, []);

  // Memoized search handler (for Enter key submit)
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Trigger immediate search on Enter key
    if (searchQuery.trim()) {
      setIsSearching(true);
      setSelectedCategory('');
      dispatch(searchProducts(searchQuery.trim()));
    }
  }, [searchQuery, dispatch]);

  // Memoized search input change handler
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // If input is empty, clear search immediately
    if (!value.trim() && isSearching) {
      setIsSearching(false);
      dispatch(clearFilters());
      dispatch(fetchProducts({}));
    }
  }, [isSearching, dispatch]);

  // Memoized clear filters handler
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('');
    setIsSearching(false);
    dispatch(clearFilters());
    dispatch(fetchProducts({}));
  }, [dispatch]);

  // Memoized active filters indicator
  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== '' || selectedCategory !== '';
  }, [searchQuery, selectedCategory]);

  // Memoized products list
  const productsList = useMemo(() => {
    return items?.map((product) => (
      <ProductCard key={product._id} product={product} />
    ));
  }, [items]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discover Products</h1>
          <p className="text-gray-600">Browse our collection of amazing products</p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      if (isSearching) {
                        setIsSearching(false);
                        dispatch(clearFilters());
                        dispatch(fetchProducts({}));
                      }
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                )}
              </div>
            </form>

            {/* Category Dropdown */}
            <div className="w-full md:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                disabled={loading}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category.slug}>
                    {category.name} {category.productCount > 0 && `(${category.productCount})`}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2.5 ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } rounded-l-lg transition`}
                title="Grid view"
              >
                <FiGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2.5 ${
                  viewMode === 'list'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } rounded-r-lg transition`}
                title="List view"
              >
                <FiList className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Active Filters */}
          {/* {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      if (isSearching) {
                        setIsSearching(false);
                        dispatch(clearFilters());
                        dispatch(fetchProducts({}));
                      }
                    }}
                    className="hover:text-indigo-900"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                  Category: {categories.find(c => c.slug === selectedCategory)?.name}
                  <button
                    onClick={() => handleCategoryChange('')}
                    className="hover:text-indigo-900"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </span>
              )}
              <button
                onClick={handleClearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear all
              </button>
            </div>
          )} */}
        </div>

        {/* Initial Loading State */}
        {loading && items.length === 0 && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading products...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && items.length === 0 && (
          <div className="text-center py-20">
            <FiSearch className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-600 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your filters or search query'
                : 'No products available at the moment'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {items.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {items.length}
                {pagination.total > 0 && ` of ${pagination.total}`} product{items.length !== 1 ? 's' : ''}
                {isSearching && ` for "${searchQuery}"`}
                {selectedCategory && ` in ${categories.find(c => c.slug === selectedCategory)?.name}`}
              </p>
              {/* {hasMore && (
                <p className="text-sm text-indigo-600 font-medium">
                  Scroll down to load more
                </p>
              )} */}
            </div>

            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-4'
              }
            >
              {productsList}
            </div>

            {/* Infinite Scroll Sentinel + Loading More Indicator */}
            {hasMore && (
              <div
                ref={loadMoreRef}
                className="flex justify-center items-center py-8 mt-6"
              >
                {loading ? (
                  <div className="text-center">
                    <FiLoader className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Loading more products...</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-lg">
                      <FiLoader className="h-5 w-5" />
                      <span className="text-sm font-medium">Scroll to load more</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* End of List Message */}
            {!hasMore && items.length > 0 && (
              <div className="text-center py-8 mt-6">
                <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-600 rounded-lg">
                  <span className="text-sm font-medium">✓ You've reached the end</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
