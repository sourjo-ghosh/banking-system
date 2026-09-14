const accountModel = require("../models/account.model");
const userModel = require("../models/user.model");

async function accountController(req, res) {
    const user = req.user;
    const {pinCode} = req.body;
    console.log(pinCode, "at account controller")
    const userName = await userModel.findOne(user._id)
    console.log(userName)
    const account = await accountModel.create({
        user: user._id,
        pinCode: pinCode
    })

    return res.status(201).json({
        account: account,
        message: "New account created"
    })
}

module.exports = accountController;