const mongoose = require('mongoose');
const Category = require('./models/Category');

// Sample categories for e-commerce - matching product categories
const categories = [
  {
    name: 'Electronics',
    description: 'Electronic devices, gadgets, and accessories including headphones, smartwatches, and gaming gear',
    slug: 'electronics',
    order: 1,
    imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&auto=format&fit=crop',
    isActive: true
  },
  {
    name: 'Clothing',
    description: 'Fashion and apparel for men, women, and children',
    slug: 'clothing',
    order: 2,
    imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop',
    isActive: true
  },
  {
    name: 'Home & Garden',
    description: 'Home decor, furniture, kitchen essentials, and garden supplies',
    slug: 'home-garden',
    order: 3,
    imageUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&auto=format&fit=crop',
    isActive: true
  },
  {
    name: 'Sports & Outdoors',
    description: 'Sports equipment, outdoor gear, fitness accessories, and athletic wear',
    slug: 'sports-outdoors',
    order: 4,
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop',
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
