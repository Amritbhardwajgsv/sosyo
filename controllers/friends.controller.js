const {
    findReceiverByUsername,
    findPendingFriendRequest,
    areUsersBlocked,
    createFriendRequest,
    getIncomingFriendRequests,
    getOutgoingFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    getFriends,
    removeFriendByUsername,
    blockUserByUsername,
    getBlockedUsers,
    unblockUserByUsername,
} = require("../services/friend.services");

const createFriendRequestController = async (req, res) => {
    const receiverUsername = req.body.receiverUsername?.trim();
    const senderId = req.user.id;

    try {
        if (!receiverUsername) {
            return res.status(400).json({
                success: false,
                message: "Receiver username is required",
            });
        }

        const receiver = await findReceiverByUsername(receiverUsername);

        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: "Receiver not found",
            });
        }

        if (senderId === receiver.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot send a friend request to yourself",
            });
        }

        const receiverId = receiver.id;
        const usersAreBlocked = await areUsersBlocked(senderId, receiverId);

        if (usersAreBlocked) {
            return res.status(403).json({
                success: false,
                message: "Friend request is not allowed",
            });
        }

        const pendingRequest = await findPendingFriendRequest(senderId, receiverId);

        if (pendingRequest) {
            return res.status(409).json({
                success: false,
                message: "Friend request already sent",
            });
        }

        const friendRequest = await createFriendRequest(senderId, receiverId);

        return res.status(201).json({
            success: true,
            message: "Friend request sent successfully",
            friendRequest,
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "A pending friend request already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};
const getIncomingFriendRequestsController = async (req, res) => {
    try {
        const receiverId = req.user.id;

        const requests = await getIncomingFriendRequests(receiverId);

        return res.status(200).json({
            success: true,
            requests,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const getOutgoingFriendRequestsController = async (req, res) => {
    try {
        const requests = await getOutgoingFriendRequests(req.user.id);

        return res.status(200).json({
            success: true,
            requests,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const acceptFriendRequestController = async (req, res) => {
    try {
        const { requestId } = req.params;
        const receiverId = req.user.id;

        if (!/^\d+$/.test(requestId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid friend request ID",
            });
        }

        const result = await acceptFriendRequest(requestId, receiverId);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Pending friend request not found",
            });
        }

        if (result.blocked) {
            return res.status(403).json({
                success: false,
                message: "Friend request cannot be accepted because a user is blocked",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Friend request accepted",
            ...result,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const rejectFriendRequestController = async (req, res) => {
    try {
        const { requestId } = req.params;
        const receiverId = req.user.id;

        if (!/^\d+$/.test(requestId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid friend request ID",
            });
        }

        const friendRequest = await rejectFriendRequest(requestId, receiverId);

        if (!friendRequest) {
            return res.status(404).json({
                success: false,
                message: "Pending friend request not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Friend request rejected",
            friendRequest,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const cancelFriendRequestController = async (req, res) => {
    try {
        const { requestId } = req.params;
        const senderId = req.user.id;

        if (!/^\d+$/.test(requestId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid friend request ID",
            });
        }

        const friendRequest = await cancelFriendRequest(requestId, senderId);

        if (!friendRequest) {
            return res.status(404).json({
                success: false,
                message: "Pending friend request not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Friend request cancelled",
            friendRequest,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const getFriendsController = async (req, res) => {
    try {
        const friends = await getFriends(req.user.id);

        return res.status(200).json({
            success: true,
            friends,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const removeFriendController = async (req, res) => {
    try {
        const friendUsername = req.params.username?.trim();
        const userId = req.user.id;

        if (!friendUsername) {
            return res.status(400).json({
                success: false,
                message: "Friend username is required",
            });
        }

        const friendship = await removeFriendByUsername(userId, friendUsername);

        if (!friendship) {
            return res.status(404).json({
                success: false,
                message: "Friendship not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Friend removed successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const blockUserController = async (req, res) => {
    try {
        const blockedUsername = req.params.username?.trim();
        const blockerId = req.user.id;

        if (!blockedUsername) {
            return res.status(400).json({
                success: false,
                message: "Username is required",
            });
        }

        const result = await blockUserByUsername(blockerId, blockedUsername);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (result.selfBlock) {
            return res.status(400).json({
                success: false,
                message: "You cannot block yourself",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User blocked successfully",
            blockedUser: result.blockedUser,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const getBlockedUsersController = async (req, res) => {
    try {
        const blockedUsers = await getBlockedUsers(req.user.id);

        return res.status(200).json({
            success: true,
            blockedUsers,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const unblockUserController = async (req, res) => {
    try {
        const blockedUsername = req.params.username?.trim();
        const blockerId = req.user.id;

        if (!blockedUsername) {
            return res.status(400).json({
                success: false,
                message: "Username is required",
            });
        }

        const block = await unblockUserByUsername(blockerId, blockedUsername);

        if (!block) {
            return res.status(404).json({
                success: false,
                message: "Blocked user not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User unblocked successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

module.exports = {
    createFriendRequestController,
    getIncomingFriendRequestsController,
    getOutgoingFriendRequestsController,
    acceptFriendRequestController,
    rejectFriendRequestController,
    cancelFriendRequestController,
    getFriendsController,
    removeFriendController,
    blockUserController,
    getBlockedUsersController,
    unblockUserController,
};
