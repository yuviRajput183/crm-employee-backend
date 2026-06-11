// SELECT 
//     -- =========================================
//     -- ADVISOR PAYOUT DETAILS
//     -- =========================================
//     ap.*,

//     -- =========================================
//     -- CUSTOMER DETAILS
//     -- =========================================
//     c.*,

//     -- =========================================
//     -- ATTACHMENT DETAILS
//     -- =========================================
//     ca.*,

//     -- =========================================
//     -- BANKER TRANSACTION DETAILS
//     -- =========================================
//     cb.*,

//     -- =========================================
//     -- EXISTING LOAN DETAILS
//     -- =========================================
//     ce.*,

//     -- =========================================
//     -- CUSTOMER TRANSACTION / HISTORY DETAILS
//     -- =========================================
//     ct.*,

//     -- =========================================
//     -- CHILD / FEEDBACK DETAILS
//     -- =========================================
//     tf.*,

//     -- =========================================
//     -- SELF EMPLOYED DETAILS
//     -- =========================================
//     sef.*,

//     -- =========================================
//     -- SALARIED EMPLOYED DETAILS
//     -- =========================================
//     se.*,

//     -- =========================================
//     -- ADVISOR DETAILS
//     -- =========================================
//     adv.*,

//     -- =========================================
//     -- EMPLOYEE DETAILS
//     -- =========================================
//     emp.*,

//     -- =========================================
//     -- BANKER DETAILS
//     -- =========================================
//     bnk.*,

//     -- =========================================
//     -- PROCESSED BY DETAILS
//     -- =========================================
//     pb.*

// FROM advisor_payout_tbl AS ap

// -- =========================================
// -- CUSTOMER TABLE
// -- =========================================
// LEFT JOIN customer_tbl AS c
//     ON c.lead_no = ap.lead_no

// -- =========================================
// -- ATTACHMENTS
// -- =========================================
// LEFT JOIN customer_attachment_tbl AS ca
//     ON c.transaction_id = ca.transaction_id

// -- =========================================
// -- BANKER TRANSACTION
// -- =========================================
// LEFT JOIN customer_banker_transaction_tbl AS cb
//     ON c.transaction_id = cb.transaction_id

// -- =========================================
// -- EXISTING LOAN
// -- =========================================
// LEFT JOIN customer_existing_loan_tbl AS ce
//     ON c.transaction_id = ce.transaction_id

// -- =========================================
// -- CUSTOMER TRANSACTION
// -- =========================================
// LEFT JOIN customer_transaction_tbl AS ct
//     ON c.transaction_id = ct.transaction_id

// -- =========================================
// -- CUSTOMER CHILD / FEEDBACK
// -- =========================================
// LEFT JOIN customer_child_tbl AS tf
//     ON c.transaction_id = tf.transaction_id

// -- =========================================
// -- SALARIED EMPLOYED
// -- =========================================
// LEFT JOIN salaried_employed_tbl AS se
//     ON c.transaction_id = se.transaction_id

// -- =========================================
// -- SELF EMPLOYED
// -- =========================================
// LEFT JOIN self_employed_tbl AS sef
//     ON c.transaction_id = sef.transaction_id

// -- =========================================
// -- ADVISOR DETAILS
// -- advisor_payout_tbl.advisor_id
// -- =========================================
// LEFT JOIN advisior_tbl AS adv
//     ON adv.advisior_id = ap.advisor_id

// -- =========================================
// -- EMPLOYEE DETAILS
// -- assign_to_id from customer_child_tbl
// -- =========================================
// LEFT JOIN employee_tbl AS emp
//     ON emp.employee_id = tf.assign_to_id

// -- =========================================
// -- BANKER DETAILS
// -- banker_id from banker transaction table
// -- =========================================
// LEFT JOIN banker_details_tbl AS bnk
//     ON bnk.banker_id = cb.banker_id

// -- =========================================
// -- PROCESSED BY DETAILS
// -- =========================================
// LEFT JOIN processed_by_tbl AS pb
//     ON pb.processed_by_id = ap.processed_by_id;

import fs from "fs";
import csv from "csv-parser";
import mongoose from "mongoose";

import AdvisorPayout from "./../models/AdvisorPayout.model.js";
import Lead from "./../models/Lead.model.js";
import Advisor from "./../models/Advisor.model.js";
import Employee from "./../models/Employee.model.js";
import ProcessedBy from "./../models/ProcessedBy.model.js";

// ======================================================
// MONGODB CONNECTION
// ======================================================

await mongoose.connect(
  "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project"
);

console.log("✅ MongoDB Connected");

// ======================================================
// HELPERS
// ======================================================

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

const parseNumber = (value, defaultValue = 0) => {
  const cleaned = cleanValue(value);

  if (!cleaned) return defaultValue;

  const num = Number(cleaned);

  return isNaN(num) ? defaultValue : num;
};

