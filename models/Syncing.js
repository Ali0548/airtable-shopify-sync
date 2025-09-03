const mongoose = require('mongoose');

const syncingSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'cancelled'],
    required: true,
    default: 'running'
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // Duration in milliseconds
    default: null
  },
  errors: {
    type: [String],
    default: []
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  recordsProcessed: {
    type: Number,
    default: 0
  },
  recordsSuccess: {
    type: Number,
    default: 0
  },
  recordsFailed: {
    type: Number,
    default: 0
  },
  syncType: {
    type: String,
    enum: ['manual', 'scheduled', 'partial'],
    default: 'scheduled'
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for better query performance
syncingSchema.index({ status: 1, startedAt: -1 });
syncingSchema.index({ createdAt: -1 });

// Static methods
syncingSchema.statics.getRecentSyncs = function(limit = 10) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

syncingSchema.statics.getRunningSync = function() {
  return this.findOne({ status: 'running' }).lean();
};

syncingSchema.statics.getFailedSyncs = function(limit = 10) {
  return this.find({ status: 'failed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

syncingSchema.statics.getSyncStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    }
  ]);
};

// Instance methods
syncingSchema.methods.markCompleted = function(recordsProcessed = 0, recordsSuccess = 0, recordsFailed = 0) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.duration = this.completedAt - this.startedAt;
  this.recordsProcessed = recordsProcessed;
  this.recordsSuccess = recordsSuccess;
  this.recordsFailed = recordsFailed;
  return this.save();
};

syncingSchema.methods.markFailed = function(error, recordsProcessed = 0) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.duration = this.completedAt - this.startedAt;
  this.recordsProcessed = recordsProcessed;
  
  if (error) {
    this.errors.push(error.toString());
    this.metadata.lastError = error.message;
  }
  
  return this.save();
};

syncingSchema.methods.addError = function(error) {
  this.errors.push(error.toString());
  return this.save();
};

module.exports = mongoose.model('Syncing', syncingSchema);