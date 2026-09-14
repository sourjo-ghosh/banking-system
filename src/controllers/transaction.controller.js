const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const emailService = require("../services/email.service");
const accountModel = require("../models/account.model");
const mongoose = require("mongoose");
const userModel = require("../models/user.model");

/**
* - Create a new transaction
* THE 10-STEP TRANSFER FLOW:
    1. Validate request
    2. Validate idempotency key
    3. Check account status
    4. Derive sender balance from ledger
    5. Create transaction (PENDING)
    6. Create DEBIT ledger entry
    7. Create CREDIT ledger entry
    8. Mark transaction COMPLETED
    9. Commit MongoDB session
    10. Send email notification
*/

async function createTransaction(req, res) {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;
  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }
  const fromAccountDoc = await userModel.findOne({ _id: fromAccount });
  const toAccountDoc = await userModel.findOne({ _id: toAccount });
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

//   if (fromAccountDoc.status !== "ACTIVE" || toAccountDoc.status !== "ACTIVE") {
//     return res.status(400).json({
//       message: "One of the accounts is not active",
//     });
//   }

  const userBalance = await fromAccountDoc.getBalance();
  if (userBalance < amount) {
    return res.status(400).json({
      message: "Insufficient balance",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  const [transaction] = await transactionModel.create(
    [
      {
        fromAccount: fromAccountDoc._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING",
      },
    ],
    { session },
  );

  const [debitLedgerEntry] = await ledgerModel.create(
    [
      {
        account: fromAccountDoc._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT",
      },
    ],
    { session },
  );

  const [creditLedgerEntry] = await ledgerModel.create(
    [
      {
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT",
      },
    ],
    { session },
  );

  transaction.status = "COMPLETED";
  await transaction.save({ session });

  await session.commitTransaction();
  session.endSession();

  await emailService.sendTransactionEmail(
    req.body.user,
    req.body.name,
    amount,
    toAccountDoc._id,
  );
  return res.status(201).json({
    message: "Transaction completed successfully",
    transaction: transaction,
  });
}

async function systemInitialFunds(req, res) {
  const { toAccount, amount, idempotencyKey } = req.body;
  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }
  const toAccountDoc = await userModel.findOne({ _id: toAccount });
  if (!toAccountDoc) {
    return res.status(404).json({
      message: "Account not found",
    });
  }

  const fromAccountDoc = await userModel.findOne({
    systemUser: true,
    _id: req.user._id,
  });
  if (!fromAccountDoc) {
    return res.status(404).json({
      message: "System account not found",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  // const transaction = new transactionModel({
  //     fromAccount: fromAccountDoc._id,
  //     toAccount,
  //     amount,
  //     idempotencyKey,
  //     status: "PENDING",
  // }, { session });
  // const debitLedgerEntry = await ledgerModel.create([{
  //     account: fromAccountDoc._id,
  //     amount: amount,
  //     transaction: transaction._id,
  //     type: "DEBIT",
  // }], { session });
  // const creditLedgerEntry = await ledgerModel.create([{
  //     account: toAccount,
  //     amount: amount,
  //     transaction: transaction._id,
  //     type: "CREDIT",
  // }], { session });

  const [transaction] = await transactionModel.create(
    [
      {
        fromAccount: fromAccountDoc._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING",
      },
    ],
    { session },
  );

  const [debitLedgerEntry] = await ledgerModel.create(
    [
      {
        account: fromAccountDoc._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT",
      },
    ],
    { session },
  );

  const [creditLedgerEntry] = await ledgerModel.create(
    [
      {
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT",
      },
    ],
    { session },
  );

  transaction.status = "COMPLETED";
  await transaction.save({ session });

  await session.commitTransaction();
  session.endSession();

  //   transaction.status = "COMPLETED";
  //   await transaction.save({ session });

  //   await session.commitTransaction();
  //   session.endSession();

  return res.status(201).json({
    message: "System initial funds transaction completed successfully",
    transaction: transaction,
  });
}

module.exports = { createTransaction, systemInitialFunds };
