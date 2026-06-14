const express = require("express");
const {
    registerUser,
    loginUser,
    loginuser_Phonenumber,
    verifyotp,
    getCurrentUser,
    logoutUser,
    logoutAllDevices,
} = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-otp", loginuser_Phonenumber);
router.post("/verify-otp", verifyotp);
router.get("/me", authMiddleware, getCurrentUser);
router.post("/logout", authMiddleware, logoutUser);
router.post("/logout-all", authMiddleware, logoutAllDevices);

module.exports = router;
