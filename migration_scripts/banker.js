import fs from "fs";
import mongoose from "mongoose";
import csv from "csv-parser";

import Banker from "./../models/Banker.model.js";
import City from "./../models/City.model.js";
import Bank from "./../models/Bank.model.js";

// ✅ CONFIG
const MONGO_URI =
  "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project";

const CREATED_BY = new mongoose.Types.ObjectId(
  "69f5fd405cef60070d7e688a"
);

// ✅ Connect DB
const connectDB = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB Connected");
};

// ✅ Helper: clean string properly
const clean = (val) => {
  if (!val) return null;
  return val.replace(/"/g, "").replace(/\s+/g, " ").trim();
};

// 🔥 Escape regex special chars
const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// ✅ MAIN FUNCTION
const importBankers = async () => {
  const rows = [];

  fs.createReadStream("./migration_data/Banker_All_Details.csv")
    .pipe(csv())
    .on("data", (row) => rows.push(row))
    .on("end", async () => {
      try {
        console.log("Total Rows:", rows.length);

        let inserted = 0;
        let skipped = 0;

        for (const row of rows) {
          try {
            const product = clean(row.product);
            const stateName = clean(row.state_name);
            const cityName = clean(row.city_name);
            const bankName = clean(row.bank_name);
            const bankerName = clean(row.banker_name);
            const designation = clean(row.banker_designation);
            const mobile = clean(row.mobile_no);
            const email = clean(row.email_id);

            if (!cityName || !bankName) {
              console.warn("⚠️ Missing city/bank:", row);
              skipped++;
              continue;
            }

            // console.log("row", row);
            // 🔥 Find City (case-insensitive + trimmed)
            const cityDoc = await City.findOne({
              cityName: {
                $regex: `^${escapeRegex(cityName)}$`,
                $options: "i",
              },
            });

            if (!cityDoc) {
              console.warn("❌ City not found:", cityName);
              skipped++;
              continue;
            }

            // 🔥 Find Bank
            const bankDoc = await Bank.findOne({
              name: {
                $regex: `^${escapeRegex(bankName)}$`,
                $options: "i",
              },
            });

            if (!bankDoc) {
              console.warn("❌ Bank not found:", bankName);
              skipped++;
              continue;
            }

            // 🔥 Avoid duplicates (mobile unique)
            // const exists = await Banker.findOne({ mobile });
            // if (exists) {
            //   skipped++;
            //   continue;
            // }

            // ✅ Insert
            await Banker.create({
              product,
              stateName,
              city: cityDoc._id,
              bank: bankDoc._id,
              bankerName,
              designation,
              mobile,
              email,
              createdBy: CREATED_BY,
              groupId: CREATED_BY,
            });

            inserted++;
          } catch (err) {
            console.error("❌ Row Error:", err.message);
            skipped++;
          }
        }

        console.log("✅ Inserted:", inserted);
        console.log("⏭️ Skipped:", skipped);
        console.log("🎉 Import Completed");

        process.exit(0);
      } catch (err) {
        console.error("❌ Fatal Error:", err);
        process.exit(1);
      }
    })
    .on("error", (err) => {
      console.error("CSV Error:", err);
    });
};

// ✅ Run
const run = async () => {
  await connectDB();
  await importBankers();
};

run();