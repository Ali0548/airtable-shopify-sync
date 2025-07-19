const cron = require('node-cron');
const SyncJobModel = require('../models/SyncJob');

class CronService {
    constructor() {
        this.syncJob = null;
        this.isRunning = false;
        this.syncFunction = null;
    }

    // Set the sync function to use
    setSyncFunction(syncFunction) {
        this.syncFunction = syncFunction;
    }

    // Start the cron job scheduler
    start() {
        console.log('🕐 Starting cron service...');
        
        // Schedule sync job every 2 minutes for testing
        this.syncJob = cron.schedule('0 */12 * * *', async () => {
            await this.executeSyncJob();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        console.log('✅ Cron service started. Sync job scheduled every 2 minutes.');
        
        // Also schedule a job to retry failed jobs every hour
        this.retryJob = cron.schedule('0 * * * *', async () => {
            await this.retryFailedJobs();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        console.log('✅ Retry job scheduler started. Failed jobs will be retried every hour.');
    }

    // Stop the cron job scheduler
    stop() {
        if (this.syncJob) {
            this.syncJob.stop();
            console.log('⏹️ Sync cron job stopped.');
        }
        
        if (this.retryJob) {
            this.retryJob.stop();
            console.log('⏹️ Retry cron job stopped.');
        }
        
        console.log('⏹️ Cron service stopped.');
    }

    // Execute the sync job
    async executeSyncJob() {
        if (this.isRunning) {
            console.log('⚠️ Sync job is already running, skipping this execution.');
            return;
        }

        this.isRunning = true;
        console.log('🔄 Executing scheduled sync job...');

        try {
            // Use the sync function if provided, otherwise just log
            if (this.syncFunction) {
                const result = await this.syncFunction();

                if (result.success) {
                    console.log('✅ Scheduled sync job completed successfully:', result.message);
                } else {
                    console.error('❌ Scheduled sync job failed:', result.message);
                }
            } else {
                console.log('⚠️ No sync function provided, skipping sync execution.');
            }

        } catch (error) {
            console.error('❌ Critical error in scheduled sync job:', error);
        } finally {
            this.isRunning = false;
        }
    }

    // Retry failed jobs
    async retryFailedJobs() {
        try {
            console.log('🔄 Checking for failed jobs to retry...');
            
            const failedJobs = await SyncJobModel.getFailedJobs();
            const retryableJobs = failedJobs.filter(job => job.canRetry());
            
            if (retryableJobs.length === 0) {
                console.log('✅ No failed jobs to retry.');
                return;
            }

            console.log(`🔄 Found ${retryableJobs.length} failed jobs to retry.`);

            for (const job of retryableJobs) {
                try {
                    console.log(`🔄 Retrying job ${job._id} (attempt ${job.retryCount + 1}/${job.maxRetries})`);
                    
                    await job.incrementRetry();
                    
                    // Re-execute the sync based on job type
                    if (job.jobType === 'full_sync') {
                        if (this.syncFunction) {
                            const result = await this.syncFunction();
                            
                            if (result.success) {
                                console.log(`✅ Job ${job._id} retry successful.`);
                            } else {
                                console.error(`❌ Job ${job._id} retry failed:`, result.message);
                            }
                        } else {
                            console.log(`⚠️ No sync function provided for job ${job._id} retry.`);
                        }
                    }
                    
                } catch (retryError) {
                    console.error(`❌ Error retrying job ${job._id}:`, retryError);
                }
            }

        } catch (error) {
            console.error('❌ Error in retry job scheduler:', error);
        }
    }

    // Get cron service status
    getStatus() {
        return {
            isRunning: this.isRunning,
            syncJobActive: this.syncJob ? this.syncJob.getStatus() : 'stopped',
            retryJobActive: this.retryJob ? this.retryJob.getStatus() : 'stopped',
            nextSyncTime: this.syncJob ? this.getNextSyncTime() : null
        };
    }

    // Get next sync time
    getNextSyncTime() {
        if (!this.syncJob) return null;
        
        const now = new Date();
        const nextRun = new Date(now);
        
        // Find next 2-minute interval
        const currentMinute = now.getMinutes();
        const nextMinute = Math.ceil((currentMinute + 1) / 2) * 2;
        
        if (nextMinute >= 60) {
            nextRun.setHours(nextRun.getHours() + 1);
            nextRun.setMinutes(0, 0, 0, 0);
        } else {
            nextRun.setMinutes(nextMinute, 0, 0, 0);
        }
        
        return nextRun;
    }

    // Manually trigger a sync job
    async triggerManualSync(metadata = {}) {
        if (this.isRunning) {
            return {
                success: false,
                message: 'Sync job is already running. Please wait for it to complete.'
            };
        }

        console.log('🔄 Manually triggering sync job...');
        
        try {
            if (this.syncFunction) {
                const result = await this.syncFunction();
                return result;
            } else {
                return {
                    success: false,
                    message: 'No sync function provided'
                };
            }

        } catch (error) {
            console.error('❌ Error in manual sync trigger:', error);
            return {
                success: false,
                message: 'Failed to trigger manual sync',
                error: error.message
            };
        }
    }

    // Get recent job statistics
    async getJobStats() {
        try {
            const recentJobs = await SyncJobModel.getRecentJobs(50);
            const failedJobs = await SyncJobModel.getFailedJobs();
            const runningJobs = await SyncJobModel.getRunningJobs();

            const stats = {
                totalJobs: recentJobs.length,
                completedJobs: recentJobs.filter(job => job.status === 'completed').length,
                failedJobs: failedJobs.length,
                runningJobs: runningJobs.length,
                successRate: recentJobs.length > 0 ? 
                    (recentJobs.filter(job => job.status === 'completed').length / recentJobs.length * 100).toFixed(2) : 0,
                averageDuration: recentJobs.length > 0 ? 
                    recentJobs.reduce((sum, job) => sum + (job.duration || 0), 0) / recentJobs.length : 0
            };

            return {
                success: true,
                data: stats
            };

        } catch (error) {
            console.error('❌ Error getting job stats:', error);
            return {
                success: false,
                message: 'Failed to get job statistics',
                error: error.message
            };
        }
    }
}

// Create singleton instance
const cronService = new CronService();

module.exports = cronService; 