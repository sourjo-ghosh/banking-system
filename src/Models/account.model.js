const mongoose = require("mongoose");
const ledgerModel = require("../models/ledger.model");

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required for creating an account"],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "frozen", "inactive"],
        message:
          "{VALUE} is not a valid status. Must be active, frozen, or inactive.",
      },
      default: "active",
    },
    currency: {
      type: String,
      required: [true, "Currency is required for creating an account"],
      default: "BDT",
    },
    
  },
  { timestamps: true },
);

accountSchema.index({ user: 1, status: 1 });

accountSchema.methods.getBalance = async function () {
  const BalanceData = await ledgerModel.aggregate([
    { $match: { account: this._id } },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: {
            $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0],
          },
        },
        totalCredit: {
          $sum: {
            $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0],
          },
        },
      },
    },
    {
        $project: {
            _id: 0,
            balance: {
                $subtract: ["$totalCredit", "$totalDebit"]
            }
        }
    }
  ]);
  if(BalanceData.length === 0) {
    return 0;
  }
  return BalanceData[0].balance;
};

const accountModel = mongoose.model("Account", accountSchema);

module.exports = accountModel;
