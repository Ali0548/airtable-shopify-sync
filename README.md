# AirTable Shopify Sync

A Node.js MVC application with Express and MongoDB integration for syncing data between AirTable and Shopify.

## Features

- Express.js MVC architecture
- MongoDB database integration with Mongoose
- RESTful API endpoints
- User management system
- Environment-based configuration
- Security middleware (Helmet, CORS)
- Request logging (Morgan)

## Prerequisites

- Node.js (>= 14.0.0)
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd airtable-shopify-sync
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```

4. Configure your MongoDB connection string in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/airtable-shopify-sync-dev
```

## MongoDB Setup

### Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/airtable-shopify-sync-dev`

### MongoDB Atlas (Cloud)
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get your connection string from Atlas dashboard
4. Use format: `mongodb+srv://username:password@cluster.mongodb.net/airtable-shopify-sync-dev?retryWrites=true&w=majority`

### Connection String Examples

**Local MongoDB:**
```
mongodb://localhost:27017/airtable-shopify-sync-dev
```

**Local MongoDB with Authentication:**
```
mongodb://username:password@localhost:27017/airtable-shopify-sync-dev
```

**MongoDB Atlas:**
```
mongodb+srv://username:password@cluster.mongodb.net/airtable-shopify-sync-dev?retryWrites=true&w=majority
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on the configured port (default: 3000 for production, 9090 for development).

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/active` - Get active users only
- `GET /api/users/role/:role` - Get users by role
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### User Model Schema
```javascript
{
  name: String (required, max 100 chars),
  email: String (required, unique, validated),
  password: String (required, min 6 chars),
  role: String (enum: 'user', 'admin', default: 'user'),
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 (prod), 9090 (dev) |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/airtable-shopify-sync-dev |
| `ALLOWED_ORIGINS` | CORS allowed origins | http://localhost:3000 |

## Project Structure

```
├── app.js                 # Main application file
├── config/
│   ├── config.js         # Environment configuration
│   └── database.js       # Database connection setup
├── controllers/
│   ├── IndexController.js
│   └── UserController.js
├── models/
│   └── User.js           # Mongoose User model
├── routes/
│   ├── index.js
│   └── users.js
├── package.json
└── README.md
```

## Database Features

- **Connection Management**: Automatic connection handling with reconnection
- **Schema Validation**: Built-in validation for user data
- **Indexing**: Optimized queries with database indexes
- **Virtual Fields**: Computed fields for user profiles
- **Instance Methods**: User-specific methods like `updateLastLogin()`
- **Static Methods**: Class-level methods like `findActiveUsers()`

## Error Handling

The application includes comprehensive error handling:
- Database connection errors
- Validation errors
- 404 route handling
- Global error middleware

## Security

- Helmet.js for security headers
- CORS configuration
- Input validation and sanitization
- Password field exclusion from responses

## Development

### Adding New Models
1. Create schema in `models/` directory
2. Add validation and indexes
3. Create corresponding controller
4. Add routes

### Database Migrations
For production deployments, consider using a migration tool like `migrate-mongo` for schema changes.

## License

MIT 