const Redis =require("ioredis");
const redis =new Redis(process.env.REDIS_URL);
redis.on("connect",()=>{
    console.log("redis connected successfully");
});
redis.on("error",(error)=>{
    console.log("redis connection failed");
    console.log(error);
})
module.exports=redis;
