const mongoose = require('mongoose');
const Category = require('./models/Category');

// Sample categories for e-commerce
const categories = [
  {
    name: 'Electronics',
    description: 'Electronic devices, gadgets, and accessories',
    slug: 'electronics',
    order: 1,
    imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
    isActive: true
  },
  {
    name: 'Clothing',
    description: 'Fashion and apparel for men, women, and children',
    slug: 'clothing',
    order: 2,
    imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
    isActive: true
  },
  {
    name: 'Home & Kitchen',
    description: 'Home decor, furniture, and kitchen essentials',
    slug: 'home-kitchen',
    order: 3,
    imageUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400',
    isActive: true
  },
  {
    name: 'Books',
    description: 'Books, magazines, and educational materials',
    slug: 'books',
    order: 4,
    imageUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',
    isActive: true
  },
  {
    name: 'Sports & Outdoors',
    description: 'Sports equipment, outdoor gear, and fitness accessories',
    slug: 'sports-outdoors',
    order: 5,
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400',
    isActive: true
  },
  {
    name: 'Beauty & Personal Care',
    description: 'Cosmetics, skincare, and personal care products',
    slug: 'beauty-personal-care',
    order: 6,
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    isActive: true
  },
  {
    name: 'Toys & Games',
    description: 'Toys, games, and entertainment for all ages',
    slug: 'toys-games',
    order: 7,
    imageUrl: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400',
    isActive: true
  },
  {
    name: 'Automotive',
    description: 'Car accessories, parts, and automotive tools',
    slug: 'automotive',
    order: 8,
    imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400',
    isActive: true
  }
];

async function seedCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/categories_db');
    console.log('Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Insert new categories
    const result = await Category.insertMany(categories);
    console.log(`✅ Successfully created ${result.length} categories:`);
    result.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.slug})`);
    });

    console.log('\n✅ Categories seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();
