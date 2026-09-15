const accountModel = require("../models/account.model");
const userModel = require("../models/user.model");

async function GetUserBalance(req, res) {
    const user = req.user;
    const {pinCode} = req.body;
    const userDoc = await userModel.findOne({_id: user._id})
    const userAccount = await accountModel.findOne({user: userDoc}).select("+pinCode")
    
    const isValidPinCode = await userAccount.comparePinCode(pinCode);
    
    if(!isValidPinCode){
        return res.status(400).json({message: "Pin code is incorrect"})
    }    
    const balance = await userAccount.getBalance();

    return res.status(200).json({message: "Your Balance fetched successfully", balance: balance})
}


module.exports = GetUserBalance;