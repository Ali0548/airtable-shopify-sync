const OrderModel = require("../models/Order");

const UpsertOrder = async (orders) => {
  try {
    console.log(`🔄 Starting upsert for ${orders.length} orders...`);
    
    const results = {
      created: 0,
      updated: 0,
      errors: 0,
      errorsList: []
    };

    // Process each order
    for (const order of orders) {
      try {
        // Find order by Shopify ID
        const existingOrder = await OrderModel.findOne({ id: order.id });
        
        if (existingOrder) {
          // Update existing order
          const updatedOrder = await OrderModel.findOneAndUpdate(
            { id: order.id },
            {
              name: order.name,
              metafields: order.metafields,
              legacyResourceId: order.legacyResourceId,
              customer: order.customer,
              displayFinancialStatus: order.displayFinancialStatus,
              createdAt: order.createdAt,
              fulfillments: order.fulfillments,
              displayFulfillmentStatus: order.displayFulfillmentStatus,
              statusPageUrl: order.statusPageUrl,
              airTableRecordId: null,
              airTableTableName: null,
              AirTableApiId: null
            },
            { 
              new: true, // Return the updated document
              runValidators: true // Run schema validators
            }
          );
          
          results.updated++;
          console.log(`✅ Updated order: ${order.name} (ID: ${order.id})`);
        } else {
          // Create new order
          const newOrder = new OrderModel({
            id: order.id,
            name: order.name,
            metafields: order.metafields,
            legacyResourceId: order.legacyResourceId,
            customer: order.customer,
            displayFinancialStatus: order.displayFinancialStatus,
            createdAt: order.createdAt,
            fulfillments: order.fulfillments,
            statusPageUrl: order.statusPageUrl
          });
          
          await newOrder.save();
          results.created++;
          console.log(`✅ Created order: ${order.name} (ID: ${order.id})`);
        }
      } catch (error) {
        results.errors++;
        const errorInfo = {
          orderId: order.id,
          orderName: order.name,
          error: error.message
        };
        results.errorsList.push(errorInfo);
        console.error(`❌ Error upserting order ${order.name} (ID: ${order.id}):`, error.message);
      }
    }

    console.log(`🎉 Upsert completed! Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors}`);
    
    return {
      success: true,
      message: `Upsert completed successfully`,
      data: results
    };

  } catch (error) {
    console.error('❌ Error in UpsertOrder:', error);
    return {
      success: false,
      message: 'Failed to upsert orders',
      error: error.message
    };
  }
};

// Helper function to upsert a single order
const UpsertSingleOrder = async (order) => {
  try {
    const existingOrder = await OrderModel.findOne({ id: order.id });
    
    if (existingOrder) {
      // Update existing order
      const updatedOrder = await OrderModel.findOneAndUpdate(
        { id: order.id },
        {
          name: order.name,
          legacyResourceId: order.legacyResourceId,
          customer: order.customer,
          displayFinancialStatus: order.displayFinancialStatus,
          createdAt: order.createdAt,
          fulfillments: order.fulfillments,
          statusPageUrl: order.statusPageUrl
        },
        { 
          new: true,
          runValidators: true
        }
      );
      
      return {
        success: true,
        action: 'updated',
        data: updatedOrder
      };
    } else {
      // Create new order
      const newOrder = new OrderModel({
        id: order.id,
        name: order.name,
        legacyResourceId: order.legacyResourceId,
        customer: order.customer,
        displayFinancialStatus: order.displayFinancialStatus,
        createdAt: order.createdAt,
        fulfillments: order.fulfillments,
        statusPageUrl: order.statusPageUrl
      });
      
      await newOrder.save();
      
      return {
        success: true,
        action: 'created',
        data: newOrder
      };
    }
  } catch (error) {
    console.error('❌ Error in UpsertSingleOrder:', error);
    return {
      success: false,
      message: 'Failed to upsert order',
      error: error.message
    };
  }
};

// Helper function to find order by ID
const FindOrderById = async (orderId) => {
  try {
    const order = await OrderModel.findOne({ id: orderId });
    
    if (!order) {
      return {
        success: false,
        message: 'Order not found',
        data: null
      };
    }
    
    return {
      success: true,
      data: order
    };
  } catch (error) {
    console.error('❌ Error in FindOrderById:', error);
    return {
      success: false,
      message: 'Failed to find order',
      error: error.message
    };
  }
};

// Helper function to get all orders
const GetAllOrders = async (limit = 100, skip = 0) => {
  try {
    const orders = await OrderModel.find({})
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(limit)
      .skip(skip);
    
    const total = await OrderModel.countDocuments({});
    
    return {
      success: true,
      data: {
        orders,
        total,
        limit,
        skip,
        hasMore: skip + limit < total
      }
    };
  } catch (error) {
    console.error('❌ Error in GetAllOrders:', error);
    return {
      success: false,
      message: 'Failed to get orders',
      error: error.message
    };
  }
};

module.exports = {
  UpsertOrder,
  UpsertSingleOrder,
  FindOrderById,
  GetAllOrders
};