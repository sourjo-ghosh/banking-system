const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User is required for creating an account"],
        index: true,
    }, 
    status: {
        type: String,
        enum:{
            values: ["active", "frozen", "inactive"],
            message: "{VALUE} is not a valid status. Must be active, frozen, or inactive."
        },
        default: "active"
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