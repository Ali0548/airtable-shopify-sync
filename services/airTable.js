const { transformedDbOrderToUpdateAirTableOrder, transformedDbOrderToCreateAirTableOrder, extractNumberAfterDash } = require("../common");
const airTableWrapper = require("../config/airTable");
const shopifyWrapper = require("../config/shopify");
const OrderModel = require("../models/Order");
const SyncJobModel = require("../models/SyncJob");
const { UpsertOrder } = require("./Order");

const getAllTableDataByTableName = async (tableName) => {
    return await airTableWrapper.get(`/${tableName}`);
};
const upsertRecord = async (tableName, records) => {
    return await airTableWrapper.patch(`/${tableName}`, { records: records });
};
const createRecord = async (tableName, records) => {
    return await airTableWrapper.post(`/${tableName}`, { records: records });
};

const syncAirTableWithDb = async () => {
    try {
        const allOrders = await OrderModel.find({});
        const ordersToCreate = [];
        const orderToUpsert = [];

        allOrders?.forEach(order => {
            if (order?.airTableRecordId) {
                orderToUpsert?.push(transformedDbOrderToUpdateAirTableOrder(order));
            } else {
                ordersToCreate?.push(transformedDbOrderToCreateAirTableOrder(order));
            }
        });

        let createResponse = null;
        let upsertResponse = null;

        // Batch create records (max 10 per request)
        if (ordersToCreate?.length > 0) {
            console.log(`🔄 Creating ${ordersToCreate.length} records in batches of 10...`);

            const createBatches = [];
            for (let i = 0; i < ordersToCreate.length; i += 10) {
                createBatches.push(ordersToCreate.slice(i, i + 10));
            }

            const createResults = [];
            for (let i = 0; i < createBatches.length; i++) {
                console.log(`📦 Processing create batch ${i + 1}/${createBatches.length} (${createBatches[i].length} records)`);
                const batchResult = await createRecord("VIVANTI LONDON ORDER TRACKING", createBatches[i]);
                if (batchResult?.errors?.length === 0) {
                    const batchResultData = await batchResult?.data?.records;
                    for (const bRecord of batchResultData) {
                        const order = await OrderModel.findOne({
                            legacyResourceId: extractNumberAfterDash(bRecord?.fields?.['Order Number'])
                        })
                        if (order) {
                            order.airTableRecordId = bRecord?.id;
                            await order.save();
                        }
                    }
                }
                createResults.push(batchResult);

                // Add small delay between batches to respect rate limits
                if (i < createBatches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            createResponse = {
                totalBatches: createBatches.length,
                totalRecords: ordersToCreate.length,
                results: createResults
            };
        }

        // Batch upsert records (max 10 per request)
        if (orderToUpsert?.length > 0) {
            console.log(`🔄 Upserting ${orderToUpsert.length} records in batches of 10...`);

            const upsertBatches = [];
            for (let i = 0; i < orderToUpsert.length; i += 10) {
                upsertBatches.push(orderToUpsert.slice(i, i + 10));
            }

            const upsertResults = [];
            for (let i = 0; i < upsertBatches.length; i++) {
                console.log(`📦 Processing upsert batch ${i + 1}/${upsertBatches.length} (${upsertBatches[i].length} records)`);
                const batchResult = await upsertRecord("VIVANTI LONDON ORDER TRACKING", upsertBatches[i]);
                upsertResults.push(batchResult);

                // Add small delay between batches to respect rate limits
                if (i < upsertBatches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            upsertResponse = {
                totalBatches: upsertBatches.length,
                totalRecords: orderToUpsert.length,
                results: upsertResults
            };
        }

        console.log('✅ Create Response:', createResponse);
        console.log('✅ Upsert Response:', upsertResponse);

        return {
            success: true,
            message: "Synced AirTable with DB",
            createResponse,
            upsertResponse
        }
    } catch (error) {
        console.error('❌ Error in syncAirTableWithDb:', error);
        return {
            success: false,
            message: error.message
        }
    }
};

const getAllOrdersAndSyncToAirTable = async (triggeredBy = 'manual', metadata = {}) => {
    let syncJob = null;

    try {
        // Create sync job record
        syncJob = await SyncJobModel.createJob('full_sync', triggeredBy, metadata);
        console.log(`🔄 Starting sync job: ${syncJob._id}`);

        // Mark job as running
        await syncJob.markAsRunning();

        // Step 1: Fetch orders from Shopify
        console.log('📦 Fetching orders from Shopify...');
        const { errors: shopifyErrors, data, success } = await shopifyWrapper.getAllOrders(parseInt(150));

        if (!success || (shopifyErrors && shopifyErrors.length > 0)) {
            const error = {
                stage: 'shopify_fetch',
                message: shopifyErrors[0].userMessage || 'Failed to fetch orders from Shopify',
                stack: JSON.stringify(shopifyErrors[0])
            };

            await syncJob.addError('shopify_fetch', error);
            await syncJob.markAsFailed(error);

            return {
                success: false,
                message: error.message,
                error: shopifyErrors[0],
                jobId: syncJob._id
            };
        }

        // Update job with Shopify results
        syncJob.shopifyOrdersFetched = data.orders ? data.orders.length : 0;
        await syncJob.save();

        console.log(`✅ Fetched ${syncJob.shopifyOrdersFetched} orders from Shopify`);

        // Step 2: Upsert orders to database
        console.log('💾 Upserting orders to database...');
        let upsertResult;
        try {
            upsertResult = await UpsertOrder(data.orders);
            syncJob.shopifyOrdersUpserted = upsertResult.upsertedCount || 0;
            await syncJob.save();

            console.log(`✅ Upserted ${syncJob.shopifyOrdersUpserted} orders to database`);
        } catch (upsertError) {
            const error = {
                stage: 'database_upsert',
                message: upsertError.message || 'Failed to upsert orders to database',
                stack: upsertError.stack
            };

            await syncJob.addError('database_upsert', error);
            await syncJob.markAsFailed(error);

            return {
                success: false,
                message: error.message,
                error: upsertError,
                jobId: syncJob._id
            };
        }

        // Step 3: Sync with AirTable
        console.log('🔄 Syncing with AirTable...');
        let airtableResponse;
        try {
            airtableResponse = await syncAirTableWithDb();

            if (airtableResponse.success) {
                syncJob.airtableRecordsCreated = airtableResponse.createResponse?.totalRecords || 0;
                syncJob.airtableRecordsUpdated = airtableResponse.upsertResponse?.totalRecords || 0;
                await syncJob.save();

                console.log(`✅ AirTable sync completed: ${syncJob.airtableRecordsCreated} created, ${syncJob.airtableRecordsUpdated} updated`);
            } else {
                const error = {
                    stage: 'airtable_sync',
                    message: airtableResponse.message || 'Failed to sync with AirTable',
                    stack: JSON.stringify(airtableResponse)
                };

                await syncJob.addError('airtable_sync', error);
                await syncJob.markAsFailed(error);

                return {
                    success: false,
                    message: error.message,
                    error: airtableResponse,
                    jobId: syncJob._id
                };
            }
        } catch (airtableError) {
            const error = {
                stage: 'airtable_sync',
                message: airtableError.message || 'Failed to sync with AirTable',
                stack: airtableError.stack
            };

            await syncJob.addError('airtable_sync', error);
            await syncJob.markAsFailed(error);

            return {
                success: false,
                message: error.message,
                error: airtableError,
                jobId: syncJob._id
            };
        }

        // Mark job as completed
        const summary = {
            shopifyOrdersFetched: syncJob.shopifyOrdersFetched,
            shopifyOrdersUpserted: syncJob.shopifyOrdersUpserted,
            airtableRecordsCreated: syncJob.airtableRecordsCreated,
            airtableRecordsUpdated: syncJob.airtableRecordsUpdated,
            totalDuration: Date.now() - syncJob.startedAt.getTime()
        };

        await syncJob.markAsCompleted(summary);

        console.log(`✅ Sync job ${syncJob._id} completed successfully`);

        return {
            success: true,
            message: 'Full sync completed successfully',
            data: {
                jobId: syncJob._id,
                summary,
                shopifyResult: { ordersFetched: syncJob.shopifyOrdersFetched, ordersUpserted: syncJob.shopifyOrdersUpserted },
                airtableResult: airtableResponse,
                upsertResult
            }
        };

    } catch (error) {
        console.error('❌ Critical error in getAllOrdersAndSyncToAirTable:', error);

        if (syncJob) {
            const jobError = {
                stage: 'critical_error',
                message: error.message || 'Critical error during sync process',
                stack: error.stack
            };

            await syncJob.addError('critical_error', jobError);
            await syncJob.markAsFailed(jobError);
        }

        return {
            success: false,
            message: 'Critical error during sync process',
            error: error.message,
            jobId: syncJob?._id
        };
    }
};

module.exports = {
    getAllTableDataByTableName,
    upsertRecord,
    createRecord,
    syncAirTableWithDb,
    getAllOrdersAndSyncToAirTable
}


