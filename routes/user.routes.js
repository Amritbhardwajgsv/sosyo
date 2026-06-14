const express = require("express");
const { searchUsers } = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/search", authMiddleware, searchUsers);

module.exports = router;
