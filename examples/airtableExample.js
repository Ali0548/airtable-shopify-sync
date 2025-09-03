const { getAllRecords, getFirstPage, searchByOrderNumber, getLimitedRecords } = require('../utils/getAllRecords');

async function testAirtableConnection() {
  try {
    console.log('🚀 Testing Airtable connection with existing config...\n');

    // Example 1: Get all records
    console.log('=== Example 1: Get All Records ===');
    const allRecordsResult = await getAllRecords();
    
    if (allRecordsResult.success) {
      console.log(`✅ ${allRecordsResult.message}`);
      
      // Show first few records
      allRecordsResult.data.slice(0, 3).forEach((record, index) => {
        console.log(`Record ${index + 1}:`, {
          id: record.id,
          orderNumber: record.fields['Order Number'],
          createdTime: record.createdTime
        });
      });
    } else {
      console.log(`❌ ${allRecordsResult.message}`);
    }

    // Example 2: Get first page only (faster)
    console.log('\n=== Example 2: Get First Page Records ===');
    const firstPageResult = await getFirstPage('VIVANTI LONDON ORDER TRACKING', {
      maxRecords: 3
    });
    
    if (firstPageResult.success) {
      console.log(`✅ ${firstPageResult.message}`);
      firstPageResult.data.forEach((record, index) => {
        console.log(`Record ${index + 1}:`, record.fields['Order Number']);
      });
    } else {
      console.log(`❌ ${firstPageResult.message}`);
    }

    // Example 3: Get limited records
    console.log('\n=== Example 3: Get Limited Records ===');
    const limitedResult = await getLimitedRecords('VIVANTI LONDON ORDER TRACKING', 5);
    
    if (limitedResult.success) {
      console.log(`✅ ${limitedResult.message}`);
      console.log('Order Numbers:', limitedResult.data.map(r => r.fields['Order Number']));
    } else {
      console.log(`❌ ${limitedResult.message}`);
    }

    // Example 4: Search by order number
    console.log('\n=== Example 4: Search by Order Number ===');
    if (allRecordsResult.success && allRecordsResult.data.length > 0) {
      const firstOrderNumber = allRecordsResult.data[0].fields['Order Number'];
      if (firstOrderNumber) {
        const searchResult = await searchByOrderNumber(firstOrderNumber);
        
        if (searchResult.success) {
          console.log(`✅ ${searchResult.message}`);
        } else {
          console.log(`❌ ${searchResult.message}`);
        }
      }
    }

    console.log('\n✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in examples:', error.message);
  }
}

// Run the examples
if (require.main === module) {
  testAirtableConnection();
}

module.exports = { testAirtableConnection };
