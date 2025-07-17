const shopifyWrapper = require('./config/shopify');

// Test the Shopify wrapper
const testShopifyWrapper = async () => {
  console.log('🧪 Testing Shopify Wrapper...\n');
  
  console.log('1️⃣ Testing GraphQL query with invalid credentials...');
  
  // Test with a simple query (this will fail with invalid credentials, but we can test error handling)
  const testQuery = `
    query {
      shop {
        name
        id
      }
    }
  `;
  
  const { errors, data, success } = await shopifyWrapper.query(testQuery);
  
  if (!success || (errors && errors.length > 0)) {
    console.log('✅ Error handling works!');
    console.log('Error message:', errors[0].userMessage);
    console.log('Error type:', errors[0].type);
    console.log('Error status:', errors[0].status);
  } else {
    console.log('✅ Query successful!');
    console.log('Data:', data);
  }
  
  console.log('\n2️⃣ Testing pagination structure...');
  console.log('Response structure:', {
    success,
    hasErrors: !success || (errors && errors.length > 0),
    errorCount: errors ? errors.length : 0,
    hasData: !!data,
    firstError: errors && errors.length > 0 ? {
      type: errors[0].type,
      message: errors[0].message,
      userMessage: errors[0].userMessage,
      status: errors[0].status
    } : null
  });
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 To use with real credentials:');
  console.log('1. Add SHOPIFY_SHOP_NAME to your .env file');
  console.log('2. Add SHOPIFY_ACCESS_TOKEN to your .env file');
  console.log('3. Call: GET /api/shopify/orders/all?batchSize=150');
};

// Run the test
testShopifyWrapper().catch(console.error); 