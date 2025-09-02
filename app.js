require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const database = require('./config/database');
const cron = require('node-cron');
const SyncController = require('./controllers/SyncController');
const OrderModel = require('./models/Order');
const mongoose = require('mongoose');

const app = express();

// Global variable to track cron job status
let cronJobRunning = false;
let syncCronJob = null;

console.log('process.env.PORT', process.env.PORT);
console.log('process.env.NODE_ENV', process.env.NODE_ENV);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));

// Start MongoDB connection
if (process.env.MONGODB_URI) {
  console.log('Connecting to MongoDB...');
  database.connect().then(() => {
    console.log('✅ MongoDB connected successfully');
    
    // Start cron job immediately after MongoDB connection
    if (!process.env.VERCEL && !syncCronJob) {
      console.log('🕐 Starting cron job...');
      // SyncController.startSyncing().then(result => {
      //   console.log('✅ Cron job started - sync scheduled every 10 seconds');
      // }).catch(error => {
      //   console.error('❌ Cron job failed to start:', error);
      // });
      console.log('✅ Cron job started - sync scheduled every 10 seconds');
              // Schedule sync job every 10 seconds
        syncCronJob = cron.schedule('*/10 * * * * *', async () => {
          // '0 */3 * * *'
        // Check if another sync is already running
        
        console.log('🔄 Executing scheduled sync job...');

        // try {
        //   const result = await SyncController.startSyncing();
          
        //   if (result && result.success) {
        //     console.log('✅ Scheduled sync job completed successfully:', result.message);
        //   } else {
        //     console.error('❌ Scheduled sync job failed:', result?.message || 'Unknown error');
        //   }
        // } catch (error) {
        //   console.error('❌ Critical error in scheduled sync job:', error);
        // } finally {
        //   cronJobRunning = false;
        // }
      }, {
        scheduled: true,
        timezone: "UTC"
      });

      console.log('⏰ Cron job started - sync scheduled every 20 minutes');
    } else if (process.env.VERCEL) {
      console.log('⏰ Cron job skipped - running on Vercel');
    } else if (syncCronJob) {
      console.log('⏰ Cron job already running - skipping duplicate');
    }
  }).catch((error) => {
    console.warn('⚠️ MongoDB connection failed:', error.message);
  });
} else {
  console.warn('⚠️ No MONGODB_URI provided');
}

// Routes
const indexRoutes = require('./routes/index');
const userRoutes = require('./routes/users');
const shopifyRoutes = require('./routes/shopify');
const airTableRoutes = require('./routes/airTable');
const syncRoutes = require('./routes/sync');

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    endpoints: {
      health: '/health',
      check: '/check',
      test: '/test',
      users: '/api/users',
      shopify: '/api/shopify',
      airtable: '/api/airtable',
      sync: '/api/sync'
    }
  });
});

// Test route for debugging
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test route is working!',
    timestamp: new Date().toISOString(),
    headers: req.headers,
    url: req.url,
    method: req.method
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database check route
app.get('/check', async (req, res) => {
  try {
    if (database.isConnected()) {
      const order = await OrderModel.find({}).lean();
      res.json({
        success: true,
        message: 'Server is running',
        databaseStatus: 'Connected',
        cronJobStatus: syncCronJob ? 'Running' : 'Not running',
        syncInProgress: cronJobRunning,
        orderCount: order?.length || 0,
        order: order?.map(x => x?.fulfillments?.map(y => y?.events?.nodes))
      });
    } else {
      res.json({
        success: true,
        message: 'Server is running (database not connected)',
        databaseStatus: 'Not connected',
        cronJobStatus: 'Not running',
        syncInProgress: false
      });
    }
  } catch (error) {
    res.json({
      success: true,
      message: 'Server is running (database error)',
      databaseStatus: 'Error',
      cronJobStatus: 'Not running',
      syncInProgress: false,
      error: error.message
    });
  }
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/shopify', shopifyRoutes);
app.use('/api/airtable', airTableRoutes);
app.use('/api/sync', syncRoutes);

// Additional index routes (if any)
app.use('/', indexRoutes);

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
  console.log('404 - Route not found:', req.method, req.url);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.url,
    method: req.method
  });
});

// Only start server if not on Vercel (for local development)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 9090;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Database: ${database.isConnected() ? 'Connected' : 'Disconnected'}`);
    console.log(`🛍️ Shopify API: /api/shopify/orders`);
    console.log(`🔄 Sync API: /api/sync`);

    // Cron job status
    if (database.isConnected() && !process.env.VERCEL && syncCronJob) {
      console.log(`⏰ Cron job is running - sync scheduled every 10 seconds`);
    } else {
      console.log(`⏰ Cron job not running - database not connected or on Vercel`);
    }
  });
}

module.exports = app; 