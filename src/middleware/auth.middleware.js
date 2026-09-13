const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");

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

module.exports = {authMiddleware};