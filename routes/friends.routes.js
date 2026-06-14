const express = require("express");
const {
    getFriendsController,
    removeFriendController,
} = require("../controllers/friends.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authMiddleware, getFriendsController);
router.delete("/:friendId", authMiddleware, removeFriendController);

module.exports = router;
