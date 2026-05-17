import fs from "fs";
import mongoose from "mongoose";
import csv from "csv-parser";

import Advisor from "./../models/Advisor.model.js";
import City from "./../models/City.model.js";
import Employee from "./../models/Employee.model.js";

// ================= CONFIG =================
const MONGO_URI =
  "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project";

const DEFAULT_EMPLOYEE_ID = new mongoose.Types.ObjectId(
  "69f5fd405cef60070d7e688a"
);

// ================= DB CONNECT =================
const connectDB = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB Connected");
};

// ================= REMOVE BAD INDEXES =================
const removeIndexes = async () => {
  try {
    const indexes = await Advisor.collection.getIndexes();

    if (indexes.name_1) {
      await Advisor.collection.dropIndex("name_1");
      console.log("🗑️ Removed unique index: name_1");
    }

    if (indexes.email_1) {
      await Advisor.collection.dropIndex("email_1");
      console.log("🗑️ Removed unique index: email_1");
    }

    if (indexes.mobile_1) {
      await Advisor.collection.dropIndex("mobile_1");
      console.log("🗑️ Removed unique index: mobile_1");
    }
  } catch (err) {
    console.log("⚠️ Index cleanup skipped:", err.message);
  }
};

// ================= HELPERS =================
const clean = (val) => {
  if (!val || val === "NULL" || val === "null") return null;
  return val.toString().replace(/"/g, "").replace(/\s+/g, " ").trim();
};

const parseDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d) ? null : d;
};

// ================= MAIN =================
const importAdvisors = async () => {
  const rows = [];

  fs.createReadStream("./migration_data/Advisor_all_details.csv")
    .pipe(csv())
    .on("data", (row) => rows.push(row))
    .on("end", async () => {
      try {
        console.log("📊 Total Rows:", rows.length);

        const bulkData = [];
        const failedRecords = [];

        for (const row of rows) {
          try {
            const name = clean(row.advisor_name);
            const mobile = clean(row.mobile_no);

            if (!name || !mobile) {
              failedRecords.push({ row, reason: "Missing name/mobile" });
              continue;
            }

            // 🔥 Unique advisorCode bana do
            const advisorCode =
              clean(row.advisor_code) +
              "_" +
              Date.now() +
              "_" +
              Math.floor(Math.random() * 1000);

            // 🔥 EMAIL FIX
            const email =
              clean(row.email_id) ||
              `${mobile}_${Date.now()}@dummy.com`;

            // ================= CITY =================
            let cityDoc = null;

            if (clean(row.city_name)) {
              cityDoc = await City.findOne({
                cityName: { $regex: clean(row.city_name), $options: "i" },
              });
            }

            if (!cityDoc && row.city_id && row.city_id !== "0") {
              cityDoc = await City.findOne({
                cityId: Number(row.city_id),
              });
            }

            // ================= EMPLOYEE =================
            let employeeDoc = null;

            if (clean(row.employee_name)) {
              employeeDoc = await Employee.findOne({
                name: { $regex: clean(row.employee_name), $options: "i" },
              });
            }

            if (!employeeDoc) {
              employeeDoc = { _id: DEFAULT_EMPLOYEE_ID };
            }

            // ================= DOCUMENT =================
            const doc = {
              name,
              email,
              mobile,
              advisorCode,

              role: "advisor",

              companyName: clean(row.company_name),
              address: clean(row.advisor_address),
              altContact: clean(row.alternative_contact_no),

              state: clean(row.state_id),

              city: cityDoc?._id || null,
              reportingOfficer: employeeDoc._id,

              aadharNo: clean(row.aadhar_no),
              panNo: clean(row.pan_no),

              bankName: clean(row.bank_name),
              accountHolderName: clean(row.bank_account_holder_name),
              accountNumber: clean(row.bank_account_no),
              ifscCode: clean(row.bank_ifsc_code),

              dateOfJoining: parseDate(row.date_of_joining),
              dateOfResign: parseDate(row.dor),

              isActive: row.dor ? false : true,
              isActivated: true,
              isCredential: true,

              createdBy: DEFAULT_EMPLOYEE_ID,
              ownerId: DEFAULT_EMPLOYEE_ID,
              groupId: DEFAULT_EMPLOYEE_ID,
            };

            bulkData.push({
              insertOne: { document: doc },
            });
          } catch (err) {
            failedRecords.push({ row, reason: err.message });
          }
        }

        console.log("🚀 Inserting:", bulkData.length);

        try {
          const result = await Advisor.bulkWrite(bulkData, {
            ordered: false, // 🔥 continue on error
          });

          console.log("✅ Inserted:", result.insertedCount);
        } catch (err) {
          console.log("⚠️ Bulk Insert Errors");

          err.writeErrors?.forEach((e, i) => {
            console.log(`\n❌ Error ${i + 1}`);
            console.log("Code:", e.code);
            console.log("Message:", e.errmsg);
            console.log("Failed Name:", e.op?.name);

            failedRecords.push({
              error: e.errmsg,
              doc: e.op,
            });
          });
        }

        // ================= SAVE FAILED =================
        if (failedRecords.length) {
          fs.writeFileSync(
            "./migration_data/failed_advisors.json",
            JSON.stringify(failedRecords, null, 2)
          );
          console.log("⚠️ Failed Records saved:", failedRecords.length);
        }

        console.log("\n🎉 Migration Completed");
        process.exit(0);
      } catch (err) {
        console.error("❌ Fatal Error:", err);
        process.exit(1);
      }
    })
    .on("error", (err) => {
      console.error("❌ CSV Error:", err);
    });
};

