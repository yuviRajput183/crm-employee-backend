import fs from "fs";
import mongoose from "mongoose";
import csv from "csv-parser";
import Department from "./../models/Department.model.js"; // adjust path

// ✅ MongoDB Connection URL
const MONGO_URI = "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project";

// ✅ Fixed IDs
const CREATED_BY = "687259ef1da43932f4f4c961";
const GROUP_ID = "687259ef1da43932f4f4c961";

// ✅ Connect DB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("DB Connection Error:", error);
    process.exit(1);
  }
};

// ✅ Import Function
const importCSV = async () => {
  const departments = [];

  fs.createReadStream("./migration_data/Department.csv")
    .pipe(csv())
    .on("data", (row) => {
      departments.push({
        name: row.department_name.trim(),
        designations: [], // empty array
        createdBy: new mongoose.Types.ObjectId(CREATED_BY),
        groupId: new mongoose.Types.ObjectId(GROUP_ID),
        isDefault: false, // optional (set if needed)
      });
    })
    .on("end", async () => {
      try {
        await Department.insertMany(departments);
        console.log("✅ Data imported successfully");
        process.exit();
      } catch (error) {
        console.error("❌ Insert Error:", error);
        process.exit(1);
      }
    });
};

// ✅ Run Script
const run = async () => {
  await connectDB();
  await importCSV();
};

run();