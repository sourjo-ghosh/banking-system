const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const transactionController = require("../controllers/transaction.controller");

/**
 * POST /api/transactions
 * Create a new transaction
 */

router.post("/", authMiddleware.authMiddleware, transactionController.createTransaction)


module.exports = router;