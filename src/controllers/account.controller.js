const accountModel = require("../models/account.model")

async function accountController(req, res) {
    const user = req.user;
    const account = await accountModel.create({
        user: user._id
    })

    return res.status(201).json({
        account: account,
        message: "New account created"
    })
}

module.exports = accountController;