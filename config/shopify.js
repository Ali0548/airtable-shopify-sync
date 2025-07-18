const axios = require('axios');
const config = require('./config');

// Get the current configuration
const currentConfig = config;

// Shopify GraphQL endpoint
const SHOPIFY_GRAPHQL_URL = `https://${currentConfig.shopify.shopName}/admin/api/${currentConfig.shopify.apiVersion}/graphql.json`;

// Create axios instance for Shopify
const shopifyClient = axios.create({
  baseURL: SHOPIFY_GRAPHQL_URL,
  headers: {
    'X-Shopify-Access-Token': currentConfig.shopify.accessToken,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Orders query with pagination
const ORDERS_QUERY = `
  query GetOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after) {
      nodes {
        id
        name
        metafields(first: 100) {
            nodes {
            key
            value
            jsonValue
          }
        }
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
        displayFulfillmentStatus
        createdAt
        fulfillments {
        inTransitAt
        deliveredAt
          trackingInfo {
            number
          }
          displayStatus
           events(first:100) {
          nodes {
            status
            message
          }
        }
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

// Single order query
const ORDER_BY_ID_QUERY = `
  query GetOrderById($id: ID!) {
    order(id: $id) {
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
  }
`;

// Shopify error codes mapping
const SHOPIFY_ERROR_CODES = {
  400: {
    type: 'BAD_REQUEST',
    message: 'The request is malformed or invalid.',
    userMessage: 'Invalid request. Please check your parameters.'
  },
  401: {
    type: 'UNAUTHORIZED',
    message: 'Authentication failed.',
    userMessage: 'Authentication failed. Please check your access token.'
  },
  403: {
    type: 'FORBIDDEN',
    message: 'Access denied.',
    userMessage: 'Access denied. Check your permissions.'
  },
  404: {
    type: 'NOT_FOUND',
    message: 'Resource not found.',
    userMessage: 'The requested resource was not found.'
  },
  422: {
    type: 'UNPROCESSABLE_ENTITY',
    message: 'The request cannot be processed.',
    userMessage: 'The request cannot be processed. Please check your data.'
  },
  429: {
    type: 'RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded.',
    userMessage: 'Too many requests. Please wait and try again.'
  },
  500: {
    type: 'INTERNAL_SERVER_ERROR',
    message: 'Shopify server error.',
    userMessage: 'Shopify server error. Please try again later.'
  },
  502: {
    type: 'BAD_GATEWAY',
    message: 'Shopify gateway error.',
    userMessage: 'Shopify service temporarily unavailable.'
  },
  503: {
    type: 'SERVICE_UNAVAILABLE',
    message: 'Shopify service unavailable.',
    userMessage: 'Shopify service is temporarily unavailable.'
  }
};

// Parse Shopify error response
const parseShopifyError = (error) => {
  const status = error.response?.status || 0;
  const shopifyError = error.response?.data?.errors?.[0];

  // If Shopify returns GraphQL errors
  if (shopifyError) {
    return {
      type: shopifyError.extensions?.code || 'GRAPHQL_ERROR',
      message: shopifyError.message || 'GraphQL error occurred',
      userMessage: shopifyError.message || 'An error occurred while processing your request.',
      status,
      originalError: shopifyError
    };
  }

  // Handle standard HTTP error codes
  if (SHOPIFY_ERROR_CODES[status]) {
    return {
      type: SHOPIFY_ERROR_CODES[status].type,
      message: SHOPIFY_ERROR_CODES[status].message,
      userMessage: SHOPIFY_ERROR_CODES[status].userMessage,
      status,
      originalError: error.response?.data || error.message
    };
  }

  // Handle network errors
  if (error.code === 'ECONNABORTED') {
    return {
      type: 'TIMEOUT',
      message: 'Request timeout',
      userMessage: 'Request timed out. Please try again.',
      status: 0,
      originalError: error.message
    };
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return {
      type: 'NETWORK_ERROR',
      message: 'Network connection error',
      userMessage: 'Unable to connect to Shopify. Please check your internet connection.',
      status: 0,
      originalError: error.message
    };
  }

  // Default error
  return {
    type: 'UNKNOWN_ERROR',
    message: error.message || 'Unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again.',
    status: status || 0,
    originalError: error
  };
};

// Shopify GraphQL wrapper
const shopifyWrapper = {
  // Execute GraphQL query
  async query(query, variables = {}) {
    try {
      const response = await shopifyClient.post('', {
        query,
        variables
      });

      // Check for GraphQL errors in response
      if (response.data.errors && response.data.errors.length > 0) {
        const parsedError = parseShopifyError({
          response: {
            status: 422,
            data: { errors: response.data.errors }
          }
        });

        return {
          errors: [parsedError],
          data: null,
          status: parsedError.status,
          success: false
        };
      }

      return {
        errors: [],
        data: response.data.data,
        status: response.status,
        success: true
      };
    } catch (error) {
      const parsedError = parseShopifyError(error);
      return {
        errors: [parsedError],
        data: null,
        status: parsedError.status,
        success: false
      };
    }
  },

  // Get all orders with pagination
  async getAllOrders(batchSize = 150) {
    let allOrders = [];
    let hasNextPage = true;
    let cursor = null;
    let totalFetched = 0;

    console.log(`🔄 Starting to fetch all orders with batch size: ${batchSize}`);

    while (hasNextPage) {
      try {
        const variables = {
          first: batchSize,
          after: cursor
        };

        const { errors, data } = await this.query(ORDERS_QUERY, variables);

        if (errors && errors.length > 0) {
          console.error('❌ Error fetching orders:', errors[0]);
          return {
            errors,
            data: null,
            success: false
          };
        }

        if (data && data.orders) {
          const orders = data.orders.nodes || [];
          const pageInfo = data.orders.pageInfo;

          allOrders = allOrders.concat(orders);
          totalFetched += orders.length;

          console.log(`✅ Fetched ${orders.length} orders (Total: ${totalFetched})`);

          hasNextPage = pageInfo.hasNextPage;
          cursor = pageInfo.endCursor;

          // Add a small delay to respect rate limits
          if (hasNextPage) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          hasNextPage = false;
        }

      } catch (error) {
        console.error('❌ Error in pagination loop:', error);
        return {
          errors: [{
            type: 'PAGINATION_ERROR',
            message: 'Error during pagination',
            userMessage: 'Failed to fetch all orders due to pagination error.',
            status: 0,
            originalError: error
          }],
          data: null,
          success: false
        };
      }
    }

    console.log(`🎉 Successfully fetched all ${allOrders.length} orders!`);

    return {
      errors: [],
      data: {
        orders: allOrders,
        totalCount: allOrders.length,
        batchSize,
        totalBatches: Math.ceil(totalFetched / batchSize)
      },
      success: true
    };
  },

  // Get order by ID
  async getOrderById(orderId) {
    try {
      console.log(`🔍 Fetching order by ID: ${orderId}`);

      const { errors, data, success } = await this.query(ORDER_BY_ID_QUERY, { id: orderId });

      if (errors && errors.length > 0) {
        console.error('❌ Error fetching order:', errors[0]);
        return {
          errors,
          data: null,
          success: false
        };
      }

      if (data && data.order) {
        console.log(`✅ Successfully fetched order: ${data.order.name}`);
        return {
          errors: [],
          data: data.order,
          success: true
        };
      } else {
        return {
          errors: [{
            type: 'ORDER_NOT_FOUND',
            message: 'Order not found',
            userMessage: 'The specified order was not found.',
            status: 404,
            originalError: 'Order not found'
          }],
          data: null,
          success: false
        };
      }
    } catch (error) {
      console.error('❌ Error in getOrderById:', error);
      return {
        errors: [{
          type: 'FETCH_ERROR',
          message: 'Error fetching order',
          userMessage: 'Failed to fetch order due to an error.',
          status: 0,
          originalError: error
        }],
        data: null,
        success: false
      };
    }
  },

  // Get orders with custom query
  async getOrders(customQuery, variables = {}) {
    return await this.query(customQuery, variables);
  }
};

module.exports = shopifyWrapper;
module.exports.shopifyClient = shopifyClient;
module.exports.parseShopifyError = parseShopifyError; 