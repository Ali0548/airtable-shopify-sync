const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const SyncingSchema = new Schema(
  {
    
    status: {
      type: String,
      required: true,
      enum: ["pending", "running", "completed", "failed"],
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    duration: { type: Number }, // in milliseconds
    errors: [{ type: Schema.Types.Mixed }],
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

const SyncingModel = mongoose.model("Syncing", SyncingSchema);
module.exports = SyncingModel;
