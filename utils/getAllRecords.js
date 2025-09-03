const { getAllRecords: getRecords, getFirstPageRecords, searchRecords } = require('./airtableUtils');

/**
 * Simple function to get all records from Airtable
 * Uses existing config variables
 */
async function getAllRecords(tableName = 'VIVANTI LONDON ORDER TRACKING', options = {}) {
  try {
    // Default options
    const defaultOptions = {
      view: 'ALL ORDERS'
    };

    const queryOptions = { ...defaultOptions, ...options };
    
    // Get all records using existing config
    const records = await getRecords(tableName, queryOptions);

    
    return {
      success: true,
      data: records,
      count: records.length,
      message: `Successfully retrieved ${records.length} records from ${tableName}`
    };

  } catch (error) {
    console.error('❌ Error getting all records:', error);
    return {
      success: false,
      data: [],
      count: 0,
      message: error.message,
      error: error
    };
  }
}

/**
 * Get records with specific fields only
 */
async function getAllRecordsWithFields(tableName, fields, options = {}) {
  const queryOptions = {
    ...options,
    fields: fields
  };
  
  return await getAllRecords(tableName, queryOptions);
}

/**
 * Get limited number of records
 */
async function getLimitedRecords(tableName, maxRecords = 10, options = {}) {
  const queryOptions = {
    ...options,
    maxRecords: maxRecords
  };
  
  return await getAllRecords(tableName, queryOptions);
}

/**
 * Get first page only (faster)
 */
async function getFirstPage(tableName = 'VIVANTI LONDON ORDER TRACKING', options = {}) {
  try {
    const defaultOptions = {
      view: 'ALL ORDERS'
    };

    const queryOptions = { ...defaultOptions, ...options };
    const records = await getFirstPageRecords(tableName, queryOptions);
    
    return {
      success: true,
      data: records,
      count: records.length,
      message: `Successfully retrieved ${records.length} records from first page of ${tableName}`
    };

  } catch (error) {
    console.error('❌ Error getting first page records:', error);
    return {
      success: false,
      data: [],
      count: 0,
      message: error.message,
      error: error
    };
  }
}

/**
 * Search records by order number
 */
async function searchByOrderNumber(orderNumber, tableName = 'VIVANTI LONDON ORDER TRACKING') {
  try {
    const records = await searchRecords(tableName, 'Order Number', orderNumber);
    
    return {
      success: true,
      data: records,
      count: records.length,
      message: `Found ${records.length} records with order number: ${orderNumber}`
    };

  } catch (error) {
    console.error('❌ Error searching records:', error);
    return {
      success: false,
      data: [],
      count: 0,
      message: error.message,
      error: error
    };
  }
}

module.exports = {
  getAllRecords,
  getAllRecordsWithFields,
  getLimitedRecords,
  getFirstPage,
  searchByOrderNumber
};
