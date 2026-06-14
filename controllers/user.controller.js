const users = require("../models/user.model");
const { searchUsers: searchUsersService } = require("../services/user.services");

const searchUsers = async (req, res) => {
    try {
        const searchTerm = req.query.q?.trim();

        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                message: "Search term is required",
            });
        }

        const matchingUsers = await searchUsersService(
            searchTerm,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            users: matchingUsers,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const getUsers = (req, res) => {
    res.status(200).json({
        success: true,
        data: users,
    });
};

const getUserById = (req, res) => {
    const user = users.find((item) => item.id === Number(req.params.id));

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    res.status(200).json({
        success: true,
        data: user,
    });
};

const createUser = (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({
            success: false,
            message: "Name and email are required",
        });
    }

    const newUser = {
        id: users.length + 1,
        name,
        email,
    };

    users.push(newUser);

    res.status(201).json({
        success: true,
        data: newUser,
    });
};

module.exports = {
    searchUsers,
    getUsers,
    getUserById,
    createUser,
};
