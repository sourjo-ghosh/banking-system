const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");

/**
 * - user register controller
 * - POST /api/auth/register
 */
async function userRegisterController(req, res) {
  const { email, name, userName, password } = req.body;
  const isExists = await userModel.findOne({
    email: email,
  });
  if (isExists) {
    return res.status(422).json({
      status: "failed",
      message: "User already exists with this email",
    });
  }
  const isUserNameAvailable = await userModel.findOne({ userName: userName });
  if (isUserNameAvailable) {
    return res.status(422).json({
      status: "failed",
      message: "User already exists with this User name, try another username",
    });
  }
  const isUserNameAlreadyTaken = await userModel.findOne({
    userName: userName,
  });
  if (isUserNameAlreadyTaken) {
    return res.status(422).json({
      status: "failed",
      message: "User already exists with this email",
    });
  }
  const user = await userModel.create({
    email,
    name,
    userName,
    password,
  });
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token);
  res.status(201).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
      userName: user.userName,
    },
    jwt_token: token,
  });

  (await emailService.sendRegistrationEmail(user.email, user.name),
    user.userName);
}

async function userLoginController(req, res) {
  const { userName, password } = req.body;
  const user = await userModel.findOne({ userName }).select("+password");
  if (!user) {
    return res.status(401).json({
      message: "Invalid UserName or Password",
    });
  }
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    return res.status(401).json({
      message: "Invalid Password",
    });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });
  res.cookie("token", token);
  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    jwt_token: token,
  });
}

module.exports = { userRegisterController, userLoginController };
