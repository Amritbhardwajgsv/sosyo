const jwt = require("jsonwebtoken");
const redis = require("../config/redis");

const authMiddleware = async (req, res, next) => {
    const authHeader=req.headers.authorization;
    if(!authHeader){
        return res.status(401).json({success:false,message:"Authorization header missing"});
    }
    const [scheme,token]=authHeader.split(" ");
    if(scheme!=="Bearer"||!token){
        return res.status(401).json({success:false,message:"Invalid authorization header format"});
    }
    try{
        const decodetoken=jwt.verify(token,process.env.JWT_SECRET);

        if (!decodetoken.jti || decodetoken.tokenVersion === undefined) {
            return res.status(401).json({
                success: false,
                message: "Session is no longer valid. Please log in again",
            });
        }

        const [isRevoked, storedTokenVersion] = await Promise.all([
            redis.get(`auth:revoked:${decodetoken.jti}`),
            redis.get(`auth:token-version:${decodetoken.id}`),
        ]);

        if (isRevoked) {
            return res.status(401).json({
                success: false,
                message: "Session has been logged out",
            });
        }

        const currentTokenVersion = Number(storedTokenVersion || 0);

        if (decodetoken.tokenVersion !== currentTokenVersion) {
            return res.status(401).json({
                success: false,
                message: "Session is no longer valid. Please log in again",
            });
        }

        req.user=decodetoken;
        req.token=token;
        next();
    }catch(error){
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token has expired. Please log in again",
            });
        }

        if (
            error.name !== "JsonWebTokenError" &&
            error.name !== "NotBeforeError"
        ) {
            return res.status(500).json({
                success: false,
                message: "Authentication service unavailable",
            });
        }

        return res.status(401).json({success:false,message:"Invalid token"});
    }
}
module.exports=authMiddleware;
