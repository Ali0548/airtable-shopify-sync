const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a schema for the Shopify order
const orderSchema = new Schema({
  id: { type: String },
  name: { type: String },
  legacyResourceId: { type: String },
  customer: { type: Schema.Types.Mixed, default: null },
  displayFinancialStatus: { type: String },
  createdAt: { type: Date },
  fulfillments: { type: [Schema.Types.Mixed], default: [] },
  displayFulfillmentStatus: { type: String },
  statusPageUrl: { type: String },
  airTableRecordId: { type: String },
  airTableTableName: { type: String },
  AirTableApiId: { type: String },
  metafields: { type: [Schema.Types.Mixed], default: [] }
}, {
  timestamps: true // adds createdAt and updatedAt fields automatically
});

// Create a model from the schema
const OrderModel = mongoose.model('Order', orderSchema);

module.exports = OrderModel;
