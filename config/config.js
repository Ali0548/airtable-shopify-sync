const dotenv = require('dotenv');
dotenv.config();

const config = {
  development: {
    port: process.env.PORT || 9090,
    nodeEnv: 'development',
    cors: {
      origin: '*',
      credentials: true
    },
    database: {
      uri: process.env.MONGODB_URI
    },
    airTable: {
      baseId: process.env.AIRTABLE_BASE_ID,
      apiKeyAccessToken: process.env.AIRTABLE_API_KEY_ACCESS_TOKEN
    },
    shopify: {
      shopName: process.env.SHOPIFY_SHOP_NAME,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
      apiVersion: process.env.SHOPIFY_API_VERSION,
      SHOPIFY_WEBHOOK_URL: process.env.SHOPIFY_WEBHOOK_URL
    }
  },
  production: {
    port: process.env.PORT || 9090,
    nodeEnv: 'production',
    cors: {
      origin: '*',
      credentials: true
    },
    database: {
      uri: process.env.MONGODB_URI
    },
    airTable: {
      baseId: process.env.AIRTABLE_BASE_ID,
      apiKeyAccessToken: process.env.AIRTABLE_API_KEY_ACCESS_TOKEN
    },
    shopify: {
      shopName: process.env.SHOPIFY_SHOP_NAME,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
      apiVersion: process.env.SHOPIFY_API_VERSION,
      SHOPIFY_WEBHOOK_URL: process.env.SHOPIFY_WEBHOOK_URL
    }
  }
};

module.exports = config[process.env.NODE_ENV || 'development']; 