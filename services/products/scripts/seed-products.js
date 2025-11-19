require('dotenv').config({ path: '../.env.local' });
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/products_db';

const sampleProducts = [
  {
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium noise-cancelling wireless headphones with 30-hour battery life. Perfect for music lovers and professionals.',
    price: 129.99,
    category: 'Electronics',
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    sku: 'ELEC-HEAD-001',
    brand: 'AudioTech',
    tags: ['wireless', 'bluetooth', 'noise-cancelling', 'headphones'],
    inStock: true,
    rating: 4.5,
    reviewCount: 234,
    isActive: true
  },
  {
    name: 'Smart Watch Series 5',
    description: 'Advanced fitness tracking, heart rate monitoring, and smartphone notifications. Water-resistant up to 50m.',
    price: 299.99,
    category: 'Electronics',
    stock: 35,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    sku: 'ELEC-WATCH-002',
    brand: 'TechWear',
    tags: ['smartwatch', 'fitness', 'health', 'wearable'],
    inStock: true,
    rating: 4.7,
    reviewCount: 567,
    isActive: true
  },
  {
    name: 'Organic Cotton T-Shirt',
    description: 'Soft, breathable, and sustainable. Made from 100% organic cotton. Available in multiple colors.',
    price: 24.99,
    category: 'Clothing',
    stock: 150,
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
    sku: 'CLOTH-SHIRT-003',
    brand: 'EcoWear',
    tags: ['organic', 'cotton', 't-shirt', 'sustainable'],
    inStock: true,
    rating: 4.3,
    reviewCount: 89,
    isActive: true
  },
  {
    name: 'Leather Laptop Bag',
    description: 'Premium genuine leather laptop bag with padded compartments. Fits laptops up to 15.6 inches.',
    price: 89.99,
    category: 'Accessories',
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
    sku: 'ACC-BAG-004',
    brand: 'LeatherCraft',
    tags: ['leather', 'laptop', 'bag', 'professional'],
    inStock: true,
    rating: 4.6,
    reviewCount: 156,
    isActive: true
  },
  {
    name: 'Stainless Steel Water Bottle',
    description: 'Double-wall insulated water bottle keeps drinks cold for 24 hours or hot for 12 hours. 32oz capacity.',
    price: 34.99,
    category: 'Home & Kitchen',
    stock: 100,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500',
    sku: 'HOME-BOTTLE-005',
    brand: 'HydroFlow',
    tags: ['water bottle', 'insulated', 'stainless steel', 'eco-friendly'],
    inStock: true,
    rating: 4.8,
    reviewCount: 432,
    isActive: true
  },
  {
    name: 'Yoga Mat Pro',
    description: 'Extra thick (6mm) non-slip yoga mat with carrying strap. Perfect for yoga, pilates, and home workouts.',
    price: 39.99,
    category: 'Sports & Fitness',
    stock: 75,
    imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500',
    sku: 'FIT-MAT-006',
    brand: 'YogaPro',
    tags: ['yoga', 'fitness', 'exercise', 'mat'],
    inStock: true,
    rating: 4.4,
    reviewCount: 213,
    isActive: true
  },
  {
    name: 'Wireless Gaming Mouse',
    description: 'Precision gaming mouse with RGB lighting, 16000 DPI sensor, and programmable buttons.',
    price: 69.99,
    category: 'Electronics',
    stock: 60,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500',
    sku: 'ELEC-MOUSE-007',
    brand: 'GameGear',
    tags: ['gaming', 'mouse', 'wireless', 'RGB'],
    inStock: true,
    rating: 4.6,
    reviewCount: 341,
    isActive: true
  },
  {
    name: 'Minimalist Desk Lamp',
    description: 'LED desk lamp with adjustable brightness and color temperature. Touch control and USB charging port.',
    price: 49.99,
    category: 'Home & Kitchen',
    stock: 45,
    imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500',
    sku: 'HOME-LAMP-008',
    brand: 'LightWorks',
    tags: ['lamp', 'LED', 'desk', 'lighting'],
    inStock: true,
    rating: 4.5,
    reviewCount: 178,
    isActive: true
  },
  {
    name: 'Running Shoes - Trail Edition',
    description: 'Durable trail running shoes with superior grip and cushioning. Waterproof and breathable.',
    price: 119.99,
    category: 'Sports & Fitness',
    stock: 80,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
    sku: 'FIT-SHOES-009',
    brand: 'RunPro',
    tags: ['shoes', 'running', 'trail', 'sports'],
    inStock: true,
    rating: 4.7,
    reviewCount: 456,
    isActive: true
  },
  {
    name: 'Portable Bluetooth Speaker',
    description: '360-degree sound with deep bass. Waterproof IPX7, 12-hour battery life. Perfect for outdoor adventures.',
    price: 79.99,
    category: 'Electronics',
    stock: 90,
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500',
    sku: 'ELEC-SPEAKER-010',
    brand: 'SoundWave',
    tags: ['speaker', 'bluetooth', 'portable', 'waterproof'],
    inStock: true,
    rating: 4.6,
    reviewCount: 298,
    isActive: true
  },
  {
    name: 'Backpack - Travel Edition',
    description: 'Anti-theft travel backpack with USB charging port, laptop compartment, and water-resistant material.',
    price: 64.99,
    category: 'Accessories',
    stock: 55,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
    sku: 'ACC-BACK-011',
    brand: 'TravelGear',
    tags: ['backpack', 'travel', 'anti-theft', 'laptop'],
    inStock: true,
    rating: 4.5,
    reviewCount: 187,
    isActive: true
  },
  {
    name: 'Coffee Maker - French Press',
    description: 'Premium stainless steel French press. Makes 4 cups of rich, flavorful coffee. Easy to clean.',
    price: 44.99,
    category: 'Home & Kitchen',
    stock: 70,
    imageUrl: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500',
    sku: 'HOME-COFFEE-012',
    brand: 'BrewMaster',
    tags: ['coffee', 'french press', 'brewing', 'kitchen'],
    inStock: true,
    rating: 4.4,
    reviewCount: 145,
    isActive: true
  },
  {
    name: 'Wireless Earbuds Pro',
    description: 'True wireless earbuds with active noise cancellation, 8-hour battery life, and wireless charging case.',
    price: 149.99,
    category: 'Electronics',
    stock: 65,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500',
    sku: 'ELEC-BUDS-013',
    brand: 'AudioTech',
    tags: ['earbuds', 'wireless', 'ANC', 'bluetooth'],
    inStock: true,
    rating: 4.8,
    reviewCount: 621,
    isActive: true
  },
  {
    name: 'Indoor Plant Set (3 Pack)',
    description: 'Set of 3 low-maintenance indoor plants with decorative pots. Perfect for home or office.',
    price: 54.99,
    category: 'Home & Kitchen',
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500',
    sku: 'HOME-PLANT-014',
    brand: 'GreenLife',
    tags: ['plants', 'indoor', 'decoration', 'home'],
    inStock: true,
    rating: 4.3,
    reviewCount: 92,
    isActive: true
  },
  {
    name: 'Resistance Bands Set',
    description: 'Set of 5 resistance bands with different resistance levels. Includes door anchor and carrying bag.',
    price: 29.99,
    category: 'Sports & Fitness',
    stock: 120,
    imageUrl: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=500',
    sku: 'FIT-BANDS-015',
    brand: 'FitPro',
    tags: ['resistance bands', 'fitness', 'home workout', 'exercise'],
    inStock: true,
    rating: 4.6,
    reviewCount: 267,
    isActive: true
  },
  {
    name: 'Sunglasses - Polarized',
    description: 'UV400 protection polarized sunglasses with lightweight frame. Stylish and functional.',
    price: 39.99,
    category: 'Accessories',
    stock: 85,
    imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500',
    sku: 'ACC-GLASS-016',
    brand: 'SunStyle',
    tags: ['sunglasses', 'polarized', 'UV protection', 'eyewear'],
    inStock: true,
    rating: 4.4,
    reviewCount: 156,
    isActive: true
  },
  {
    name: 'Mechanical Keyboard RGB',
    description: 'Mechanical gaming keyboard with customizable RGB backlighting and tactile switches.',
    price: 109.99,
    category: 'Electronics',
    stock: 42,
    imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500',
    sku: 'ELEC-KEY-017',
    brand: 'GameGear',
    tags: ['keyboard', 'mechanical', 'gaming', 'RGB'],
    inStock: true,
    rating: 4.7,
    reviewCount: 389,
    isActive: true
  },
  {
    name: 'Canvas Wall Art Set',
    description: 'Set of 3 modern abstract canvas prints. Ready to hang. Adds style to any room.',
    price: 74.99,
    category: 'Home & Kitchen',
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=500',
    sku: 'HOME-ART-018',
    brand: 'ArtStyle',
    tags: ['wall art', 'canvas', 'decoration', 'modern'],
    inStock: true,
    rating: 4.5,
    reviewCount: 103,
    isActive: true
  },
  {
    name: 'Dumbbell Set - Adjustable',
    description: 'Adjustable dumbbell set (5-52.5 lbs per dumbbell). Space-saving design for home gym.',
    price: 299.99,
    category: 'Sports & Fitness',
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500',
    sku: 'FIT-DUMB-019',
    brand: 'StrengthPro',
    tags: ['dumbbells', 'weights', 'home gym', 'fitness'],
    inStock: true,
    rating: 4.8,
    reviewCount: 445,
    isActive: true
  },
  {
    name: 'Phone Case - Clear Protective',
    description: 'Crystal clear protective phone case with military-grade drop protection. Compatible with iPhone 14.',
    price: 19.99,
    category: 'Accessories',
    stock: 200,
    imageUrl: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=500',
    sku: 'ACC-CASE-020',
    brand: 'CaseGuard',
    tags: ['phone case', 'protective', 'clear', 'iPhone'],
    inStock: true,
    rating: 4.6,
    reviewCount: 532,
    isActive: true
  }
];

async function seedProducts() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing products
    console.log('🗑️  Clearing existing products...');
    await Product.deleteMany({});
    console.log('✅ Existing products cleared');

    // Insert sample products
    console.log('📦 Creating sample products...');
    const products = await Product.insertMany(sampleProducts);
    console.log(`✅ Created ${products.length} products`);

    console.log('\n📊 Product Summary:');
    console.log('='.repeat(50));

    const categories = {};
    products.forEach(product => {
      if (!categories[product.category]) {
        categories[product.category] = 0;
      }
      categories[product.category]++;
    });

    Object.keys(categories).forEach(category => {
      console.log(`  ${category}: ${categories[category]} products`);
    });

    console.log('='.repeat(50));
    console.log('\n✅ Database seeded successfully!');
    console.log('\n🔗 Test endpoints:');
    console.log('  GET  http://localhost:8080/api/v1/products');
    console.log('  GET  http://localhost:8080/api/v1/products?category=Electronics');
    console.log('  GET  http://localhost:8080/api/v1/products?minPrice=50&maxPrice=150');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedProducts();
