import dotenv from "dotenv";
import mongoose from "mongoose";
import Lead from "./models/Lead.model.js";
import Counter from "./models/Counter.model.js";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "";

async function fixCounter() {
    try {
        await mongoose.connect(DATABASE_URL, { dbName: "loan-project" });
        console.log("Connected to DB: loan-project");
        
        const lastLead = await Lead.findOne().sort({ leadNo: -1 });
        const maxLeadNo = lastLead && lastLead.leadNo != null ? lastLead.leadNo : 0;
        console.log(`Max Lead No in Leads collection is: ${maxLeadNo}`);
        
        const counter = await Counter.findOne({ name: "leadSerial" });
        console.log(`Current counter seq is: ${counter ? counter.seq : 'Not found'}`);
        
        if (maxLeadNo >= (counter ? counter.seq : 0)) {
            await Counter.findOneAndUpdate(
                { name: "leadSerial" },
                { seq: maxLeadNo },
                { upsert: true }
            );
            console.log(`Counter updated to ${maxLeadNo}. Next sequence will be ${maxLeadNo + 1}`);
        } else {
            console.log("Counter is already ahead or equal to max leadNo. No fix needed.");
        }
        
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

fixCounter();
