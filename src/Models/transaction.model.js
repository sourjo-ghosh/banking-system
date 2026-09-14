const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    fromAccount:{
        type: mongoose.Schema.ObjectId,
        ref: "account",
        required: [true, "Transaction must be associated with a From account"],
        index: true,
    },
    toAccount:{
        type: mongoose.Schema.ObjectId,
        ref: "account",
        required: [true, "Transaction must be associated with a To account"],
        index: true,
    },
    status:{
        type: String,
        enum: {
            values: ["PENDING", "COMPLETED","FAILED","REVERSED"],
            message: "Status can be either PENDING, COMPLETED, FAILED or REVERSED"
        },
        default: "PENDING",
    },
    amount: {
        type:Number,
        required:[true, "Amount is required for a transaction"],
        min: [0, "Transaction can not be negative"]
    },
    feeAmount: {
        type:Number,
        required:[true, "Amount is required for a transaction"],
        min: [0, "Transaction can not be negative"]
    },
    idempotencyKey:{
        type: String,
        required: [true, "Idempotency key is required for a transaction"],
        index: true,
        unique: true,
    }
},{timestamps: true});

const transactionModel = mongoose.model("transaction", transactionSchema);

module.exports = transactionModel;