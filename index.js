require("dotenv").config();

const express = require("express");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const pool = require("./config/db");
const redis=require("./config/redis");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

const startServer = async () => {
    try {
        await pool.query("SELECT NOW()");
        console.log("database connected successfully");
        await redis.ping();
        console.log("redis connected successfully");
        app.listen(PORT, () => {
            console.log(`server is running at port ${PORT}`);
        });
    } catch (err) {
        console.log("database connection failed:");
        console.log(err);
        process.exit(1);
    }
};

startServer();
