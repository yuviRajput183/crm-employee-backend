// first vale payout_remarks column name ko payout_remarks1 krna h csv file me.

// SELECT 
//     -- =====================================
//     -- ADVISOR PAYOUT PAYMENT TABLE
//     -- =====================================
    
//     app.*,

//     -- =====================================
//     -- ADVISOR PAYOUT DETAILS
//     -- =====================================

//     ap.*,

//     -- =====================================
//     -- CUSTOMER / LEAD DETAILS
//     -- =====================================

//     c.*,

//     -- =====================================
//     -- ADVISOR DETAILS
//     -- =====================================

//     adv.*,

//     -- =====================================
//     -- EMPLOYEE DETAILS
//     -- =====================================

//     emp.*

// FROM advisor_payout_paid_tbl AS app

// -- =====================================
// -- POPULATE PAYOUT ID
// -- =====================================

// LEFT JOIN advisor_payout_tbl AS ap
//     ON ap.payout_id = app.payout_id

// -- =====================================
// -- POPULATE LEAD DETAILS
// -- =====================================

// LEFT JOIN customer_tbl AS c
//     ON c.lead_no = app.lead_no

// -- =====================================
// -- POPULATE ADVISOR DETAILS
// -- =====================================

// LEFT JOIN advisior_tbl AS adv
//     ON adv.advisior_id = app.advisor_id

// -- =====================================
// -- POPULATE EMPLOYEE DETAILS
// -- =====================================

// LEFT JOIN employee_tbl AS emp
//     ON emp.employee_id = app.entry_by_id;

// import fs from "fs";
// import csv from "csv-parser";
// import mongoose from "mongoose";

// import Payables from "../models/Payables.model.js";
// import AdvisorPayout from "../models/AdvisorPayout.model.js";
// import Lead from "../models/Lead.model.js";
// import Advisor from "../models/Advisor.model.js";
// import Employee from "../models/Employee.model.js";

// // ======================================
// // MONGODB CONNECTION
// // ======================================

// await mongoose.connect(
//   "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project",
// );

// console.log("✅ MongoDB Connected");

// // ======================================
// // HELPERS
// // ======================================

// const rows = [];

// const cleanValue = (value) => {
//   if (
//     value === undefined ||
//     value === null ||
//     value === "" ||
//     value === "NULL" ||
//     value === "null"
//   ) {
//     return null;
//   }

//   return String(value).trim();
// };

// const parseNumber = (value) => {
//   const cleaned = cleanValue(value);

//   if (!cleaned) return 0;

//   const num = Number(cleaned);

//   return isNaN(num) ? 0 : num;
// };

// const parseDate = (value) => {
//   const cleaned = cleanValue(value);

//   if (!cleaned) return null;

//   const date = new Date(cleaned);

//   return isNaN(date.getTime()) ? null : date;
// };

// const escapeRegex = (text) => {
//   return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// };

// // ======================================
// // READ CSV
// // ======================================

// console.log("📄 Reading CSV File...");

// fs.createReadStream("./migration_data/Payables_data.csv")
//   .pipe(csv())
//   .on("data", (data) => {
//     rows.push(data);

//     if (rows.length % 1000 === 0) {
//       console.log(`📦 Loaded ${rows.length} rows`);
//     }
//   })
//   .on("end", async () => {
//     console.log("\n✅ CSV Loaded Successfully");
//     console.log(`📊 Total Rows: ${rows.length}`);

//     try {
//       let inserted = 0;
//       let skipped = 0;

//       // ======================================
//       // PROCESS ROWS
//       // ======================================

//       for (const row of rows) {
//         try {
//           console.log("\n================================================");
//           console.log(`🚀 Processing Payout Payment ID: ${row.payout_id}`);

//           // ======================================
//           // CSV VALUES
//           // ======================================

//           const payoutIdCSV = cleanValue(row.payout_id);
//           const leadNoCSV = parseNumber(row.lead_no);
//           const advisorNameCSV = cleanValue(row.advisior_name);
//           const employeeNameCSV = cleanValue(row.employee_name);

//           const paidAmount = parseNumber(row.paid_amount);

//           const paymentAgainstRaw = cleanValue(row.payment_against);

//           const paidDate = parseDate(row.paid_date);

//           const refNo = cleanValue(row.reference_no);

//           // CSV Column Position Based Access
//         //   const values = Object.values(row);

//           // First payout_remarks column (Payables Table)
//           const payablesRemarks = cleanValue(row.payout_remarks1);

//           console.log(`Lead No: ${leadNoCSV}`);
//           console.log(`Advisor: ${advisorNameCSV}`);
//           console.log(`Employee: ${employeeNameCSV}`);

//           // ======================================
//           // FIND LEAD
//           // ======================================

