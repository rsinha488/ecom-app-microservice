# Microservices Architecture

This project contains a secure e-commerce platform with OAuth2/OpenID Connect authentication and five independent microservices built with Node.js, Express, and MongoDB following MVC architecture.

## Services Overview

| Service | Port | Database | Description | Auth Required |
|---------|------|----------|-------------|---------------|
| Auth Server | 3000 | auth_db | OAuth2/OIDC authorization server | No |
| Products | 3001 | products_db | Manages product information | Partial |
| Categories | 3002 | categories_db | Manages product categories | Partial |
| Users | 3003 | users_db | Manages user profiles | Yes |
| Orders | 3004 | orders_db | Manages customer orders | Yes |

## Security Features

- **OAuth2 Authorization Framework**: Industry-standard authorization
- **OpenID Connect**: Identity layer for authentication
- **JWT Tokens**: Stateless, secure token-based authentication
- **Role-Based Access Control (RBAC)**: Admin and user roles
- **Protected Endpoints**: Fine-grained access control per service

For detailed security documentation, see [OAUTH2_SECURITY_GUIDE.md](OAUTH2_SECURITY_GUIDE.md)

## Project Structure

```
services/
├── products/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── productController.js
│   ├── models/
│   │   └── Product.js
│   ├── routes/
│   │   └── productRoutes.js
│   ├── .env.local
│   ├── package.json
│   └── server.js
├── categories/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── categoryController.js
│   ├── models/
│   │   └── Category.js
│   ├── routes/
│   │   └── categoryRoutes.js
│   ├── .env.local
│   ├── package.json
│   └── server.js
├── users/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── userController.js
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   └── userRoutes.js
│   ├── .env.local
│   ├── package.json
│   └── server.js
└── orders/
    ├── config/
    │   └── db.js
    ├── controllers/
    │   └── orderController.js
    ├── models/
    │   └── Order.js
    ├── routes/
    │   └── orderRoutes.js
    ├── .env.local
    ├── package.json
    └── server.js
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running on localhost:27017)

### Installation

1. Install dependencies for each service:

```bash
cd services/products && npm install
cd ../categories && npm install
cd ../users && npm install
cd ../orders && npm install
```

2. Configure environment variables:
   - Each service has a `.env.local` file
   - Update MongoDB URIs and other configs as needed

3. Start MongoDB:
```bash
mongod
```

### Running Services

Run each service in a separate terminal:

```bash
# Terminal 1 - Products Service
cd services/products
npm run dev

# Terminal 2 - Categories Service
cd services/categories
npm run dev

# Terminal 3 - Users Service
cd services/users
npm run dev

# Terminal 4 - Orders Service
cd services/orders
npm run dev
```

## API Endpoints

### Products Service (Port 3001)
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Categories Service (Port 3002)
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Users Service (Port 3003)
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Orders Service (Port 3004)
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/user/:userId` - Get orders by user ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `PATCH /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Delete order

## Health Check

Each service has a health endpoint:
- Products: `http://localhost:3001/health`
- Categories: `http://localhost:3002/health`
- Users: `http://localhost:3003/health`
- Orders: `http://localhost:3004/health`

## Environment Variables

### Products (.env.local)
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/products_db
NODE_ENV=development
```

### Categories (.env.local)
```
PORT=3002
MONGODB_URI=mongodb://localhost:27017/categories_db
NODE_ENV=development
```

### Users (.env.local)
```
PORT=3003
MONGODB_URI=mongodb://localhost:27017/users_db
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
```

### Orders (.env.local)
```
PORT=3004
MONGODB_URI=mongodb://localhost:27017/orders_db
NODE_ENV=development
```

## Features

- **MVC Architecture**: Clean separation of concerns
- **Independent Databases**: Each service has its own MongoDB database
- **RESTful APIs**: Standard REST endpoints for all services
- **CORS Enabled**: Cross-origin resource sharing enabled
- **Password Hashing**: User passwords are hashed using bcryptjs
- **JWT Authentication**: Token-based authentication for users service
- **Mongoose ODM**: MongoDB object modeling
- **Error Handling**: Comprehensive error handling in controllers

## Development

To run in development mode with auto-reload:
```bash
npm run dev
```

To run in production mode:
```bash
npm start
```
