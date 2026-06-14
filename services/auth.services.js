const pool = require("../config/db");

const getUserByUsername = async (username) => {
    const result = await pool.query(
        `SELECT id, username, email, password_hash AS password, phone_number
         FROM xsah_user
         WHERE username = $1`,
        [username]
    );

    return result.rows[0];
};

const getUserByEmail = async (email) => {
    const result = await pool.query(
        `SELECT id, username, email, password_hash AS password, phone_number
         FROM xsah_user
         WHERE email = $1`,
        [email]
    );

    return result.rows[0];
};

const getUserByPhone = async (phoneNumber) => {
    const normalizedPhoneNumber = phoneNumber.replace(/\D/g, "");
    const result = await pool.query(
        `SELECT id, username, email, password_hash AS password, phone_number
         FROM xsah_user
         WHERE phone_number = $1
            OR regexp_replace(phone_number, '\\D', '', 'g') = $2`,
        [phoneNumber, normalizedPhoneNumber]
    );

    return result.rows[0];
};

const createUser = async ({ username, email, phoneNumber, passwordHash }) => {
    const result = await pool.query(
        `INSERT INTO xsah_user (username, email, phone_number, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, phone_number, created_at`,
        [username, email, phoneNumber, passwordHash]
    );

    return result.rows[0];
};
const getUserById = async (id) => {
    const result = await pool.query(
        `SELECT id, username, email, phone_number, created_at
         FROM xsah_user
         WHERE id = $1`,
        [id]
    );

    return result.rows[0];
};

module.exports = {
    getUserByUsername,
    getUserByEmail,
    getUserByPhone,
    createUser,
    getUserById,
};
