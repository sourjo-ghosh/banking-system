const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const accountModel = require("../models/account.model");

async function authMiddleware (req, res, next) {
    try{
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
        if(!token){
            return res.status(401).json({message: "Unauthorized access token is missing"})
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId);
        if(!user){
            return res.status(401).json({message: "Unauthorized access user not found"})
        }
        req.user = user;
        return next();
    } catch(err){
        return res.status(401).json({message: "Unauthorized access"})
    }
}
async function authSystemMiddleware (req, res, next) {
    try{
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
        if(!token){
            return res.status(401).json({message: "Unauthorized access token is missing"})
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId).select("+systemUser");
        console.log("user", user)
        if(!user){
            return res.status(401).json({message: "Unauthorized access user not found"})
        }
        if(!user.systemUser){
            return res.status(403).json({message: "Forbidden access"})
        }
        req.user = user;
        return next();
    } catch(err){
        return res.status(401).json({message: "Unauthorized access"})
    }
}

module.exports = {authMiddleware, authSystemMiddleware};