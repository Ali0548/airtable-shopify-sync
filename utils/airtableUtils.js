const Airtable = require('airtable');
const config = require('../config/config');

// Global variables
let airtableBase = null;

/**
 * Initialize Airtable connection using config
 */
function initializeAirtable() {
  if (!airtableBase) {
    const apiKey = config.airTable.apiKeyAccessToken;
    const baseId = config.airTable.baseId;
    
    if (!apiKey || !baseId) {
      throw new Error('Airtable API key and base ID are required in config');
    }
    
    airtableBase = new Airtable({ apiKey }).base(baseId);
    console.log('✅ Airtable connection initialized');
  }
  return airtableBase;
}

/**
 * Get all records from a specific table
 * @param {string} tableName - Name of the Airtable table
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of all records
 */
async function getAllRecords(tableName, options = {}) {
  try {
    if (!tableName) {
      throw new Error('Table name is required');
    }

    const base = initializeAirtable();
    console.log(`🔍 Fetching all records from table: ${tableName}`);
    
    const records = [];
    const queryOptions = {};

    // Set query options
    if (options.view) queryOptions.view = options.view;
    if (options.maxRecords) queryOptions.maxRecords = options.maxRecords;
    if (options.fields) queryOptions.fields = options.fields;
    if (options.filterByFormula) queryOptions.filterByFormula = options.filterByFormula;
    if (options.sort) queryOptions.sort = options.sort;
    console.log('options', options)
    // Fetch all pages of records
    return new Promise((resolve, reject) => {
      base(tableName).select(queryOptions).eachPage(
        function page(pageRecords, fetchNextPage) {
          try {
            // Add records from current page
            if (pageRecords && Array.isArray(pageRecords)) {
              pageRecords.forEach(function(record) {
                records.push({
                  id: record.id,
                  fields: record.fields || {},
                  createdTime: record.get ? record.get('Created Time') : record._rawJson?.createdTime || null
                });
              });
            }

            // Fetch next page
            fetchNextPage();
          } catch (pageError) {
            console.error('❌ Error processing page:', pageError);
            reject(pageError);
          }
        },
        function done(err) {
          if (err) {
            console.error('❌ Error fetching records:', err);
            reject(err);
          } else {
            console.log(`✅ Successfully fetched ${records.length} records from ${tableName}`);
            resolve(records);
          }
        }
      );
    });

  } catch (error) {
    console.error('❌ Error in getAllRecords:', error);
    throw error;
  }
}

/**
 * Get records from first page only (faster for preview)
 * @param {string} tableName - Name of the Airtable table
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of records from first page
 */
async function getFirstPageRecords(tableName, options = {}) {
  try {
    if (!tableName) {
      throw new Error('Table name is required');
    }

    const base = initializeAirtable();
    console.log(`🔍 Fetching first page records from table: ${tableName}`);
    
    const queryOptions = {};
    
    // Set query options
    if (options.view) queryOptions.view = options.view;
    if (options.maxRecords) queryOptions.maxRecords = options.maxRecords;
    if (options.fields) queryOptions.fields = options.fields;
    if (options.filterByFormula) queryOptions.filterByFormula = options.filterByFormula;
    if (options.sort) queryOptions.sort = options.sort;

    const records = await new Promise((resolve, reject) => {
      base(tableName).select(queryOptions).firstPage((err, records) => {
        if (err) {
          console.error('❌ Airtable API error:', err);
          reject(err);
          return;
        }

        try {
          const formattedRecords = (records || []).map(record => ({
            id: record.id,
            fields: record.fields || {},
            createdTime: record.get ? record.get('Created Time') : record._rawJson?.createdTime || null
          }));

          resolve(formattedRecords);
        } catch (formatError) {
          console.error('❌ Error formatting records:', formatError);
          reject(formatError);
        }
      });
    });

    console.log(`✅ Successfully fetched ${records.length} records from first page of ${tableName}`);
    return records;

  } catch (error) {
    console.error('❌ Error in getFirstPageRecords:', error);
    throw error;
  }
}

/**
 * Get specific record by ID
 * @param {string} tableName - Name of the Airtable table
 * @param {string} recordId - Record ID
 * @returns {Promise<Object>} Record object
 */
async function getRecord(tableName, recordId) {
  try {
    if (!tableName || !recordId) {
      throw new Error('Table name and record ID are required');
    }

    const base = initializeAirtable();
    console.log(`🔍 Fetching record ${recordId} from table: ${tableName}`);
    
    const record = await base(tableName).find(recordId);
    
    const formattedRecord = {
      id: record.id,
      fields: record.fields,
      createdTime: record.get('Created Time') || record._rawJson.createdTime
    };

    console.log(`✅ Successfully fetched record ${recordId}`);
    return formattedRecord;

  } catch (error) {
    console.error('❌ Error in getRecord:', error);
    throw error;
  }
}

/**
 * Search records by field value
 * @param {string} tableName - Name of the Airtable table
 * @param {string} fieldName - Field name to search
 * @param {string} value - Value to search for
 * @param {Object} options - Additional query options
 * @returns {Promise<Array>} Array of matching records
 */
async function searchRecords(tableName, fieldName, value, options = {}) {
  try {
    const filterFormula = `{${fieldName}} = "${value}"`;
    
    const searchOptions = {
      ...options,
      filterByFormula: filterFormula
    };

    return await getAllRecords(tableName, searchOptions);

  } catch (error) {
    console.error('❌ Error in searchRecords:', error);
    throw error;
  }
}

/**
 * Get connection status
 * @returns {boolean} Connection status
 */
function isConnected() {
  return airtableBase !== null;
}

module.exports = {
  getAllRecords,
  getFirstPageRecords,
  getRecord,
  searchRecords,
  isConnected,
  initializeAirtable
};
