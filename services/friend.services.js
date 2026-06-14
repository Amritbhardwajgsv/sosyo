const pool = require("../config/db");

const findReceiverByUsername = async (receiverUsername) => {
    const result = await pool.query(
        `SELECT id, username
         FROM xsah_user
         WHERE LOWER(username) = LOWER($1)`,
        [receiverUsername]
    );

    return result.rows[0];
};

const findPendingFriendRequest = async (senderId, receiverId) => {
    const result = await pool.query(
        `SELECT id, sender_id, receiver_id, status, created_at
         FROM xsah_friends_request_tab
         WHERE (
             (sender_id = $1 AND receiver_id = $2)
             OR
             (sender_id = $2 AND receiver_id = $1)
         )
         AND status = 'pending'
         LIMIT 1`,
        [senderId, receiverId]
    );

    return result.rows[0];
};

const areUsersBlocked = async (userOneId, userTwoId) => {
    const result = await pool.query(
        `SELECT id
         FROM xsah_user_blocks_tab
         WHERE (blocker_id = $1 AND blocked_id = $2)
            OR (blocker_id = $2 AND blocked_id = $1)
         LIMIT 1`,
        [userOneId, userTwoId]
    );

    return Boolean(result.rows[0]);
};

const createFriendRequest = async (senderId, receiverId) => {
    const result = await pool.query(
        `INSERT INTO xsah_friends_request_tab (
            sender_id,
            receiver_id
         )
         VALUES ($1, $2)
         RETURNING
            id,
            sender_id,
            receiver_id,
            status,
            created_at`,
        [senderId, receiverId]
    );

    return result.rows[0];
};
const getIncomingFriendRequests = async (receiverId) => {
    const result = await pool.query(
        `SELECT
            fr.id AS request_id,
            fr.sender_id,
            u.username AS sender_username,
            fr.status,
            fr.created_at
         FROM xsah_friends_request_tab AS fr
         JOIN xsah_user AS u
           ON u.id = fr.sender_id
         WHERE fr.receiver_id = $1
           AND fr.status = 'pending'
         ORDER BY fr.created_at DESC`,
        [receiverId]
    );

    return result.rows;
};

const getOutgoingFriendRequests = async (senderId) => {
    const result = await pool.query(
        `SELECT
            fr.id AS request_id,
            fr.receiver_id,
            u.username AS receiver_username,
            fr.status,
            fr.created_at
         FROM xsah_friends_request_tab AS fr
         JOIN xsah_user AS u
           ON u.id = fr.receiver_id
         WHERE fr.sender_id = $1
           AND fr.status = 'pending'
         ORDER BY fr.created_at DESC`,
        [senderId]
    );

    return result.rows;
};