// ================= RUN =================
const run = async () => {
  await connectDB();
  await removeIndexes(); // 🔥 IMPORTANT
  await importAdvisors();
};

run();



// UPDATE ISACTIVE

// import mongoose from "mongoose";
// import Advisor from "../models/Advisor.model.js";

// // ================= CONFIG =================
// const MONGO_URI =
//   "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project";

// // ================= DB CONNECT =================
// const connectDB = async () => {
//   await mongoose.connect(MONGO_URI);
//   console.log("✅ MongoDB Connected");
// };

// // ================= MAIN =================
// const fixIsActive = async () => {
//   try {
//     const advisors = await Advisor.find({}, { _id: 1, dateOfResign: 1 });

//     console.log("📊 Total Advisors:", advisors.length);

//     let updated = 0;

//     for (const adv of advisors) {
//       const isActive = adv.dateOfResign ? false : true;

//       const res = await Advisor.updateOne(
//         { _id: adv._id },
//         { $set: { isActive } }
//       );

//       if (res.modifiedCount > 0) {
//         updated++;
//         console.log(
//           `✅ Updated: ${adv._id} -> isActive: ${isActive}`
//         );
//       }
//     }

//     console.log("\n🎉 Update Completed");
//     console.log("✅ Total Updated:", updated);
//   } catch (err) {
//     console.error("❌ Error:", err.message);
//   } finally {
//     process.exit(0);
//   }
// };

// // ================= RUN =================
// const run = async () => {
//   await connectDB();
//   await fixIsActive();
// };

// run();


// UPDATE ADVISOR CODES

// import fs from "fs";
// import mongoose from "mongoose";
// import csv from "csv-parser";

// import Advisor from "../models/Advisor.model.js";

// // ================= CONFIG =================
// const MONGO_URI =
//   "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project";

// // ================= DB CONNECT =================
// const connectDB = async () => {
//   await mongoose.connect(MONGO_URI);
//   console.log("✅ MongoDB Connected");
// };

// // ================= HELPERS =================
// const clean = (val) => {
//   if (!val || val === "NULL" || val === "null") return null;
//   return val.toString().trim();
// };

// // ================= MAIN =================
// const updateAdvisorCodes = async () => {
//   const rows = [];

//   fs.createReadStream("./migration_data/Advisor_all_details.csv")
//     .pipe(csv())
//     .on("data", (row) => rows.push(row))
//     .on("end", async () => {
//       try {
//         console.log("📊 Total Rows:", rows.length);

//         let success = 0;
//         let failed = 0;
//         const failedLogs = [];

//         for (const row of rows) {
//           try {
//             const name = clean(row.advisor_name);
//             const mobile = clean(row.mobile_no);
//             const advisorCode = clean(row.advisor_code);

//             if (!name || !mobile || !advisorCode) {
//               failed++;
//               failedLogs.push({
//                 reason: "Missing required fields",
//                 row,
//               });
//               continue;
//             }

//             // 🔥 FIND EXISTING ADVISOR
//             const advisor = await Advisor.findOne({
//               name: { $regex: `^${name}$`, $options: "i" },
//               mobile: mobile,
//             });

//             if (!advisor) {
//               failed++;
//               failedLogs.push({
//                 reason: "Advisor not found",
//                 name,
//                 mobile,
//               });
//               continue;
//             }

//             // 🔥 UPDATE ONLY advisorCode
//             await Advisor.updateOne(
//               { _id: advisor._id },
//               { $set: { advisorCode } }
//             );

//             success++;
//             console.log(`✅ Updated: ${name} -> ${advisorCode}`);
//           } catch (err) {
//             failed++;
//             failedLogs.push({
//               error: err.message,
//               row,
//             });
//           }
//         }

//         // ================= SAVE FAILED =================
//         if (failedLogs.length) {
//           fs.writeFileSync(
//             "./migration_data/failed_advisor_code_update.json",
//             JSON.stringify(failedLogs, null, 2)
//           );
//         }

//         console.log("\n🎉 AdvisorCode Update Completed");
//         console.log("✅ Success:", success);
//         console.log("❌ Failed:", failed);

//         process.exit(0);
//       } catch (err) {
//         console.error("❌ Fatal Error:", err);
//         process.exit(1);
//       }
//     })
//     .on("error", (err) => {
//       console.error("❌ CSV Error:", err);
//     });
// };

// // ================= RUN =================
// const run = async () => {
//   await connectDB();
//   await updateAdvisorCodes();
// };

// run();