import fs from "fs";
import mongoose from "mongoose";
import csv from "csv-parser";

import Advisor from "./../models/Advisor.model.js";
import User from "./../models/User.model.js";

const MONGO_URI =
  "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project";

const DEFAULT_EMPLOYEE_ID = new mongoose.Types.ObjectId(
  "69f5fd405cef60070d7e688a"
);

// ================= CONNECT =================
const connectDB = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB Connected");
};

// ================= HELPERS =================
const clean = (val) => {
  if (!val || val === "NULL" || val === "null") return null;
  return val.toString().trim();
};

// ================= FIND ADVISOR =================
const findAdvisor = async (row) => {
  const advisorCode = clean(row.advisior_code);
  const mobile = clean(row.mobile_no);
  const email = clean(row.email_id);
  const name = clean(row.advisior_name);

  // 1. advisorCode
  if (advisorCode) {
    const adv = await Advisor.findOne({ advisorCode });
    if (adv) return { advisor: adv, match: "advisorCode" };
  }

  // 2. mobile
  if (mobile) {
    const adv = await Advisor.findOne({ mobile });
    if (adv) return { advisor: adv, match: "mobile" };
  }

  // 3. email
  if (email) {
    const adv = await Advisor.findOne({ email });
    if (adv) return { advisor: adv, match: "email" };
  }

  // 4. name
  if (name) {
    const adv = await Advisor.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });
    if (adv) return { advisor: adv, match: "name" };
  }

  return null;
};

// ================= MAIN =================
const importLogins = async () => {
  const rows = [];

  fs.createReadStream("./migration_data/Advisor_login_details.csv")
    .pipe(csv())
    .on("data", (row) => rows.push(row))
    .on("end", async () => {
      try {
        console.log("📊 Total Rows:", rows.length);

        let success = 0;
        let failed = 0;
        let skipped = 0;

        const failedRecords = [];
        const successLogs = [];
        const skipLogs = [];

        for (const row of rows) {
          try {
            const loginName = clean(row.login_name);
            const password = clean(row.login_password);

            if (!loginName || !password) {
              skipLogs.push({ row, reason: "Missing login/password" });
              skipped++;
              continue;
            }

            // 🔥 FIND ADVISOR
            const result = await findAdvisor(row);

            if (!result) {
              failedRecords.push({ row, reason: "Advisor not found" });
              failed++;
              continue;
            }

            const { advisor, match } = result;

            // 🔥 CHECK login already exists for advisor
            const existingUser = await User.findOne({
              referenceId: advisor._id,
            });

            if (existingUser) {
              skipLogs.push({
                advisor: advisor.name,
                reason: "Advisor already has login",
              });
              skipped++;
              continue;
            }

            // 🔥 CHECK duplicate loginName
            const loginExists = await User.findOne({ loginName });

            if (loginExists) {
              skipLogs.push({
                loginName,
                reason: "loginName already exists",
              });
              skipped++;
              continue;
            }

            // 🔥 CREATE USER
            await User.create({
              loginName,
              password,
              role: "advisor",
              referenceId: advisor._id,
              createdBy: DEFAULT_EMPLOYEE_ID,
            });

            // 🔥 UPDATE ADVISOR
            advisor.isCredential = true;
            await advisor.save();

            successLogs.push({
              advisor: advisor.name,
              loginName,
              matchedBy: match,
            });

            console.log(
              `✅ ${advisor.name} -> ${loginName} (${match})`
            );

            success++;
          } catch (err) {
            failedRecords.push({
              row,
              reason: err.message,
            });
            failed++;
          }
        }

        // ================= SAVE LOG FILES =================
        fs.writeFileSync(
          "./migration_data/login_success.json",
          JSON.stringify(successLogs, null, 2)
        );

        fs.writeFileSync(
          "./migration_data/login_failed.json",
          JSON.stringify(failedRecords, null, 2)
        );

        fs.writeFileSync(
          "./migration_data/login_skipped.json",
          JSON.stringify(skipLogs, null, 2)
        );

        console.log("\n🎉 LOGIN MIGRATION DONE");
        console.log("✅ Success:", success);
        console.log("❌ Failed:", failed);
        console.log("⏭️ Skipped:", skipped);

        process.exit(0);
      } catch (err) {
        console.error("❌ Fatal Error:", err);
        process.exit(1);
      }
    });
};

// ================= RUN =================
const run = async () => {
  await connectDB();
  await importLogins();
};

run();