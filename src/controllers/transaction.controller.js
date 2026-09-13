const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const emailService = require("../services/email.service");
const accountModel = require("../models/account.model");

async function createTransaction(req, res) {
    const {fromAccount, toAccount, amount, idempotencyKey} = req.body;
    if(!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "Missing required fields"
        })
    }
    const fromAccountDoc = await accountModel.findOne({_id: fromAccount});
    const toAccountDoc = await accountModel.findOne({_id: toAccount});
    if(!fromAccountDoc || !toAccountDoc) {
        return res.status(404).json({
            message: "Account not found"
        })
    }
    const isTransactionAlreadyExists = await transactionModel.findOne({idempotencyKey: idempotencyKey});
    if(isTransactionAlreadyExists) {
        if(isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(400).json({
                message: "Transaction already completed",
                transaction: isTransactionAlreadyExists
            })
        } if(isTransactionAlreadyExists.status === "PENDING") {
            return res.status(400).json({
                message: "Transaction is still pending"
            })
        } if(isTransactionAlreadyExists.status === "FAILED") {
            return res.status(400).json({
                message: "Transaction has failed, please try again"
            })
        } if(isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(400).json({
                message: "Transaction has been reversed, please try again"
            })
        }
    }

    if(fromAccountDoc.status !== "ACTIVE" || toAccountDoc.status !== "ACTIVE") {
        return res.status(400).json({
            message: "One of the accounts is not active"
        })
    }

    const UserBalance = await fromAccountDoc.getBalance();
}