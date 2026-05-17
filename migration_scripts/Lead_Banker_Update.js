// SELECT 
//     c.*, 
//     ca.*, 
//     cb.*, 
//     ce.*, 
//     ct.*, 
//     tf.*,
//     sef.*,
//     se.*,

//     -- Advisor Details
//     adv.*,

//     -- Employee Details
//     emp.*,

//     -- Banker Details
//     bnk.*

// FROM customer_tbl AS c

// LEFT JOIN customer_attachment_tbl AS ca 
//     ON c.transaction_id = ca.transaction_id

// LEFT JOIN customer_banker_transaction_tbl AS cb 
//     ON c.transaction_id = cb.transaction_id

// LEFT JOIN customer_existing_loan_tbl AS ce 
//     ON c.transaction_id = ce.transaction_id

// LEFT JOIN customer_transaction_tbl AS ct 
//     ON c.transaction_id = ct.transaction_id

// LEFT JOIN customer_child_tbl AS tf 
//     ON c.transaction_id = tf.transaction_id

// LEFT JOIN salaried_employed_tbl AS se 
//     ON c.transaction_id = se.transaction_id

// LEFT JOIN self_employed_tbl AS sef
//     ON c.transaction_id = sef.transaction_id

// -- Advisor Populate
// LEFT JOIN advisior_tbl AS adv
//     ON c.created_by_id = adv.advisior_id

// -- Employee Populate
// LEFT JOIN employee_tbl AS emp
//     ON tf.assign_to_id = emp.employee_id

// -- Banker Populate
// LEFT JOIN banker_details_tbl AS bnk
//     ON cb.banker_id = bnk.banker_id;

import fs from "fs";
import csv from "csv-parser";
import mongoose from "mongoose";

import Lead from "../models/Lead.model.js";
import Banker from "../models/Banker.model.js";

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

// ======================================
// READ CSV
// ======================================

console.log("📄 Reading CSV File...");

fs.createReadStream("./migration_data/Lead_banker_details.csv")
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
      // ======================================
      // GROUP BY LEAD NO
      // ======================================

      const groupedData = {};

      for (const row of rows) {
        const leadNo = cleanValue(row.lead_no);

        if (!leadNo) continue;

        if (!groupedData[leadNo]) {
          groupedData[leadNo] = [];
        }

        groupedData[leadNo].push(row);
      }

      const uniqueLeads = Object.keys(groupedData);

      console.log(`✅ Unique Leads Found: ${uniqueLeads.length}`);

      let updatedCount = 0;
      let skippedCount = 0;

      // ======================================
      // PROCESS LEADS
      // ======================================

      for (const leadNo of uniqueLeads) {
        try {
          console.log("\n================================================");
          console.log(`🚀 Processing Lead No: ${leadNo}`);

          const rowsOfLead = groupedData[leadNo];

          const row = rowsOfLead[0];

          // ======================================
          // FIND LEAD
          // ======================================

          const lead = await Lead.findOne({
            leadNo: Number(leadNo),
          });

          if (!lead) {
            console.log("❌ Lead Not Found");
            skippedCount++;
            continue;
          }

          console.log(`✅ Lead Found: ${lead.clientName}`);

          // ======================================
          // GET BANKER DATA FROM CSV
          // ======================================

          // IMPORTANT:
          // Use banker_mobile_no & banker_email_id
          // from SQL aliases if possible

          const bankerName =
            cleanValue(row.banker_name) ||
            cleanValue(row.bankerName);

          const bankerMobile =
            cleanValue(row.banker_mobile_no) ||
            cleanValue(row.mobile_no_2) ||
            cleanValue(row.mobile_no);

          const bankerEmail =
            cleanValue(row.banker_email_id) ||
            cleanValue(row.email_id_2) ||
            cleanValue(row.email_id);

          const bankerProduct =
            cleanValue(row.product);

          const bankerDesignation =
            cleanValue(row.banker_designation);

          console.log("\n🏦 Banker Details From CSV");

          console.log(`Name: ${bankerName}`);
          console.log(`Mobile: ${bankerMobile}`);
          console.log(`Email: ${bankerEmail}`);
          console.log(`Product: ${bankerProduct}`);
          console.log(`Designation: ${bankerDesignation}`);

          let banker = null;

          // ======================================
          // 1. FIND BY MOBILE
          // ======================================

          if (bankerMobile) {
            banker = await Banker.findOne({
              mobileNo: bankerMobile,
            });

            if (banker) {
              console.log("✅ Matched By Mobile");
            }
          }

          // ======================================
          // 2. FIND BY EMAIL
          // ======================================

          if (!banker && bankerEmail) {
            banker = await Banker.findOne({
              emailId: {
                $regex: new RegExp(
                  `^${bankerEmail.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                  )}$`,
                  "i"
                ),
              },
            });

            if (banker) {
              console.log("✅ Matched By Email");
            }
          }

          // ======================================
          // 3. FIND BY NAME
          // ======================================

          if (!banker && bankerName) {
            banker = await Banker.findOne({
              bankerName: {
                $regex: new RegExp(
                  bankerName
                    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                    .trim(),
                  "i"
                ),
              },
            });

            if (banker) {
              console.log("✅ Matched By Name");
            }
          }

          // ======================================
          // 4. FIND BY NAME + PRODUCT
          // ======================================

          if (!banker && bankerName && bankerProduct) {
            banker = await Banker.findOne({
              bankerName: {
                $regex: new RegExp(
                  bankerName
                    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                    .trim(),
                  "i"
                ),
              },

              product: {
                $regex: new RegExp(
                  bankerProduct
                    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                    .trim(),
                  "i"
                ),
              },
            });

            if (banker) {
              console.log("✅ Matched By Name + Product");
            }
          }

          // ======================================
          // 5. FIND BY NAME + DESIGNATION
          // ======================================

          if (!banker && bankerName && bankerDesignation) {
            banker = await Banker.findOne({
              bankerName: {
                $regex: new RegExp(
                  bankerName
                    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                    .trim(),
                  "i"
                ),
              },

              bankerDesignation: {
                $regex: new RegExp(
                  bankerDesignation
                    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                    .trim(),
                  "i"
                ),
              },
            });

            if (banker) {
              console.log("✅ Matched By Name + Designation");
            }
          }

          // ======================================
          // UPDATE LEAD
          // ======================================

          if (banker) {
            console.log(`✅ Banker Found: ${banker.bankerName}`);

            await Lead.findByIdAndUpdate(
              lead._id,
              {
                bankerId: banker._id,
              },
              { new: true }
            );

            console.log("✅ Banker ID Updated Into Lead");

            updatedCount++;
          } else {
            console.log("❌ Banker Not Found");

            skippedCount++;
          }
        } catch (err) {
          console.log(`❌ Error Processing Lead No`);

          console.log(err);
        }
      }

      // ======================================
      // COMPLETED
      // ======================================

      console.log("\n======================================");
      console.log("🎉 BANKER MIGRATION COMPLETED");
      console.log(`✅ Updated Leads: ${updatedCount}`);
      console.log(`⚠️ Skipped Leads: ${skippedCount}`);
      console.log("======================================");

      process.exit();
    } catch (err) {
      console.log("❌ Migration Failed");
      console.log(err);

      process.exit(1);
    }
  });