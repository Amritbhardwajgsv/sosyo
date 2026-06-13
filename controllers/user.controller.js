const users = require("../models/user.model");

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
    getUsers,
    getUserById,
    createUser,
};
