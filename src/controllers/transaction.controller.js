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
  // const { fromAccount, toAccount, amount, idempotencyKey } = req.body;
  // find all the important docs
  const {
    userName: toAccountUserName,
    amount,
    idempotencyKey,
    pinCode,
  } = req.body;
  // get fromAccount form req
  const fromAccount = req.user._id;
  if (
    !fromAccount ||
    !toAccountUserName ||
    !amount ||
    !idempotencyKey ||
    !pinCode
  ) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  } // validate all the important docs

  // validate fromAccountDoc
  const fromAccountDoc = await accountModel.findOne({ user: fromAccount }).select("+pinCode");
  if (!fromAccountDoc) {
    return res.status(404).json({ message: "Sender account not found" });
  }

  // validate toAccountDoc
  const toUserDoc = await userModel.findOne({ userName: toAccountUserName });
  if (!toUserDoc) {
    return res.status(404).json({ message: "Receiver user not found" });
  }
  const toAccountDoc = await accountModel.findOne({ user: toUserDoc._id });
  if (!toAccountDoc) {
    return res.status(404).json({ message: "Receiver account not found" });
  }

  if (!fromAccountDoc || !toAccountDoc) {
    return res.status(404).json({
      message: "Account not found",
    });
  }

  // validate pin code
  const isValidPin = await fromAccountDoc.comparePinCode(pinCode);
  if (!isValidPin) {
    return res.status(401).json({ message: "Invalid PIN" });
  }

  // prevent send money to fromAccount from same account
  if (fromAccountDoc._id.equals(toAccountDoc._id)) {
    return res
      .status(400)
      .json({ message: "Cannot send money to your own account" });
  }
  if (typeof amount !== "number" || amount <= 0) {
    return res
      .status(400)
      .json({ message: "Amount must be a positive number" });
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

  if (fromAccountDoc.status !== "active" || toAccountDoc.status !== "active") {
    return res.status(400).json({
      message: "One of the accounts is not active",
    });
  }

  const userBalance = await fromAccountDoc.getBalance();
  // if (userBalance < amount) {
  //   return res.status(400).json({
  //     message: "Insufficient balance",
  //   });
  // }
  // platform fee calculation
  const systemAccount = await accountModel.findOne({ systemUser: true });
  if (!systemAccount) {
    return res
      .status(500)
      .json({ message: "Platform fee account not configured" });
  }
  const FEE_PERCENT = 2;
  const feeAmount = (amount * FEE_PERCENT) / 100;
  const receiverAmount = amount - feeAmount;
  const session = await mongoose.startSession();
  session.startTransaction();

  const [transaction] = await transactionModel.create(
    [
      {
        fromAccount: fromAccountDoc._id,
        toAccount: toAccountDoc._id,
        amount,
        feeAmount: feeAmount,
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
        account: toAccountDoc._id,
        amount: receiverAmount,
        transaction: transaction._id,
        type: "CREDIT",
      },
    ],
    { session },
  );
  if (feeAmount > 0) {
    await ledgerModel.create(
      [
        {
          account: systemAccount._id,
          amount: feeAmount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      { session },
    );
  }
  transaction.status = "COMPLETED";
  await transaction.save({ session });

  await session.commitTransaction();
  session.endSession();

  await emailService.sendTransactionEmail(
    req.user.email,
    req.user.name,
    amount,
    toAccountUserName,
    transaction._id,
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
