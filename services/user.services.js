const pool = require("../config/db");

const searchUsers = async (searchTerm, currentUserId) => {
    const result = await pool.query(
        `SELECT id, username
         FROM xsah_user
         WHERE username ILIKE $1
           AND id != $2
         ORDER BY username
         LIMIT 20`,
        [`%${searchTerm}%`, currentUserId]
    );

    return result.rows;
};

module.exports = {
    searchUsers,
};
