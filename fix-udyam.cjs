
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
mongoose.connect("mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/test");
mongoose.connection.on("open", async () => {
    const cp = await mongoose.connection.db.collection("channelpartners").findOne({ _id: new mongoose.Types.ObjectId("6aac2c31f01daa8dc977cbb7") });
    if (cp && cp.businessDetails) {
        console.log(cp.businessDetails.udyam.certificateDocument);
        if (cp.businessDetails.udyam && cp.businessDetails.udyam.certificateDocument) {
            const oldUrl = cp.businessDetails.udyam.certificateDocument.url;
            const newUrl = oldUrl.replace(".pdf", ".html");
            await mongoose.connection.db.collection("channelpartners").updateOne(
                { _id: new mongoose.Types.ObjectId("6aac2c31f01daa8dc977cbb7") },
                { $set: { "businessDetails.udyam.certificateDocument.url": newUrl } }
            );
            console.log("Updated DB URL from", oldUrl, "to", newUrl);
        }
    }
    process.exit(0);
});

