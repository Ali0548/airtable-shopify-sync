const { transformedDbOrderToAirTableOrder, transformedDbOrderToUpdateAirTableOrder, transformedDbOrderToCreateAirTableOrder } = require("../common");
const OrderModel = require("../models/Order");
const airTableService = require("../services/airTable");
const getAllData = async (req, res) => {
    const { tableName } = req.params;
    console.log(tableName);
    const { errors, data } = await airTableService.getAllTableDataByTableName(tableName);
    if (errors.length > 0) {
        return res.status(500).json({ errors });
    }
    return res.status(200).json({ data });
}



const syncOverAllAirTableWithDb = async (req, res) => {
    const response = await airTableService.syncAirTableWithDb();
    return res.status(200).json({ response });
}

module.exports = {
    getAllData,
    syncOverAllAirTableWithDb
}