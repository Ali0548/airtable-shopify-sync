const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a schema for tracking sync jobs
const syncJobSchema = new Schema({
  jobType: { 
    type: String, 
    required: true,
    enum: ['shopify_to_db', 'db_to_airtable', 'full_sync']
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  duration: { type: Number }, // in milliseconds
  
  // Shopify sync details
  shopifyOrdersFetched: { type: Number, default: 0 },
  shopifyOrdersUpserted: { type: Number, default: 0 },
  shopifyErrors: [{ type: Schema.Types.Mixed }],
  
  // AirTable sync details
  airtableRecordsCreated: { type: Number, default: 0 },
  airtableRecordsUpdated: { type: Number, default: 0 },
  airtableErrors: [{ type: Schema.Types.Mixed }],
  
  // General error tracking
  errors: [{ 
    stage: { type: String },
    message: { type: String },
    stack: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Summary
  summary: { type: Schema.Types.Mixed },
  
  // Retry tracking
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  lastRetryAt: { type: Date },
  
  // Metadata
  triggeredBy: { 
    type: String, 
    enum: ['manual', 'cron', 'webhook'],
    default: 'manual'
  },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Indexes for better query performance
syncJobSchema.index({ status: 1, createdAt: -1 });
syncJobSchema.index({ jobType: 1, status: 1 });
syncJobSchema.index({ startedAt: -1 });

// Instance methods
syncJobSchema.methods.markAsRunning = function() {
  this.status = 'running';
  this.startedAt = new Date();
  return this.save();
};

syncJobSchema.methods.markAsCompleted = function(summary = {}) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.duration = this.completedAt - this.startedAt;
  this.summary = summary;
  return this.save();
};

syncJobSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.duration = this.completedAt - this.startedAt;
  
  if (error) {
    this.errors.push({
      stage: error.stage || 'unknown',
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date()
    });
  }
  
  return this.save();
};

syncJobSchema.methods.addError = function(stage, error) {
  this.errors.push({
    stage,
    message: error.message || 'Unknown error',
    stack: error.stack,
    timestamp: new Date()
  });
  return this.save();
};

syncJobSchema.methods.canRetry = function() {
  return this.retryCount < this.maxRetries && this.status === 'failed';
};

syncJobSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  this.status = 'pending';
  return this.save();
};

// Static methods
syncJobSchema.statics.createJob = function(jobType, triggeredBy = 'manual', metadata = {}) {
  return this.create({
    jobType,
    triggeredBy,
    metadata
  });
};

syncJobSchema.statics.getRecentJobs = function(limit = 10) {
  return this.find({})
    .sort({ createdAt: -1 })
    .limit(limit);
};

syncJobSchema.statics.getFailedJobs = function() {
  return this.find({ status: 'failed' })
    .sort({ createdAt: -1 });
};

syncJobSchema.statics.getRunningJobs = function() {
  return this.find({ status: 'running' });
};

// Create a model from the schema
const SyncJobModel = mongoose.model('SyncJob', syncJobSchema);

module.exports = SyncJobModel; 