const parseDate = (date) => {
  const cleaned = cleanValue(date);

  if (!cleaned || cleaned === "0") {
    return null;
  }

  const parsed = new Date(cleaned);

  return isNaN(parsed.getTime()) ? null : parsed;
};

const parseBoolean = (value) => {
  const cleaned = cleanValue(value);

  if (!cleaned) return false;

  return (
    cleaned === "1" ||
    cleaned === "true" ||
    cleaned === "TRUE" ||
    cleaned === "yes" ||
    cleaned === "Yes"
  );
};

// ======================================================
// READ CSV
// ======================================================

console.log("📄 Reading CSV File...");

fs.createReadStream("./migration_data/Advisor_Payout_Data1.csv")
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

      // ======================================================
      // GROUP BY PAYOUT ID
      // ======================================================

      console.log("\n🔄 Grouping By payout_id...");

      const groupedData = {};

      for (const row of rows) {

        const payoutId = cleanValue(row.payout_id);

        if (!payoutId) continue;

        if (!groupedData[payoutId]) {
          groupedData[payoutId] = [];
        }

        groupedData[payoutId].push(row);
      }

      const uniquePayouts = Object.keys(groupedData);

      console.log(
        `✅ Unique Payouts Found: ${uniquePayouts.length}`
      );

      let processed = 0;
      let skipped = 0;
      let failed = 0;

      // ======================================================
      // PROCESS EACH PAYOUT
      // ======================================================

      for (const payoutId of uniquePayouts) {

        try {

          console.log("\n=================================================");
          console.log(`🚀 Processing Payout ID: ${payoutId}`);

          const payoutRows = groupedData[payoutId];

          if (!payoutRows || payoutRows.length === 0) {
            console.log("❌ No Rows Found");
            continue;
          }

          const firstRow = payoutRows[0];

          // ======================================================
          // CHECK EXISTING PAYOUT
          // ======================================================

          const existingPayout = await AdvisorPayout.findOne({
            oldPayoutId: parseNumber(firstRow.payout_id),
          });

          if (existingPayout) {

            console.log(
              `⚠️ Payout Already Exists: ${firstRow.payout_id}`
            );

            skipped++;
            continue;
          }

          // ======================================================
          // FIND LEAD
          // ======================================================

          console.log("🔍 Finding Lead...");

          const leadNo = parseNumber(firstRow.lead_no);

          const lead = await Lead.findOne({
            leadNo,
          });

          if (!lead) {

            console.log(`❌ Lead Not Found: ${leadNo}`);

            failed++;
            continue;
          }

          console.log(`✅ Lead Found: ${lead.clientName}`);

          // ======================================================
          // FIND ADVISOR
          // ======================================================

          console.log("🔍 Finding Advisor...");

          let advisor = null;

          const advisorName = cleanValue(
            firstRow.advisior_name
          );

          if (advisorName) {

            advisor = await Advisor.findOne({
              name: {
                $regex: new RegExp(
                  `^${advisorName}$`,
                  "i"
                ),
              },
            });
          }

          // fallback by old advisor id
          if (!advisor && cleanValue(firstRow.advisor_id)) {

            advisor = await Advisor.findOne({
              oldAdvisorId: parseNumber(
                firstRow.advisor_id
              ),
            });
          }

          if (advisor) {
            console.log(`✅ Advisor Found: ${advisor.name}`);
          } else {
            console.log("❌ Advisor Not Found");
          }

          // ======================================================
          // FIND EMPLOYEE
          // ======================================================

          console.log("🔍 Finding Employee...");

          let employee = null;

          const employeeName = cleanValue(
            firstRow.employee_name
          );

          if (employeeName) {

            employee = await Employee.findOne({
              name: {
                $regex: new RegExp(
                  `^${employeeName}$`,
                  "i"
                ),
              },
            });
          }

          // fallback by old employee id
          if (!employee && cleanValue(firstRow.entry_by_id)) {

            employee = await Employee.findOne({
              oldEmployeeId: parseNumber(
                firstRow.entry_by_id
              ),
            });
          }

          if (employee) {
            console.log(`✅ Employee Found: ${employee.name}`);
          } else {
            console.log("❌ Employee Not Found");
          }

          // ======================================================
          // FIND PROCESSED BY
          // ======================================================

          console.log("🔍 Finding ProcessedBy...");

          let processedBy = null;

          const processedByName = cleanValue(
            firstRow.processed_by_name
          );

          if (processedByName) {

            // CORRECT FIELD => processedBy
            processedBy = await ProcessedBy.findOne({
              processedBy: {
                $regex: new RegExp(
                  `^${processedByName}$`,
                  "i"
                ),
              },
            });

            // AUTO CREATE IF NOT FOUND
            if (!processedBy) {

              console.log(
                `⚠️ ProcessedBy Not Found. Creating New: ${processedByName}`
              );

              // fallback employee
              const fallbackEmployee =
                employee ||
                (await Employee.findOne());

              if (!fallbackEmployee) {

                throw new Error(
                  "No employee found to create ProcessedBy"
                );
              }

              processedBy =
                await ProcessedBy.create({
                  processedBy: processedByName,
                  createdBy: fallbackEmployee._id,
                });

              console.log(
                `✅ New ProcessedBy Created: ${processedBy.processedBy}`
              );
            }
          }

          if (processedBy) {

            console.log(
              `✅ ProcessedBy Found: ${processedBy.processedBy}`
            );

          } else {

            console.log(
              "❌ ProcessedBy Not Found"
            );

            failed++;
            continue;
          }

          // ======================================================
          // GST APPLICABLE
          // ======================================================

          const gstApplicableText = cleanValue(
            firstRow.is_gst_applicable
          );

          const gstApplicable =
            gstApplicableText &&
            gstApplicableText.toLowerCase() !==
              "not applicable";

          // ======================================================
          // FINAL PAYOUT
          // ======================================================

          const finalPayout = parseBoolean(
            firstRow.is_final_advisor_payout
          );

          // ======================================================
          // PAYOUT DATA
          // ======================================================

          const payoutData = {

            // OLD PAYOUT ID
            oldPayoutId: parseNumber(
              firstRow.payout_id
            ),

            // REFERENCES
            leadId: lead._id,

            advisorId:
              advisor?._id ||
              lead.advisorId ||
              null,

            processedById:
              processedBy?._id || null,

            createdBy:
              employee?._id ||
              lead.employeeId ||
              lead.createdBy ||
              null,

            updatedBy:
              employee?._id ||
              lead.employeeId ||
              lead.updatedBy ||
              null,

            // PAYOUT DETAILS
            disbursalAmount: parseNumber(
              firstRow.disbursal_amount
            ),

            disbursalDate: parseDate(
              firstRow.date_of_disbursal
            ),

            payoutPercent: parseNumber(
              firstRow.payout_percentage
            ),

            payoutAmount: parseNumber(
              firstRow.payout_amount
            ),

            tdsPercent: parseNumber(
              firstRow.tds_percentage
            ),

            tdsAmount: parseNumber(
              firstRow.tds_amount
            ),

            gstApplicable,

            gstPercent: parseNumber(
              firstRow.gst_percentage
            ),

            gstAmount: parseNumber(
              firstRow.gst_amount
            ),

            invoiceNo: cleanValue(
              firstRow.invoice_no
            ),

            invoiceDate: parseDate(
              firstRow.invoice_date
            ),

            netPayableAmount: parseNumber(
              firstRow.net_payable_amount
            ),

            finalPayout,

            remarks: cleanValue(
              firstRow.payout_remarks
            ),

            // DEFAULT VALUES
            remainingGstAmount: parseNumber(
              firstRow.gst_amount
            ),

            remainingPayableAmount: parseNumber(
              firstRow.net_payable_amount
            ),

            // TIMESTAMPS
            createdAt:
              parseDate(firstRow.entry_date) ||
              new Date(),

            updatedAt:
              parseDate(firstRow.entry_date) ||
              new Date(),
          };

          // ======================================================
          // SAVE PAYOUT
          // ======================================================

          console.log("💾 Saving Advisor Payout...");

          const createdPayout =
            await AdvisorPayout.create(
              payoutData
            );

          console.log(
            `✅ Advisor Payout Saved: ${createdPayout._id}`
          );

          // ======================================================
          // UPDATE LEAD FINAL PAYOUT
          // ======================================================

          if (finalPayout !== false) {

            await Lead.findByIdAndUpdate(
              lead._id,
              {
                finalPayout: true,
              },
              {
                new: true,
              }
            );

            console.log(
              "✅ Lead Final Payout Updated"
            );
          }

          processed++;

          console.log(
            `📈 Progress: ${processed}/${uniquePayouts.length}`
          );

        } catch (err) {

          failed++;

          console.log(
            `❌ Error Processing Payout ID: ${payoutId}`
          );

          console.log(err);
        }
      }

      // ======================================================
      // FINAL LEAD FINAL PAYOUT FIX
      // ======================================================

      console.log(
        "\n🔄 Rechecking Final Payout Status..."
      );

      const allLeads = await Lead.find();

      for (const lead of allLeads) {

        const hasFinalPayout =
          await AdvisorPayout.exists({
            leadId: lead._id,
            finalPayout: true,
          });

        await Lead.findByIdAndUpdate(
          lead._id,
          {
            finalPayout: !!hasFinalPayout,
          }
        );
      }

      console.log(
        "✅ Final Payout Sync Completed"
      );

      // ======================================================
      // COMPLETED
      // ======================================================

      console.log("\n======================================");
      console.log("🎉 MIGRATION COMPLETED");
      console.log(`✅ Inserted: ${processed}`);
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