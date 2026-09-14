const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const transactionController = require("../controllers/transaction.controller");

/**
 * POST /api/transactions
 * Create a new transaction
 */

router.post("/", authMiddleware.authMiddleware, transactionController.createTransaction)
router.post("/system-initial-funds", authMiddleware.authSystemMiddleware, transactionController.systemInitialFunds)


module.exports = router;