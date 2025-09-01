const cronService = require('../services/cronService');
const SyncJobModel = require('../models/SyncJob');
const { syncAirTableWithDb } = require('../services/airTable');
const shopifyWrapper = require('../config/shopify');
const { UpsertOrder } = require('../services/Order');

class SyncController {
    // Start the cron service
    static async startCronService(req, res) {
        try {
            // Set the sync function before starting
            cronService.setSyncFunction(SyncController.startSyncing);
            cronService.start();

            res.json({
                success: true,
                message: 'Cron service started successfully',
                data: cronService.getStatus()
            });

        } catch (error) {
            console.error('Error starting cron service:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to start cron service',
                error: error.message
            });
        }
    }

    // Stop the cron service
    static async stopCronService(req, res) {
        try {
            cronService.stop();

            res.json({
                success: true,
                message: 'Cron service stopped successfully',
                data: cronService.getStatus()
            });

        } catch (error) {
            console.error('Error stopping cron service:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to stop cron service',
                error: error.message
            });
        }
    }

    // Get cron service status
    static async getCronStatus(req, res) {
        try {
            const status = cronService.getStatus();

            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            console.error('Error getting cron status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get cron status',
                error: error.message
            });
        }
    }

    // Manually trigger a sync job
    static async triggerManualSync(req, res) {
        try {
            const { metadata = {} } = req.body;

            const result = await cronService.triggerManualSync(metadata);

            if (result.success) {
                res.json({
                    success: true,
                    message: 'Manual sync triggered successfully',
                    data: result.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('Error triggering manual sync:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to trigger manual sync',
                error: error.message
            });
        }
    }

    // Get job statistics
    static async getJobStats(req, res) {
        try {
            const stats = await cronService.getJobStats();

            if (stats.success) {
                res.json({
                    success: true,
                    data: stats.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: stats.message,
                    error: stats.error
                });
            }

        } catch (error) {
            console.error('Error getting job stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get job statistics',
                error: error.message
            });
        }
    }

    // Get recent sync jobs
    static async getRecentJobs(req, res) {
        try {
            const { limit = 10 } = req.query;
            const jobs = await SyncJobModel.getRecentJobs(parseInt(limit));

            res.json({
                success: true,
                data: {
                    jobs,
                    total: jobs.length
                }
            });

        } catch (error) {
            console.error('Error getting recent jobs:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get recent jobs',
                error: error.message
            });
        }
    }

    // Get failed jobs
    static async getFailedJobs(req, res) {
        try {
            const jobs = await SyncJobModel.getFailedJobs();

            res.json({
                success: true,
                data: {
                    jobs,
                    total: jobs.length
                }
            });

        } catch (error) {
            console.error('Error getting failed jobs:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get failed jobs',
                error: error.message
            });
        }
    }

    // Get running jobs
    static async getRunningJobs(req, res) {
        try {
            const jobs = await SyncJobModel.getRunningJobs();

            res.json({
                success: true,
                data: {
                    jobs,
                    total: jobs.length
                }
            });

        } catch (error) {
            console.error('Error getting running jobs:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get running jobs',
                error: error.message
            });
        }
    }

    // Get job by ID
    static async getJobById(req, res) {
        try {
            const { jobId } = req.params;

            const job = await SyncJobModel.findById(jobId);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            res.json({
                success: true,
                data: job
            });

        } catch (error) {
            console.error('Error getting job by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get job',
                error: error.message
            });
        }
    }

    // Retry a failed job
    static async retryJob(req, res) {
        try {
            const { jobId } = req.params;

            const job = await SyncJobModel.findById(jobId);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            if (!job.canRetry()) {
                return res.status(400).json({
                    success: false,
                    message: 'Job cannot be retried (max retries reached or not failed)'
                });
            }

            // Increment retry count
            await job.incrementRetry();

            // Re-execute the sync based on job type
            let result;
            if (job.jobType === 'full_sync') {
                result = await SyncController.startSyncing();
            }

            res.json({
                success: true,
                message: 'Job retry initiated',
                data: {
                    jobId: job._id,
                    retryCount: job.retryCount,
                    result
                }
            });

        } catch (error) {
            console.error('Error retrying job:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retry job',
                error: error.message
            });
        }
    }

    // Cancel a running job
    static async cancelJob(req, res) {
        try {
            const { jobId } = req.params;

            const job = await SyncJobModel.findById(jobId);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            if (job.status !== 'running') {
                return res.status(400).json({
                    success: false,
                    message: 'Job is not running and cannot be cancelled'
                });
            }

            job.status = 'cancelled';
            job.completedAt = new Date();
            job.duration = job.completedAt - job.startedAt;
            await job.save();

            res.json({
                success: true,
                message: 'Job cancelled successfully',
                data: job
            });

        } catch (error) {
            console.error('Error cancelling job:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cancel job',
                error: error.message
            });
        }
    }

    // Get sync dashboard data
    static async getDashboardData(req, res) {
        try {
            const [status, stats, recentJobs, failedJobs] = await Promise.all([
                cronService.getStatus(),
                cronService.getJobStats(),
                SyncJobModel.getRecentJobs(5),
                SyncJobModel.getFailedJobs()
            ]);

            res.json({
                success: true,
                data: {
                    cronStatus: status,
                    jobStats: stats.data,
                    recentJobs,
                    failedJobs: failedJobs.slice(0, 5)
                }
            });

        } catch (error) {
            console.error('Error getting dashboard data:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get dashboard data',
                error: error.message
            });
        }
    }

    static async startSyncing() {
       
        try {
            const batchSize = 150;
            const { errors, data, success } = await shopifyWrapper.getAllOrders(parseInt(batchSize));

            if (!success || (errors && errors.length > 0)) {
                return {
                    success: false,
                    message: errors[0].userMessage,
                    error: errors[0]
                }
            }
            const upsertResult = await UpsertOrder(data.orders);
            const syncResult = await syncAirTableWithDb();
            return {
                success: true,
                message: 'Sync completed successfully',
                data: {
                    upsertResult,
                    syncResult
                }
            }
        } catch (error) {
            console.error('Error starting sync:', error);
            return {
                success: false,
                message: 'Failed to start sync',
                error: error.message
            }
        }
    }
    
    static async startSync(req, res) {
        const result = await SyncController.startSyncing();
        return res.status(200).json(result);
    }
}

module.exports = SyncController; 