//           console.log("\n🔍 Finding Lead...");

//           const lead = await Lead.findOne({
//             leadNo: leadNoCSV,
//           });

//           if (!lead) {
//             console.log("❌ Lead Not Found");
//             skipped++;
//             continue;
//           }

//           console.log(`✅ Lead Found: ${lead.clientName}`);

//           // ======================================
//           // FIND ADVISOR
//           // ======================================

//           console.log("\n🔍 Finding Advisor...");

//           let advisor = null;

//           if (advisorNameCSV) {
//             advisor = await Advisor.findOne({
//               name: {
//                 $regex: new RegExp(`^${escapeRegex(advisorNameCSV)}$`, "i"),
//               },
//             });
//           }

//           if (!advisor) {
//             advisor = await Advisor.findOne({
//               mobileNo: cleanValue(row.mobile_no_1),
//             });
//           }

//           if (!advisor) {
//             console.log("❌ Advisor Not Found");
//             skipped++;
//             continue;
//           }

//           console.log(`✅ Advisor Found: ${advisor.name}`);

//           // ======================================
//           // FIND EMPLOYEE
//           // ======================================

//           console.log("\n🔍 Finding Employee...");

//           let employee = null;

//           if (employeeNameCSV) {
//             employee = await Employee.findOne({
//               name: {
//                 $regex: new RegExp(`^${escapeRegex(employeeNameCSV)}$`, "i"),
//               },
//             });
//           }

//           if (!employee) {
//             employee = await Employee.findOne({
//               mobileNo: cleanValue(row.mobile_no_2),
//             });
//           }

//           if (!employee) {
//             console.log("❌ Employee Not Found");
//             skipped++;
//             continue;
//           }

//           console.log(`✅ Employee Found: ${employee.name}`);

//           // ======================================
//           // FIND ADVISOR PAYOUT
//           // ======================================

//           console.log("\n🔍 Finding Advisor Payout...");

//           let payout = null;

//           // BEST MATCH
//           payout = await AdvisorPayout.findOne({
//             leadId: lead._id,
//             advisorId: advisor._id,
//             payoutAmount: parseNumber(row.payout_amount),
//             disbursalAmount: parseNumber(row.disbursal_amount),
//           });

//           // SECONDARY MATCH
//           if (!payout) {
//             payout = await AdvisorPayout.findOne({
//               leadId: lead._id,
//               advisorId: advisor._id,
//             });
//           }

//           if (!payout) {
//             console.log("❌ Advisor Payout Not Found");
//             skipped++;
//             continue;
//           }

//           console.log("✅ Advisor Payout Found");

//           // ======================================
//           // CHECK EXISTING PAYABLE
//           // ======================================

//           console.log("\n🔍 Checking Existing Payable...");

//           const existingPayable = await Payables.findOne({
//             payoutId: payout._id,
//             paidAmount,
//             refNo,
//           });

//           if (existingPayable) {
//             console.log("⚠️ Payable Already Exists");
//             skipped++;
//             continue;
//           }

//           // ======================================
//           // PAYMENT AGAINST
//           // ======================================

//           let paymentAgainst = "payableAmount";

//           if (
//             paymentAgainstRaw &&
//             paymentAgainstRaw.toLowerCase().includes("gst")
//           ) {
//             paymentAgainst = "gstPayment";
//           }

//           // ======================================
//           // CALCULATE BALANCE
//           // ======================================

//           const totalPayable =
//             paymentAgainst === "gstPayment"
//               ? payout.remainingGstAmount || payout.gstAmount || 0
//               : payout.remainingPayableAmount || payout.netPayableAmount || 0;

//           let balanceAmount = totalPayable - paidAmount;

//           if (balanceAmount < 0) {
//             balanceAmount = 0;
//           }

//           // ======================================
//           // CREATE PAYABLE
//           // ======================================

//           const payableData = {
//             payoutId: payout._id,

//             leadId: lead._id,

//             advisorId: advisor._id,

//             paymentAgainst,

//             payableAmount: totalPayable,

//             paidAmount,

//             balanceAmount,

//             paidDate,

//             refNo,

//             remarks: payablesRemarks || "",

//             createdBy: employee._id,

//             updatedBy: employee._id,
//           };

//           console.log("\n💾 Saving Payable...");

//           await Payables.create(payableData);

//           // ======================================
//           // UPDATE PAYOUT BALANCES
//           // ======================================

//           if (paymentAgainst === "gstPayment") {
//             await AdvisorPayout.findByIdAndUpdate(payout._id, {
//               remainingGstAmount: balanceAmount,
//             });
//           } else {
//             await AdvisorPayout.findByIdAndUpdate(payout._id, {
//               remainingPayableAmount: balanceAmount,
//             });
//           }

