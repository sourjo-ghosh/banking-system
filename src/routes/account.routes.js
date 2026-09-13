const express = require('express');
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const accountController = require('../controllers/account.controller');


/**
 * - POST /api/accounts
 * - Create a new account
 * - Protected route
 */
router.post("/", authMiddleware.authMiddleware, accountController)

module.exports = router;