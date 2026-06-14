const express = require("express");
const { searchUsers } = require("../controllers/user.controller");
const {
    blockUserController,
    getBlockedUsersController,
    unblockUserController,
} = require("../controllers/friends.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/search", authMiddleware, searchUsers);
router.get("/blocked", authMiddleware, getBlockedUsersController);
router.post("/:username/block", authMiddleware, blockUserController);
router.delete("/:username/block", authMiddleware, unblockUserController);

module.exports = router;
