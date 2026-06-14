const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const {
    getUserByUsername,
    getUserByEmail,
    getUserByPhone,
    createUser,
    getUserById,
} = require("../services/auth.services");
const otpGenerator = require("otp-generator");
const redis = require("../config/redis");
const twilio = require("twilio");
const { randomUUID } = require("crypto");

const createAccessToken = async (user) => {
    const tokenVersion = Number(
        (await redis.get(`auth:token-version:${user.id}`)) || 0
    );

    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            tokenVersion,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d",
            jwtid: randomUUID(),
        }
    );
};

const getTwilioClient = () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();

    if (!accountSid || !authToken || !phoneNumber) {
        throw new Error("Twilio credentials are not configured");
    }

    if (!accountSid.startsWith("AC")) {
        throw new Error("TWILIO_ACCOUNT_SID must start with AC");
    }

    return twilio(accountSid, authToken);
};

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required",
            });
        }

        const user = await getUserByUsername(username);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const token = await createAccessToken(user);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const registerUser = async (req, res) => {
    try {
        const { username, email, password, phone_number, Phone_number } = req.body;
        const phoneNumber = phone_number || Phone_number || null;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email and password are required",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        }

        const existingUser = await getUserByEmail(email);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await createUser({
            username,
            email,
            phoneNumber,
            passwordHash,
        });

        const token = await createAccessToken(user);

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone_number: user.phone_number,
            },
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const loginuser_Phonenumber = async (req, res) => {
    try {
        const { Phone_number } = req.body;

        if (!Phone_number) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required",
            });
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
        const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
        const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();

        if (!accountSid || !authToken || !twilioPhoneNumber) {
            return res.status(500).json({
                success: false,
                message: "Twilio credentials are not configured",
            });
        }

        if (!accountSid.startsWith("AC")) {
            return res.status(500).json({
                success: false,
                message: "Invalid Twilio configuration: TWILIO_ACCOUNT_SID must start with AC",
            });
        }

        const twilioClient = getTwilioClient();
        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });

        await redis.set(`otp:${Phone_number}`, otp, "EX", 300);

        await twilioClient.messages.create({
            body: `Your Sosyo verification OTP is ${otp}. It is valid for 5 minutes.`,
            to: Phone_number,
            from: twilioPhoneNumber,
        });

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
        });
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};
const verifyotp = async (req, res) => {
    try {
        const { Phone_number, otp } = req.body;

        if (!Phone_number || !otp) {
            return res.status(400).json({
                success: false,
                message: "Phone number and OTP are required",
            });
        }

        const storedOtp = await redis.get(`otp:${Phone_number}`);

        if (!storedOtp) {
            return res.status(400).json({
                success: false,
                message: "OTP expired or not found. Please request a new one.",
            });
        }

        if (storedOtp !== otp) {
            return res.status(401).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        await redis.del(`otp:${Phone_number}`);

        const user = await getUserByPhone(Phone_number);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const token = await createAccessToken(user);

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const user = await getUserById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const logoutUser = async (req, res) => {
    try {
        const remainingSeconds = req.user.exp - Math.floor(Date.now() / 1000);

        if (remainingSeconds > 0) {
            await redis.set(
                `auth:revoked:${req.user.jti}`,
                "1",
                "EX",
                remainingSeconds
            );
        }

        return res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const logoutAllDevices = async (req, res) => {
    try {
        await redis.incr(`auth:token-version:${req.user.id}`);

        return res.status(200).json({
            success: true,
            message: "Logged out from all devices",
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
    registerUser,
    loginUser,
    loginuser_Phonenumber,
    verifyotp,
    getCurrentUser,
    logoutUser,
    logoutAllDevices,
};
