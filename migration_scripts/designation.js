import fs from "fs";
import mongoose from "mongoose";
import csv from "csv-parser";
import path from "path";
import { fileURLToPath } from "url";
import Department from "./../models/Department.model.js";

// 🔧 Fix __dirname
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// ✅ Mongo URI
const MONGO_URI = "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project";

// ✅ Department ID → Name Mapping (VERY IMPORTANT)
const departmentMap = {
  1: "Admin Department",
  2: "Sales Department",
  3: "Calling Department",
  4: "Operations",
};

// ✅ File Path
// const filePath = path.join(__dirname, "./migration_data/designations.csv");

// ✅ Connect DB
const connectDB = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB Connected");
};

// ✅ Import Function
const importDesignations = async () => {
  const updates = {}; // group designations by department

  fs.createReadStream("./migration_data/Designation.csv")
    .pipe(csv())
    .on("data", (row) => {
      const deptId = row.department_id?.trim();
      const designation = row.designation_name?.trim();

      if (!deptId || !designation) return;

      const deptName = departmentMap[deptId];

      if (!deptName) {
        console.warn(`⚠️ No mapping found for department_id: ${deptId}`);
        return;
      }

      if (!updates[deptName]) {
        updates[deptName] = [];
      }

      updates[deptName].push(designation);
    })
    .on("end", async () => {
      try {
        console.log("Parsed Data:", updates);

        for (const deptName in updates) {
          const designations = updates[deptName];

          const result = await Department.updateOne(
            { name: deptName },
            {
              $addToSet: {
                designations: { $each: designations }, // avoid duplicates
              },
            }
          );

          console.log(`✅ Updated ${deptName}:`, result.modifiedCount);
        }

        console.log("🎉 All designations imported successfully");

        // Debug count
        const all = await Department.find();
        console.log("Final Data:", JSON.stringify(all, null, 2));

        process.exit(0);
      } catch (err) {
        console.error("❌ Error:", err);
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
  await importDesignations();
};

run();