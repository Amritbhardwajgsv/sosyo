const express = require("express");
const {
    registerUser,
    loginUser,
    loginuser_Phonenumber,
    verifyotp,
    getCurrentUser,
} = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-otp", loginuser_Phonenumber);
router.post("/verify-otp", verifyotp);
router.get("/me", authMiddleware, getCurrentUser);

module.exports = router;
