
const mongoose = require("mongoose");
mongoose.connect("mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/");
mongoose.connection.on("open", async () => {
    const dbs = await mongoose.connection.db.admin().listDatabases();
    console.log(dbs.databases.map(d => d.name));
    process.exit(0);
});

