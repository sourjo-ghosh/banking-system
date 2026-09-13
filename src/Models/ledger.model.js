const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
    account:{
        type: mongoose.Schema.ObjectId,
        ref: "account",
        required: [true, "Ledger must be associated with an account"],
        index: true,    
        immutable: true,
    },
    amount:{
        type: Number,
        required: [true, "Amount is required for a ledger entry"],
        immutable: true,
    },
    transaction:{
        type: mongoose.Schema.ObjectId,
        ref: "transaction",
        required: [true, "Ledger must be associated with a transaction"],
        index: true,
        immutable: true,
    },
    type:{
        type: String,
        enum: {
            values: ["CREDIT", "DEBIT"],
            message: "Ledger type can be either CREDIT or DEBIT"
        },
        required: [true, "Ledger type is required"],
        immutable: true,
    }
}, {timestamps: true})

function PreventLedgerModification(){
    throw new Error("Ledger entries cannot be modified or deleted")
}

ledgerSchema.pre("findOneAndUpdate", PreventLedgerModification)
ledgerSchema.pre("updateOne", PreventLedgerModification)
ledgerSchema.pre("deleteOne", PreventLedgerModification)
ledgerSchema.pre("remove", PreventLedgerModification)
ledgerSchema.pre("deleteMany", PreventLedgerModification)


const ledgerModel = mongoose.model("ledger", ledgerSchema);

module.exports = ledgerModel;