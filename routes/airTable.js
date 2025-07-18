const router = require("express").Router();
const AirTableController = require("../controllers/airTableController");

router.get("/:tableName", AirTableController.getAllData);
router.get("/orders/sync", AirTableController.syncOverAllAirTableWithDb);  

module.exports = router;