const acceptFriendRequest = async (requestId, receiverId) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const requestResult = await client.query(
            `SELECT id, sender_id, receiver_id
             FROM xsah_friends_request_tab
             WHERE id = $1
               AND receiver_id = $2
               AND status = 'pending'
             FOR UPDATE`,
            [requestId, receiverId]
        );

        const friendRequest = requestResult.rows[0];

        if (!friendRequest) {
            await client.query("ROLLBACK");
            return null;
        }

        const blockResult = await client.query(
            `SELECT id
             FROM xsah_user_blocks_tab
             WHERE (blocker_id = $1 AND blocked_id = $2)
                OR (blocker_id = $2 AND blocked_id = $1)
             LIMIT 1`,
            [friendRequest.sender_id, friendRequest.receiver_id]
        );

        if (blockResult.rows[0]) {
            await client.query("ROLLBACK");
            return { blocked: true };
        }

        const friendshipResult = await client.query(
            `INSERT INTO xsah_friendship_tab (
                user_one_id,
                user_two_id
             )
             VALUES (
                LEAST($1::uuid, $2::uuid),
                GREATEST($1::uuid, $2::uuid)
             )
             ON CONFLICT (user_one_id, user_two_id)
             DO UPDATE SET user_one_id = EXCLUDED.user_one_id
             RETURNING id, user_one_id, user_two_id, created_at`,
            [friendRequest.sender_id, friendRequest.receiver_id]
        );

        const updatedRequestResult = await client.query(
            `UPDATE xsah_friends_request_tab
             SET status = 'accepted',
                 responded_at = NOW()
             WHERE id = $1
             RETURNING id, sender_id, receiver_id, status, created_at, responded_at`,
            [requestId]
        );

        await client.query("COMMIT");

        return {
            friendRequest: updatedRequestResult.rows[0],
            friendship: friendshipResult.rows[0],
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const rejectFriendRequest = async (requestId, receiverId) => {
    const result = await pool.query(
        `UPDATE xsah_friends_request_tab
         SET status = 'rejected',
             responded_at = NOW()
         WHERE id = $1
           AND receiver_id = $2
           AND status = 'pending'
         RETURNING id, sender_id, receiver_id, status, created_at, responded_at`,
        [requestId, receiverId]
    );

    return result.rows[0];
};

const cancelFriendRequest = async (requestId, senderId) => {
    const result = await pool.query(
        `UPDATE xsah_friends_request_tab
         SET status = 'cancelled',
             responded_at = NOW()
         WHERE id = $1
           AND sender_id = $2
           AND status = 'pending'
         RETURNING id, sender_id, receiver_id, status, created_at, responded_at`,
        [requestId, senderId]
    );

    return result.rows[0];
};

const getFriends = async (userId) => {
    const result = await pool.query(
        `SELECT
            f.id AS friendship_id,
            u.id AS friend_id,
            u.username,
            f.created_at AS friends_since
         FROM xsah_friendship_tab AS f
         JOIN xsah_user AS u
           ON u.id = CASE
               WHEN f.user_one_id = $1 THEN f.user_two_id
               ELSE f.user_one_id
           END
         WHERE (
             f.user_one_id = $1
             OR f.user_two_id = $1
         )
           AND NOT EXISTS (
               SELECT 1
               FROM xsah_user_blocks_tab AS b
               WHERE (b.blocker_id = $1 AND b.blocked_id = u.id)
                  OR (b.blocker_id = u.id AND b.blocked_id = $1)
           )
         ORDER BY u.username`,
        [userId]
    );

    return result.rows;
};

const removeFriendByUsername = async (userId, friendUsername) => {
    const result = await pool.query(
        `DELETE FROM xsah_friendship_tab AS f
         USING xsah_user AS u
         WHERE LOWER(u.username) = LOWER($2)
           AND u.id <> $1
           AND f.user_one_id = LEAST($1::uuid, u.id)
           AND f.user_two_id = GREATEST($1::uuid, u.id)
         RETURNING f.id, f.user_one_id, f.user_two_id, f.created_at, u.username`,
        [userId, friendUsername]
    );

    return result.rows[0];
};

const blockUserByUsername = async (blockerId, blockedUsername) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const userResult = await client.query(
            `SELECT id, username
             FROM xsah_user
             WHERE LOWER(username) = LOWER($1)`,
            [blockedUsername]
        );

        const blockedUser = userResult.rows[0];

        if (!blockedUser) {
            await client.query("ROLLBACK");
            return null;
        }

        const blockedId = blockedUser.id;

        if (blockerId === blockedId) {
            await client.query("ROLLBACK");
            return { selfBlock: true };
        }

        const blockResult = await client.query(
            `INSERT INTO xsah_user_blocks_tab (blocker_id, blocked_id)
             VALUES ($1, $2)
             ON CONFLICT (blocker_id, blocked_id)
             DO UPDATE SET blocker_id = EXCLUDED.blocker_id
             RETURNING id, blocker_id, blocked_id, created_at`,
            [blockerId, blockedId]
        );

        await client.query(
            `DELETE FROM xsah_friendship_tab
             WHERE user_one_id = LEAST($1::uuid, $2::uuid)
               AND user_two_id = GREATEST($1::uuid, $2::uuid)`,
            [blockerId, blockedId]
        );

        await client.query(
            `UPDATE xsah_friends_request_tab
             SET status = 'cancelled',
                 responded_at = NOW()
             WHERE status = 'pending'
               AND (
                   (sender_id = $1 AND receiver_id = $2)
                   OR
                   (sender_id = $2 AND receiver_id = $1)
               )`,
            [blockerId, blockedId]
        );

        await client.query("COMMIT");

        return {
            block: blockResult.rows[0],
            blockedUser,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const getBlockedUsers = async (blockerId) => {
    const result = await pool.query(
        `SELECT
            b.id AS block_id,
            u.id AS user_id,
            u.username,
            b.created_at AS blocked_at
         FROM xsah_user_blocks_tab AS b
         JOIN xsah_user AS u
           ON u.id = b.blocked_id
         WHERE b.blocker_id = $1
         ORDER BY b.created_at DESC`,
        [blockerId]
    );

    return result.rows;
};

const unblockUserByUsername = async (blockerId, blockedUsername) => {
    const result = await pool.query(
        `DELETE FROM xsah_user_blocks_tab AS b
         USING xsah_user AS u
         WHERE b.blocker_id = $1
           AND b.blocked_id = u.id
           AND LOWER(u.username) = LOWER($2)
         RETURNING b.id, b.blocker_id, b.blocked_id, b.created_at, u.username`,
        [blockerId, blockedUsername]
    );

    return result.rows[0];
};

module.exports = {
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
};
