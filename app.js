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
  // Try to connect to MongoDB (but don't fail if it doesn't work)
  console.log('env', process.env.MONGODB_URI);
  if (process.env.MONGODB_URI) {
    try {
      await database.connect();
      console.log('✅ MongoDB connected successfully');
    } catch (dbError) {
      console.warn('⚠️ MongoDB connection failed, continuing without database:', dbError.message);
    }
  } else {
    console.warn('⚠️ No MONGODB_URI provided, skipping database connection');
  }

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
  
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Server is running'
    });
  });
  
  app.use('/', indexRoutes);
  
  app.get('/check', async (req, res) => {
    try {
      if (database.isConnected()) {
        const order = await OrderModel.find({}).lean();
        res.json({
          success: true,
          message: 'Server is running',
          order: order?.map(x => x?.fulfillments?.map(y => y?.events?.nodes))
        });
      } else {
        res.json({
          success: true,
          message: 'Server is running (database not connected)'
        });
      }
    } catch (error) {
      res.json({
        success: true,
        message: 'Server is running (database error)',
        error: error.message
      });
    }
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

    // Start cron service only if database is connected
    if (database.isConnected()) {
      cronService.start();
      console.log(`⏰ Cron service started - sync job scheduled every 6 hours`);
    } else {
      console.log(`⏰ Cron service skipped - database not connected`);
    }
  });
};

// Start the application
initializeApp().catch(error => {
  console.error('❌ Failed to initialize application:', error);
  // Don't exit, just log the error and continue
});

module.exports = app; 