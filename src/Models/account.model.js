const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User is required for creating an account"],
        index: true,
    }, 
    status: {
        enum:{
            values: ["active", "frozen", "inactive"],
            message: "Status must be either active or inactive"
        }
    },
    currency: {
        type: String,
        required: [true, "Currency is required for creating an account"],
        default: "BDT",
    }
}, {timestamps: true});

accountSchema.index({user: 1, status: 1});

const accountModel = mongoose.model("Account", accountSchema);

module.exports = accountModel;