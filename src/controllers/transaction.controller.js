const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const emailService = require("../services/email.service");
const accountModel = require("../models/account.model");
const mongoose = require("mongoose");

async function createTransaction(req, res) {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;
  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }
  const fromAccountDoc = await accountModel.findOne({ _id: fromAccount });
  const toAccountDoc = await accountModel.findOne({ _id: toAccount });
  if (!fromAccountDoc || !toAccountDoc) {
    return res.status(404).json({
      message: "Account not found",
    });
  }
  const isTransactionAlreadyExists = await transactionModel.findOne({
    idempotencyKey: idempotencyKey,
  });
  if (isTransactionAlreadyExists) {
    if (isTransactionAlreadyExists.status === "COMPLETED") {
      return res.status(400).json({
        message: "Transaction already completed",
        transaction: isTransactionAlreadyExists,
      });
    }
    if (isTransactionAlreadyExists.status === "PENDING") {
      return res.status(400).json({
        message: "Transaction is still pending",
      });
    }
    if (isTransactionAlreadyExists.status === "FAILED") {
      return res.status(400).json({
        message: "Transaction has failed, please try again",
      });
    }
    if (isTransactionAlreadyExists.status === "REVERSED") {
      return res.status(400).json({
        message: "Transaction has been reversed, please try again",
      });
    }
  }

  if (fromAccountDoc.status !== "ACTIVE" || toAccountDoc.status !== "ACTIVE") {
    return res.status(400).json({
      message: "One of the accounts is not active",
    });
  }

  const userBalance = await fromAccountDoc.getBalance();
  if (userBalance < amount) {
    return res.status(400).json({
      message: "Insufficient balance",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  const transaction = await transactionModel.create({
    fromAccount,
    toAccount,
    amount,
    idempotencyKey,
    status : "PENDING",
  }, {session});
  const debitLedgerEntry = await ledgerModel.create({
    account: fromAccount,
    amount: amount,
    transaction: transaction._id,
    type: "DEBIT",
  }, {session});
  const creditLedgerEntry = await ledgerModel.create({
    account: toAccount,
    amount: amount,
    transaction: transaction._id,
    type: "CREDIT",
  }, {session});


  transaction.status = "COMPLETED";
    await transaction.save({session});

    await session.commitTransaction();
    session.endSession();


  await emailService.sendTransactionEmail(req.body.user, req.body.name, amount, toAccountDoc._id);
  return res.status(201).json({
    message: "Transaction completed successfully",
    transaction: transaction,
  });

}


module.exports = { createTransaction };