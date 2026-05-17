import fs from "fs";
import mongoose from "mongoose";
import csv from "csv-parser";

import User from "../models/User.model.js";
import Employee from "../models/Employee.model.js";

// ✅ CONFIG
const MONGO_URI =
  "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project";

const CREATED_BY = new mongoose.Types.ObjectId("687259ef1da43932f4f4c961");

// ✅ CONNECT DB
const connectDB = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB Connected");
};

const importUsers = async () => {
  const users = [];

  fs.createReadStream("./migration_data/Employee_login.csv") // 👈 apni file ka path
    .pipe(csv())
    .on("data", (row) => {
      users.push({
        name: row.employee_name?.trim(),
        loginName: row.login_name?.trim(),
        password: row.login_password?.trim(),
        allowLogin: row.allow_login === "1",
      });
    })
    .on("end", async () => {
      try {
        console.log("Parsed users:", users.length);

        // 🔥 Step 1: Employee map (name → _id)
        const employees = await Employee.find();
        const empMap = {};

        employees.forEach((emp) => {
          empMap[emp.name.trim().toLowerCase()] = emp._id;
        });

        let successCount = 0;

        // 🔥 Step 2: Insert Users
        for (const user of users) {
          const empId = empMap[user.name?.toLowerCase()];

          if (!empId) {
            console.warn("❌ Employee not found:", user.name);
            continue;
          }

          if (!user.allowLogin) {
            console.warn("⚠️ Skipping (login disabled):", user.name);
            continue;
          }

          await User.findOneAndUpdate(
            { loginName: user.loginName }, // ✅ unique field
            {
              $set: {
                password: user.password,
                role: "employee",
                referenceId: empId,
                createdBy: CREATED_BY,
              },
            },
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
            }
          );

          successCount++;
        }

        console.log("✅ Users inserted/updated:", successCount);

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

// ✅ RUN
const run = async () => {
  await connectDB();
  await importUsers();
};

run();