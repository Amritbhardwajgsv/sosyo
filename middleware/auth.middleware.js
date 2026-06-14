const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
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
        req.user=decodetoken;
        next();
    }catch(error){
        return res.status(401).json({success:false,message:"Invalid token"});
    }
}
module.exports=authMiddleware;
