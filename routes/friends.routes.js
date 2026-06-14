const express = require("express");
const {
    getFriendsController,
    removeFriendController,
} = require("../controllers/friends.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authMiddleware, getFriendsController);
router.delete("/:username", authMiddleware, removeFriendController);

module.exports = router;
