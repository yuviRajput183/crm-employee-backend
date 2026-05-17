import fs from "fs";
import mongoose from "mongoose";
import csv from "csv-parser";

import ProcessedBy from "./../models/ProcessedBy.model.js";

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

// ✅ Clean helper
const clean = (val) => {
  if (!val) return null;
  return val.replace(/"/g, "").replace(/\s+/g, " ").trim();
};

// ✅ MAIN FUNCTION
const importProcessedBy = async () => {
  const rows = [];

  fs.createReadStream("./migration_data/Processed_By.csv")
    .pipe(
      csv()
    )
    .on("data", (row) => rows.push(row))
    .on("end", async () => {
      try {
        console.log("Total Rows:", rows.length);

        let inserted = 0;
        let skipped = 0;

        for (const row of rows) {
          try {
            const name = clean(row.processed_by_name);

            if (!name) {
              console.warn("⚠️ Empty name:", row);
              skipped++;
              continue;
            }

            // 🔥 Avoid duplicates (case-insensitive)
            const exists = await ProcessedBy.findOne({
              processedBy: { $regex: `^${name}$`, $options: "i" },
            });

            if (exists) {
              console.log("⏭️ Already exists:", name);
              skipped++;
              continue;
            }

            // ✅ Insert
            await ProcessedBy.create({
              processedBy: name,
              createdBy: CREATED_BY,
            });

            console.log("✅ Inserted:", name);
            inserted++;
          } catch (err) {
            console.error("❌ Row Error:", err.message);
            skipped++;
          }
        }

        console.log("\n🎉 Import Completed");
        console.log("✅ Inserted:", inserted);
        console.log("⏭️ Skipped:", skipped);

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
  await importProcessedBy();
};

run();