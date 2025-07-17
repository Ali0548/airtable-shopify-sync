const shopifyWrapper = require('../config/shopify');
const { UpsertOrder } = require('../services/Order');

class ShopifyController {
  
  // Get all orders with pagination
  static async getAllOrders(req, res) {
    try {
      const { batchSize = 150 } = req.query;
      
      console.log(`📦 Fetching all orders with batch size: ${batchSize}`);
      
      const { errors, data, success } = await shopifyWrapper.getAllOrders(parseInt(batchSize));
      
      if (!success || (errors && errors.length > 0)) {
        return res.status(400).json({
          success: false,
          message: errors[0].userMessage,
          error: errors[0]
        });
      }
      
      // Upsert orders to database
      const upsertResult = await UpsertOrder(data.orders);
      
      res.json({
        success: true,
        message: `Successfully fetched ${data.totalCount} orders`,
        data: {
          orders: data.orders,
          totalCount: data.totalCount,
          batchSize: data.batchSize,
          totalBatches: data.totalBatches,
          upsertResult: upsertResult
        }
      });
      
    } catch (error) {
      console.error('Shopify Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  
  // Activate webhooks
  static async activateWebhook(req, res) {
    try {
      console.log('🔗 Activating Shopify webhooks...');
      
      const { subscribeToShopifyWebhook } = require('../services/shopify');
      const responses = await subscribeToShopifyWebhook();
      
      const successCount = responses.filter(r => r.success).length;
      const errorCount = responses.filter(r => !r.success).length;
      
      res.json({
        success: true,
        message: `Webhook activation completed. Success: ${successCount}, Errors: ${errorCount}`,
        data: {
          totalWebhooks: responses.length,
          successful: successCount,
          failed: errorCount,
          responses: responses
        }
      });
      
    } catch (error) {
      console.error('Webhook Activation Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate webhooks',
        error: error.message
      });
    }
  }
  
  // // Handle incoming webhooks
  // static async handleWebhook(req, res) {
  //   try {
  //     const topic = req.headers['x-shopify-topic'];
  //     const webhookData = req.body;
      
  //     console.log(`📨 Received webhook for topic: ${topic}`);
  //     console.log('Webhook data:', JSON.stringify(webhookData, null, 2));
      
  //     // Verify webhook authenticity (you should implement this)
  //     // const isValid = verifyWebhookSignature(req);
  //     // if (!isValid) {
  //     //   return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
  //     // }
      
  //     let orderId = null;
      
  //     // Extract order ID from different webhook types
  //     switch (topic) {
  //       case 'orders/create':
  //       case 'orders/updated':
  //       case 'orders/fulfilled':
  //       case 'orders/cancelled':
  //       case 'orders/partially_fulfilled':
  //         if (webhookData.order && webhookData.order.id) {
  //           orderId = webhookData.admin_graphql_api_id;
  //         }
  //         break;
          
  //       case 'fulfillments/create':
  //       case 'fulfillments/update':
  //         if (webhookData.fulfillment && webhookData.fulfillment.order_id) {
  //           orderId = webhookData.fulfillment.order_id;
  //         }
  //         break;
          
  //       case 'draft_orders/create':
  //       case 'draft_orders/update':
  //         if (webhookData.admin_graphql_api_id) {
  //           orderId = webhookData.admin_graphql_api_id;
  //         }
  //         break;
          
  //       default:
  //         console.log(`⚠️ Unhandled webhook topic: ${topic}`);
  //         return res.json({
  //           success: true,
  //           message: `Webhook received for unhandled topic: ${topic}`,
  //           data: { topic }
  //         });
  //     }


  //     console.log('orderId', orderId);
      
  //     // If we have an order ID, fetch the complete order from Shopify and upsert
  //     if (orderId) {
  //       console.log(`🔄 Fetching order ${orderId} from Shopify...`);
  //       const { errors, data, success } = await shopifyWrapper.getOrderById(orderId);
        
  //       if (success && data) {
  //         const orderToUpsert = transformWebhookOrderToDbOrder(data);
  //         const upsertResult = await UpsertOrder([orderToUpsert]);
          
  //         console.log(`✅ Upserted order ${orderId} from webhook`);
          
  //         return res.json({
  //           success: true,
  //           message: `Webhook processed successfully. Order ${orderId} upserted.`,
  //           data: {
  //             topic,
  //             orderId,
  //             upsertResult
  //           }
  //         });
  //       } else {
  //         console.error(`❌ Failed to fetch order ${orderId} from Shopify:`, errors);
  //         return res.status(400).json({
  //           success: false,
  //           message: `Failed to fetch order ${orderId} from Shopify`,
  //           error: errors
  //         });
  //       }
  //     }
      
  //     // Return success if no order ID found (might be other webhook types)
  //     res.json({
  //       success: true,
  //       message: `Webhook received for topic: ${topic} (no order ID found)`,
  //       data: { topic }
  //     });
      
  //   } catch (error) {
  //     console.error('Webhook Handler Error:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to process webhook',
  //       error: error.message
  //     });
  //   }
  // }
  
  // Get orders with custom query
  static async getOrders(req, res) {
    try {
      const { query, variables } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'GraphQL query is required'
        });
      }
      
      const { errors, data, success } = await shopifyWrapper.getOrders(query, variables || {});
      
      if (!success || (errors && errors.length > 0)) {
        return res.status(400).json({
          success: false,
          message: errors[0].userMessage,
          error: errors[0]
        });
      }
      
      res.json({
        success: true,
        data: data
      });
      
    } catch (error) {
      console.error('Shopify Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  
  // Get orders with pagination (manual control)
  static async getOrdersPaginated(req, res) {
    try {
      const { first = 150, after } = req.query;
      
      const query = `
        query GetOrders($first: Int!, $after: String) {
          orders(first: $first, after: $after) {
            nodes {
              id
              name
              legacyResourceId
              customer {
                defaultEmailAddress {
                  emailAddress
                }
                defaultPhoneNumber {
                  phoneNumber
                }
                displayName
              }
              displayFinancialStatus
              createdAt
              fulfillments {
                trackingInfo {
                  number
                }
                displayStatus
              }
              statusPageUrl
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `;
      
      const variables = {
        first: parseInt(first),
        after: after || null
      };
      
      const { errors, data, success } = await shopifyWrapper.query(query, variables);
      
      if (!success || (errors && errors.length > 0)) {
        return res.status(400).json({
          success: false,
          message: errors[0].userMessage,
          error: errors[0]
        });
      }
      
      res.json({
        success: true,
        data: data.orders,
        pagination: data.orders.pageInfo
      });
      
    } catch (error) {
      console.error('Shopify Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

// Helper function to transform webhook order data to database format
const transformWebhookOrderToDbOrder = (webhookOrder) => {
  return {
    id: webhookOrder.id,
    name: webhookOrder.name,
    legacyResourceId: webhookOrder.legacy_resource_id,
    customer: {
      defaultEmailAddress: {
        emailAddress: webhookOrder.email
      },
      defaultPhoneNumber: {
        phoneNumber: webhookOrder.phone
      },
      displayName: webhookOrder.customer?.first_name + ' ' + webhookOrder.customer?.last_name
    },
    displayFinancialStatus: webhookOrder.financial_status,
    createdAt: webhookOrder.created_at,
    fulfillments: webhookOrder.fulfillments?.map(fulfillment => ({
      trackingInfo: {
        number: fulfillment.tracking_number
      },
      displayStatus: fulfillment.status
    })) || [],
    displayFulfillmentStatus: webhookOrder.fulfillment_status,
    statusPageUrl: webhookOrder.order_status_url
  };
};

module.exports = ShopifyController; 