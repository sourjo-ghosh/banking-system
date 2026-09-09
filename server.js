require('dotenv').config();
const app = require('./src/app');
const ConnectToDB = require('./src/config/db');
const dns = require("node:dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
ConnectToDB()
app.listen(3000, ()=>{
    console.log("server is running on port 3000");
})