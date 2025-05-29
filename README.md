# Fumy Limp Backend

Backend API for Fumy Limp - Hotel Laundry Management System

## Features

- Complete REST API for hotel laundry management
- Authentication and authorization with JWT
- User management (admin and delivery personnel)
- Hotel management
- Service tracking (pickup, labeling, delivery)
- Bag labeling system
- Transaction management
- Financial reporting
- File uploads for photos and signatures

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/fumy-limp-backend.git
   cd fumy-limp-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` file:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your database credentials and other settings.

5. Run database migrations:
   ```
   npm run migrate
   ```

6. Seed the database with initial data:
   ```
   npm run seed
   ```

## Running the Application

### Development Mode

```
npm run dev
```

### Production Mode

```
npm start
```

## Database Seed Data

The application comes with a comprehensive seed script that creates:

- Admin user (email: admin@fumylimp.com, password: admin123)
- Delivery personnel (repartidores) for each zone
- Sample hotels with pricing and inventory
- Sample services in various states
- Sample transactions
- System configuration

To run the seed script:

```
npm run seed
```

## API Testing

A test script is included to verify API functionality. To run the tests:

```
./run-tests.sh
```

Or manually:

```
node test-api.js
```

## API Endpoints

### Authentication

- POST /api/auth/login - User login
- GET /api/auth/profile - Get user profile

### Users

- GET /api/users - Get all users
- GET /api/users/:id - Get user by ID
- POST /api/users - Create a new user
- PUT /api/users/:id - Update a user
- DELETE /api/users/:id - Delete a user

### Hotels

- GET /api/hotels - Get all hotels
- GET /api/hotels/:id - Get hotel by ID
- POST /api/hotels - Create a new hotel
- PUT /api/hotels/:id - Update a hotel
- DELETE /api/hotels/:id - Delete a hotel

### Services

- GET /api/services - Get all services
- GET /api/services/:id - Get service by ID
- POST /api/services - Create a new service
- PUT /api/services/:id - Update a service
- PATCH /api/services/:id/status - Update service status
- DELETE /api/services/:id - Delete a service
- GET /api/services/search - Search services
- GET /api/services/assigned - Get services assigned to current user

### Bag Labels

- GET /api/bag-labels - Get all bag labels
- GET /api/bag-labels/:id - Get bag label by ID
- POST /api/bag-labels - Create a new bag label
- PUT /api/bag-labels/:id - Update a bag label
- PATCH /api/bag-labels/:id/status - Update bag label status
- POST /api/bag-labels/:id/photo - Upload photo for a bag label

### Transactions

- GET /api/transactions - Get all transactions
- GET /api/transactions/:id - Get transaction by ID
- POST /api/transactions - Create a new transaction
- PUT /api/transactions/:id - Update a transaction
- DELETE /api/transactions/:id - Delete a transaction
- GET /api/transactions/search - Search transactions

### Dashboard

- GET /api/dashboard/stats - Get dashboard statistics
- GET /api/dashboard/services - Get service statistics
- GET /api/dashboard/transactions - Get transaction statistics

## File Uploads

The system supports uploading files for:

- Service pickup photos
- Service delivery photos
- Bag label photos
- Customer signatures

## License

This project is licensed under the MIT License - see the LICENSE file for details.