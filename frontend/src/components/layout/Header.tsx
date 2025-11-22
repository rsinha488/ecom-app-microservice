'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, clearAuth } from '@/store/slices/authSlice';
import { clearCart } from '@/store/slices/cartSlice';
import {
  FiShoppingBag,
  FiShoppingCart,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiPackage,
  FiHeart,
} from 'react-icons/fi';

export default function Header() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { items } = useAppSelector((state) => state.cart);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();

  const cartItemsCount = items.reduce((total, item) => total + item.quantity, 0);

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      dispatch(clearAuth());
      dispatch(clearCart());
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout even if server fails
      dispatch(clearAuth());
      dispatch(clearCart());
      router.push('/auth/login');
    }
  };
  /**
   * Check if a navigation link is active
   */
  const isActiveLink = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/products" className={`flex items-center space-x-2 group ${isActiveLink('/')
              ? 'text-primary-600'
              : 'text-gray-700 hover:text-primary-600'}`}>
              <div className="bg-indigo-600 p-2 rounded-lg group-hover:bg-indigo-700 transition">
                <FiShoppingBag className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                E-Shop
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/products"
              className={`px-3 py-2 text-sm font-medium transition rounded-lg
              ${isActiveLink('/products')
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'}
            `}
            >
              Products
            </Link>
            <Link
              href="/orders"
              className={`px-3 py-2 text-sm font-medium transition rounded-lg
              ${isActiveLink('/orders')
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'}
            `}
            >
              Orders
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link
              href="/cart"
              className={`relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition rounded-lg
                ${isActiveLink('/cart')
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'}`}
            >
              <FiShoppingCart className="h-6 w-6" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full h-6 w-6 sm:h-5 sm:w-5 flex items-center justify-center">
                  {cartItemsCount > 99 ? '99+' : cartItemsCount}
                </span>
              )}
            </Link>

            {/* Wishlist
            <button className="p-2 text-gray-700 hover:text-indigo-600 transition hidden sm:block">
              <FiHeart className="h-6 w-6" />
            </button> */}

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="bg-indigo-100 p-2 rounded-full">
                    <FiUser className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden lg:block">
                    {user?.name?.split(' ')[0] || 'User'}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      {/* <Link
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FiUser className="mr-3 h-4 w-4" />
                        Profile
                      </Link> */}
                      <Link
                        href="/orders"
                        className={`flex items-center px-4 py-2 text-sm
                        ${isActiveLink('/orders')
                            ? 'text-indigo-600 bg-indigo-50 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FiPackage className="mr-3 h-4 w-4" />
                        My Orders
                      </Link>
                      <button
                        onClick={handleLogout}
                        className={`flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50`}
                      >
                        <FiLogOut className="mr-3 h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-700 hover:text-indigo-600 rounded-lg hover:bg-gray-50 transition"
            >
              {mobileMenuOpen ? (
                <FiX className="h-6 w-6" />
              ) : (
                <FiMenu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            <Link
              href="/products"
              className={`block px-4 py-3 rounded-lg text-base font-medium min-h-[44px] flex items-center
                ${isActiveLink('/products')
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Products
            </Link>
            <Link
              href="/orders"
              className={`block px-4 py-3 rounded-lg text-base font-medium min-h-[44px] flex items-center
                ${isActiveLink('/orders')
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Orders
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
