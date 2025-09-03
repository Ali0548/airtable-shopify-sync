const config = require('../config/config');

async function debugAirtableConnection() {
  console.log('🔍 Debugging Airtable connection...\n');
  
  // Check config values
  console.log('Config values:');
  console.log('- API Key:', config.airTable.apiKeyAccessToken ? '✅ Present' : '❌ Missing');
  console.log('- Base ID:', config.airTable.baseId ? '✅ Present' : '❌ Missing');
  console.log('- API Key length:', config.airTable.apiKeyAccessToken?.length || 0);
  console.log('- Base ID:', config.airTable.baseId);
  
  if (!config.airTable.apiKeyAccessToken || !config.airTable.baseId) {
    console.log('\n❌ Missing Airtable configuration. Check your .env file.');
    return;
  }
  
  try {
    const Airtable = require('airtable');
    const base = new Airtable({ 
      apiKey: config.airTable.apiKeyAccessToken 
    }).base(config.airTable.baseId);
    
    console.log('\n🔍 Testing simple API call...');
    
    // Test with minimal options first
    const testPromise = new Promise((resolve, reject) => {
      base('VIVANTI LONDON ORDER TRACKING').select({
        maxRecords: 1,
        view: 'ALL ORDERS'
      }).firstPage((err, records) => {
        if (err) {
          console.error('❌ API Error:', err);
          reject(err);
          return;
        }
        
        console.log('✅ API Response received');
        console.log('- Records count:', records?.length || 0);
        
        if (records && records.length > 0) {
          const firstRecord = records[0];
          console.log('- First record ID:', firstRecord.id);
          console.log('- First record fields:', Object.keys(firstRecord.fields || {}));
        }
        
        resolve(records);
      });
    });
    
    await testPromise;
    console.log('\n✅ Airtable connection test successful!');
    
  } catch (error) {
    console.error('\n❌ Airtable connection test failed:', error.message);
    console.error('Error details:', error);
  }
}

// Run if called directly
if (require.main === module) {
  debugAirtableConnection();
}

module.exports = { debugAirtableConnection };