//           inserted++;

//           console.log("✅ Payable Saved Successfully");
//           console.log(`📈 Progress: ${inserted}/${rows.length}`);
//         } catch (err) {
//           console.log("❌ Error Processing Row");
//           console.log(err);
//         }
//       }

//       // ======================================
//       // COMPLETED
//       // ======================================

//       console.log("\n======================================");
//       console.log("🎉 PAYABLES MIGRATION COMPLETED");
//       console.log(`✅ Inserted: ${inserted}`);
//       console.log(`⚠️ Skipped: ${skipped}`);
//       console.log("======================================");

//       process.exit();
//     } catch (err) {
//       console.log("❌ Migration Failed");
//       console.log(err);

//       process.exit(1);
//     }
//   });


import fs from "fs";
import csv from "csv-parser";
import mongoose from "mongoose";

import Payables from "../models/Payables.model.js";
import AdvisorPayout from "../models/AdvisorPayout.model.js";
import Lead from "../models/Lead.model.js";
import Advisor from "../models/Advisor.model.js";
import Employee from "../models/Employee.model.js";

// ======================================
// MONGODB CONNECTION
// ======================================

await mongoose.connect(
  "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project"
);

console.log("✅ MongoDB Connected");

// ======================================
// HELPERS
// ======================================

const rows = [];

const cleanValue = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "NULL" ||
    value === "null"
  ) {
    return null;
  }

  return String(value).trim();
};

const parseNumber = (value) => {
  const cleaned = cleanValue(value);

  if (!cleaned) return 0;

  const num = Number(cleaned);

  return isNaN(num) ? 0 : num;
};

const parseDate = (value) => {
  const cleaned = cleanValue(value);

  if (!cleaned) return null;

  const date = new Date(cleaned);

  return isNaN(date.getTime()) ? null : date;
};

const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// ======================================
// READ CSV
// ======================================

console.log("📄 Reading CSV File...");

