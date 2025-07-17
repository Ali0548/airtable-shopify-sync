require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const database = require('./config/database');
const cronService = require('./services/cronService');
const OrderModel = require('./models/Order');

const app = express();
const PORT = process.env.PORT || 9090;

console.log('process.env.PORT', process.env.PORT);
console.log('process.env.NODE_ENV', process.env.NODE_ENV);

// Initialize database connection
const initializeApp = async () => {
  try {
    // Connect to MongoDB
    console.log('env', process.env.MONGODB_URI);
    await database.connect();
    
    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(morgan('combined'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Static files
    app.use(express.static('public'));

    // Routes
    const indexRoutes = require('./routes/index');
    const userRoutes = require('./routes/users');
    const shopifyRoutes = require('./routes/shopify');
    const airTableRoutes = require('./routes/airTable');
    const syncRoutes = require('./routes/sync');

    app.use('/', indexRoutes);
    app.get('/check', async (req, res) => {
      const order = await OrderModel.find({}).lean();
      res.json({
        success: true,
        message: 'Server is running',
        order: order?.map(x => x?.fulfillments?.map(y => y?.events?.nodes))
      });
    });
    app.use('/api/users', userRoutes);
    app.use('/api/shopify', shopifyRoutes);
    app.use('/api/airtable', airTableRoutes);
    app.use('/api/sync', syncRoutes);
    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Database: ${database.isConnected() ? 'Connected' : 'Disconnected'}`);
      console.log(`🛍️ Shopify API: /api/shopify/orders`);
      console.log(`🔄 Sync API: /api/sync`);
      
      // Start cron service
      cronService.start();
      console.log(`⏰ Cron service started - sync job scheduled every 6 hours`);
    });

  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
};

// Start the application
initializeApp();

module.exports = app; 