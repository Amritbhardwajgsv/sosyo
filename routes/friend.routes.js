const express = require("express");
const {
    createFriendRequestController,
    getIncomingFriendRequestsController,
    getOutgoingFriendRequestsController,
    acceptFriendRequestController,
    rejectFriendRequestController,
    cancelFriendRequestController,
} = require("../controllers/friends.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", authMiddleware, createFriendRequestController);
router.get("/incoming", authMiddleware, getIncomingFriendRequestsController);
router.get("/outgoing", authMiddleware, getOutgoingFriendRequestsController);
router.patch("/:requestId/accept", authMiddleware, acceptFriendRequestController);
router.patch("/:requestId/reject", authMiddleware, rejectFriendRequestController);
router.delete("/:requestId", authMiddleware, cancelFriendRequestController);

module.exports = router;