fs.createReadStream("./migration_data/Payables_data.csv")
  .pipe(csv())
  .on("data", (data) => {
    rows.push(data);

    if (rows.length % 1000 === 0) {
      console.log(`📦 Loaded ${rows.length} rows`);
    }
  })

  .on("end", async () => {
    console.log("\n✅ CSV Loaded Successfully");
    console.log(`📊 Total Rows: ${rows.length}`);

    try {
      let inserted = 0;
      let skipped = 0;
      let failed = 0;

      // ======================================
      // PROCESS ROWS
      // ======================================

      for (const row of rows) {
        const session = await mongoose.startSession();

        try {
          session.startTransaction();

          console.log(
            "\n================================================"
          );

          console.log(
            `🚀 Processing Payout Payment ID: ${row.payout_id}`
          );

          // ======================================
          // RAW VALUES
          // ======================================

          // PAYABLE REMARKS
          const payablesRemarks = cleanValue(row.payout_remarks1);

          const leadNoCSV = parseNumber(row.lead_no);

          const advisorNameCSV = cleanValue(row.advisior_name);

          const employeeNameCSV = cleanValue(row.employee_name);

          const paidAmount = parseNumber(row.paid_amount);

          const paymentAgainstRaw =
            cleanValue(row.payment_against);

          const paidDate = parseDate(row.paid_date);

          const refNo = cleanValue(row.reference_no);

          console.log(`Lead No: ${leadNoCSV}`);
          console.log(`Advisor: ${advisorNameCSV}`);
          console.log(`Employee: ${employeeNameCSV}`);
          console.log(`Paid Amount: ${paidAmount}`);

          // ======================================
          // FIND LEAD
          // ======================================

          console.log("\n🔍 Finding Lead...");

          const lead = await Lead.findOne({
            leadNo: leadNoCSV,
          }).session(session);

          if (!lead) {
            console.log("❌ Lead Not Found");
            skipped++;

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          console.log(`✅ Lead Found: ${lead.clientName}`);

          // ======================================
          // FIND ADVISOR
          // ======================================

          console.log("\n🔍 Finding Advisor...");

          let advisor = null;

          if (advisorNameCSV) {
            advisor = await Advisor.findOne({
              name: {
                $regex: new RegExp(
                  `^${escapeRegex(advisorNameCSV)}$`,
                  "i"
                ),
              },
            }).session(session);
          }

          if (!advisor) {
            advisor = await Advisor.findOne({
              mobileNo: cleanValue(row.mobile_no_1),
            }).session(session);
          }

          if (!advisor) {
            console.log("❌ Advisor Not Found");

            skipped++;

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          console.log(`✅ Advisor Found: ${advisor.name}`);

          // ======================================
          // FIND EMPLOYEE
          // ======================================

          console.log("\n🔍 Finding Employee...");

          let employee = null;

          if (employeeNameCSV) {
            employee = await Employee.findOne({
              name: {
                $regex: new RegExp(
                  `^${escapeRegex(employeeNameCSV)}$`,
                  "i"
                ),
              },
            }).session(session);
          }

          if (!employee) {
            employee = await Employee.findOne({
              mobileNo: cleanValue(row.mobile_no_2),
            }).session(session);
          }

          if (!employee) {
            console.log("❌ Employee Not Found");

            skipped++;

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          console.log(`✅ Employee Found: ${employee.name}`);

          // ======================================
          // FIND ADVISOR PAYOUT
          // ======================================

          console.log("\n🔍 Finding Advisor Payout...");

          let payout = await AdvisorPayout.findOne({
            leadId: lead._id,
            advisorId: advisor._id,
            payoutAmount: parseNumber(row.payout_amount),
            disbursalAmount: parseNumber(
              row.disbursal_amount
            ),
          }).session(session);

          // SECONDARY MATCH
          if (!payout) {
            payout = await AdvisorPayout.findOne({
              leadId: lead._id,
              advisorId: advisor._id,
            }).session(session);
          }

          if (!payout) {
            console.log("❌ Advisor Payout Not Found");

            skipped++;

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          console.log("✅ Advisor Payout Found");

          // ======================================
          // CHECK EXISTING PAYABLE
          // ======================================

          console.log(
            "\n🔍 Checking Existing Payable..."
          );

          const existingPayable = await Payables.findOne({
            payoutId: payout._id,
            paidAmount,
            refNo,
          }).session(session);

          if (existingPayable) {
            console.log("⚠️ Payable Already Exists");

            skipped++;

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          // ======================================
          // PAYMENT AGAINST
          // ======================================

          let paymentAgainst = "payableAmount";

          if (
            paymentAgainstRaw &&
            paymentAgainstRaw
              .toLowerCase()
              .includes("gst")
          ) {
            paymentAgainst = "gstPayment";
          }

          // ======================================
          // CALCULATE AMOUNTS
          // ======================================

          let payableAmount = 0;

          if (paymentAgainst === "gstPayment") {
            payableAmount =
              payout.remainingGstAmount ||
              payout.gstAmount ||
              0;
          } else {
            payableAmount =
              payout.remainingPayableAmount ||
              payout.netPayableAmount ||
              0;
          }

          let balanceAmount =
            Number(payableAmount) - Number(paidAmount);

          if (balanceAmount < 0) {
            balanceAmount = 0;
          }

          // ======================================
          // CREATE PAYABLE
          // ======================================

          const payableData = {
            payoutId: payout._id,

            leadId: lead._id,

            advisorId: advisor._id,

            paymentAgainst,

            payableAmount,

            paidAmount,

            balanceAmount,

            paidDate,

            refNo: refNo || null,

            remarks: payablesRemarks || null,

            createdBy: employee._id,

            updatedBy: employee._id,
          };

          console.log("\n💾 Saving Payable...");

          const createdPayable = await Payables.create(
            [payableData],
            { session }
          );

          console.log(
            "✅ Payable Saved:",
            createdPayable[0]._id
          );

          // ======================================
          // UPDATE PARENT PAYOUT
          // ======================================

          console.log(
            "\n🔄 Updating Advisor Payout Balances..."
          );

          if (paymentAgainst === "payableAmount") {
            payout.remainingPayableAmount = Math.max(
              Number(
                payout.remainingPayableAmount ||
                  payout.netPayableAmount ||
                  0
              ) - Number(paidAmount),
              0
            );
          } else {
            payout.remainingGstAmount = Math.max(
              Number(
                payout.remainingGstAmount ||
                  payout.gstAmount ||
                  0
              ) - Number(paidAmount),
              0
            );
          }

          await payout.save({ session });

          console.log(
            "✅ Advisor Payout Updated"
          );

          // ======================================
          // COMMIT
          // ======================================

          await session.commitTransaction();

          inserted++;

          console.log(
            `✅ Migration Success (${inserted})`
          );
        } catch (err) {
          failed++;

          console.log("\n❌ Error Processing Row");
          console.log(err);

          await session.abortTransaction();
        } finally {
          session.endSession();
        }
      }

      // ======================================
      // FINAL SUMMARY
      // ======================================

      console.log("\n======================================");
      console.log("🎉 PAYABLES MIGRATION COMPLETED");
      console.log(`✅ Inserted: ${inserted}`);
      console.log(`⚠️ Skipped: ${skipped}`);
      console.log(`❌ Failed: ${failed}`);
      console.log("======================================");

      process.exit();
    } catch (err) {
      console.log("❌ Migration Failed");
      console.log(err);

      process.exit(1);
    }
  });