import dotenv from "dotenv";
import mongoose from "mongoose";
import Advisor from "./models/Advisor.model.js";
import Counter from "./models/Counter.model.js";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "";

async function fixAdvisorCounter() {
    try {
        await mongoose.connect(DATABASE_URL, { dbName: "loan-project" });
        console.log("Connected to DB: loan-project");
        
        const advisors = await Advisor.find({}, "advisorCode");
        let maxAdvisorNum = 0;
        advisors.forEach(adv => {
            if (adv.advisorCode && adv.advisorCode.startsWith("DSA")) {
                const num = parseInt(adv.advisorCode.replace("DSA", ""));
                if (num > maxAdvisorNum) {
                    maxAdvisorNum = num;
                }
            }
        });
        
        console.log(`Max Advisor No in Advisors collection is: ${maxAdvisorNum}`);
        
        const counter = await Counter.findOne({ name: "advisorSerial" });
        console.log(`Current counter seq is: ${counter ? counter.seq : 'Not found'}`);
        
        if (maxAdvisorNum >= (counter ? counter.seq : 0)) {
            await Counter.findOneAndUpdate(
                { name: "advisorSerial" },
                { seq: maxAdvisorNum },
                { upsert: true }
            );
            console.log(`Counter updated to ${maxAdvisorNum}. Next sequence will be ${maxAdvisorNum + 1}`);
        } else {
            console.log("Counter is already ahead or equal to max advisor code. No fix needed.");
        }
        
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

fixAdvisorCounter();
