const express = require('express');
const SyncController = require('../controllers/SyncController');

const router = express.Router();

// Cron service management
router.post('/cron/start', SyncController.startCronService);
router.post('/cron/stop', SyncController.stopCronService);
router.get('/cron/status', SyncController.getCronStatus);

// Manual sync operations
router.post('/manual', SyncController.triggerManualSync);

// Job management
router.get('/jobs', SyncController.getRecentJobs);
router.get('/jobs/failed', SyncController.getFailedJobs);
router.get('/jobs/running', SyncController.getRunningJobs);
router.get('/jobs/:jobId', SyncController.getJobById);
router.post('/jobs/:jobId/retry', SyncController.retryJob);
router.post('/jobs/:jobId/cancel', SyncController.cancelJob);

// Statistics and monitoring
router.get('/stats', SyncController.getJobStats);
router.get('/dashboard', SyncController.getDashboardData);

router.get('/start', SyncController.startSync);

module.exports = router; 