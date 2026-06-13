const express = require("express");
const {
    registerUser,
    loginUser,
    loginuser_Phonenumber,
    verifyotp,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-otp", loginuser_Phonenumber);
router.post("/verify-otp", verifyotp);


module.exports = router;
