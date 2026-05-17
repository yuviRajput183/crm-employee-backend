// lead_no ko lead_no1 krna h and payout_remarks ko payout_remarks1 krna h csv file me.
// SELECT
//     r.*,

//     cpb.*,

//     c.*,

//     e.*

// FROM company_payout_receipt_tbl r

// LEFT JOIN company_payout_booking_tbl cpb
//     ON cpb.auto_id = r.payout_id

// LEFT JOIN customer_tbl c
//     ON c.auto_id = r.lead_no

// LEFT JOIN employee_tbl e
//     ON e.auto_id = r.entry_by_id;

import fs from "fs";
import csv from "csv-parser";
import mongoose from "mongoose";

import Receivable from "../models/Receivable.model.js";
import InvoiceMaster from "../models/InvoiceMaster.model.js";
import Lead from "../models/Lead.model.js";
import Employee from "../models/Employee.model.js";

// ======================================
// MONGODB CONNECTION
// ======================================

await mongoose.connect(
  "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project",
);

console.log("✅ MongoDB Connected");

// ======================================
// HELPERS
// ======================================

const rows = [];
const skippedRecords = [];

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

fs.createReadStream("./migration_data/Receivable_data.csv")
  .pipe(csv())
  .on("data", (data) => {
    rows.push(data);

    if (rows.length % 500 === 0) {
      console.log(`📦 Loaded ${rows.length} rows`);
    }
  })
  .on("end", async () => {
    console.log("\n✅ CSV Loaded Successfully");
    console.log(`📊 Total Rows: ${rows.length}`);

    let inserted = 0;
    let skipped = 0;

    try {
      // ======================================
      // PROCESS ROWS
      // ======================================

      for (const row of rows) {
        const session = await mongoose.startSession();

        try {
          session.startTransaction();

          // ======================================
          // RAW VALUES
          // ======================================

          const values = Object.values(row);

          // ======================================
          // CSV VALUES
          // ======================================

          const payoutIdCSV = parseNumber(row.payout_id);

          const leadNoCSV = parseNumber(row.lead_no1);

          const receivedDate = parseDate(row.received_date);

          const receivedAmount = parseNumber(row.received_amount);

          const referenceNo = cleanValue(row.reference_no);

          const remarks = cleanValue(row.payout_remarks1) || "";

          const entryDate = parseDate(row.entry_date);

          const employeeIdCSV = parseNumber(row.entry_by_id);

          const paymentAgainstCSV = cleanValue(row.payment_against);

          // ======================================
          // MAP PAYMENT AGAINST
          // ======================================

          let paymentAgainst = null;

          if (
            paymentAgainstCSV &&
            paymentAgainstCSV.toLowerCase() === "receivable amount"
          ) {
            paymentAgainst = "receivableAmount";
          } else if (
            paymentAgainstCSV &&
            paymentAgainstCSV.toLowerCase() === "gst amount"
          ) {
            paymentAgainst = "gstPayment";
          }

          if (!paymentAgainst) {
            skipped++;

            skippedRecords.push({
              payoutId: payoutIdCSV,
              leadNo: leadNoCSV,
              reason: `Invalid paymentAgainst: ${paymentAgainstCSV}`,
            });

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          // ======================================
          // FIND LEAD
          // ======================================

          const lead = await Lead.findOne({
            leadNo: leadNoCSV,
          }).session(session);

          if (!lead) {
            skipped++;

            skippedRecords.push({
              payoutId: payoutIdCSV,
              leadNo: leadNoCSV,
              reason: "Lead Not Found",
            });

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          // ======================================
          // FIND EMPLOYEE
          // ======================================

          let employee = await Employee.findOne({
            employeeId: employeeIdCSV,
          }).session(session);

          if (!employee) {
            employee = await Employee.findOne({
              mobileNo: cleanValue(values[123]),
            }).session(session);
          }

          if (!employee) {
            skipped++;

            skippedRecords.push({
              payoutId: payoutIdCSV,
              leadNo: leadNoCSV,
              reason: "Employee Not Found",
            });

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          // ======================================
          // FIND INVOICE MASTER
          // ======================================

          const invoiceMaster = await InvoiceMaster.findOne({
            leadId: lead._id,
          }).session(session);

          if (!invoiceMaster) {
            skipped++;

            skippedRecords.push({
              payoutId: payoutIdCSV,
              leadNo: leadNoCSV,
              reason: "InvoiceMaster Not Found",
            });

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          // ======================================
          // CHECK DUPLICATE
          // ======================================

          const existingReceivable = await Receivable.findOne({
            leadId: lead._id,
            receivedAmount,
            receivedDate,
            paymentAgainst,
            refNo: referenceNo,
          }).session(session);

          if (existingReceivable) {
            skipped++;

            skippedRecords.push({
              payoutId: payoutIdCSV,
              leadNo: leadNoCSV,
              reason: "Duplicate Receivable Found",
              existingId: existingReceivable._id,
            });

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          // ======================================
          // CALCULATE RECEIVABLE AMOUNT
          // ======================================

          let receivableAmount = 0;

          if (paymentAgainst === "receivableAmount") {
            receivableAmount = invoiceMaster.invoiceReceivableAmount || 0;
          } else {
            receivableAmount = invoiceMaster.invoiceGstAmount || 0;
          }

          const balanceAmount = Math.max(receivableAmount - receivedAmount, 0);

          // ======================================
          // CREATE RECEIVABLE
          // ======================================

          await Receivable.create(
            [
              {
                invoiceMasterId: invoiceMaster._id,

                leadId: lead._id,

                paymentAgainst,

                receivableAmount,

                receivedAmount,

                balanceAmount,

                receivedDate,

                refNo: referenceNo || null,

                remarks,

                createdBy: employee._id,

                updatedBy: employee._id,

                createdAt: entryDate,

                updatedAt: entryDate,
              },
            ],
            { session },
          );

          // ======================================
          // UPDATE INVOICE MASTER
          // ======================================

          if (paymentAgainst === "receivableAmount") {
            invoiceMaster.remainingReceivableAmount = Math.max(
              (invoiceMaster.remainingReceivableAmount || 0) - receivedAmount,
              0,
            );
          } else if (paymentAgainst === "gstPayment") {
            invoiceMaster.remainingGstAmount = Math.max(
              (invoiceMaster.remainingGstAmount || 0) - receivedAmount,
              0,
            );
          }

          await invoiceMaster.save({ session });

          // ======================================
          // COMMIT
          // ======================================

          await session.commitTransaction();
          session.endSession();

          inserted++;

          console.log(
            `✅ Inserted Receivable -> LeadNo: ${leadNoCSV} | Amount: ${receivedAmount}`,
          );
        } catch (err) {
          await session.abortTransaction();
          session.endSession();

          // ======================================
          // RETRY WRITE CONFLICT
          // ======================================

          if (
            err.message.includes("Write conflict") ||
            err.message.includes("transaction")
          ) {
            console.log(`🔄 Retrying -> PayoutID: ${row.payout_id}`);

            try {
              // ======================================
              // REFETCH DATA WITHOUT TRANSACTION
              // ======================================

              const payoutIdCSV = parseNumber(row.payout_id);

              const leadNoCSV = parseNumber(row.lead_no1);

              const receivedDate = parseDate(row.received_date);

              const receivedAmount = parseNumber(row.received_amount);

              const referenceNo = cleanValue(row.reference_no);

              const remarks = cleanValue(row.payout_remarks1) || "";

              const entryDate = parseDate(row.entry_date);

              const employeeIdCSV = parseNumber(row.entry_by_id);

              const paymentAgainstCSV = cleanValue(row.payment_against);

              let paymentAgainst = null;

              if (
                paymentAgainstCSV &&
                paymentAgainstCSV.toLowerCase() === "receivable amount"
              ) {
                paymentAgainst = "receivableAmount";
              } else if (
                paymentAgainstCSV &&
                paymentAgainstCSV.toLowerCase() === "gst amount"
              ) {
                paymentAgainst = "gstPayment";
              }

              const lead = await Lead.findOne({
                leadNo: leadNoCSV,
              });

              const employee = await Employee.findOne({
                employeeId: employeeIdCSV,
              });

              const invoiceMaster = await InvoiceMaster.findOne({
                leadId: lead._id,
              });

              const existingReceivable = await Receivable.findOne({
                leadId: lead._id,
                receivedAmount,
                receivedDate,
                paymentAgainst,
                refNo: referenceNo,
              });

              if (!existingReceivable) {
                let receivableAmount = 0;

                if (paymentAgainst === "receivableAmount") {
                  receivableAmount = invoiceMaster.invoiceReceivableAmount || 0;
                } else {
                  receivableAmount = invoiceMaster.invoiceGstAmount || 0;
                }

                const balanceAmount = Math.max(
                  receivableAmount - receivedAmount,
                  0,
                );

                await Receivable.create({
                  invoiceMasterId: invoiceMaster._id,

                  leadId: lead._id,

                  paymentAgainst,

                  receivableAmount,

                  receivedAmount,

                  balanceAmount,

                  receivedDate,

                  refNo: referenceNo || null,

                  remarks,

                  createdBy: employee._id,

                  updatedBy: employee._id,

                  createdAt: entryDate,

                  updatedAt: entryDate,
                });

                // UPDATE INVOICE MASTER

                if (paymentAgainst === "receivableAmount") {
                  invoiceMaster.remainingReceivableAmount = Math.max(
                    (invoiceMaster.remainingReceivableAmount || 0) -
                      receivedAmount,
                    0,
                  );
                } else {
                  invoiceMaster.remainingGstAmount = Math.max(
                    (invoiceMaster.remainingGstAmount || 0) - receivedAmount,
                    0,
                  );
                }

                await invoiceMaster.save();

                inserted++;

                console.log(
                  `✅ Retry Success -> LeadNo: ${leadNoCSV} | Amount: ${receivedAmount}`,
                );

                continue;
              }
            } catch (retryErr) {
              skipped++;

              skippedRecords.push({
                payoutId: row.payout_id,
                leadNo: row.lead_no,
                reason: retryErr.message,
              });

              continue;
            }
          }

          skipped++;

          skippedRecords.push({
            payoutId: row.payout_id,
            leadNo: row.lead_no,
            reason: err.message,
          });
        }
      }

      // ======================================
      // DONE
      // ======================================

      console.log("\n======================================");
      console.log("🎉 RECEIVABLE MIGRATION COMPLETED");
      console.log(`✅ Inserted: ${inserted}`);
      console.log(`⚠️ Skipped: ${skipped}`);
      console.log("======================================");

      // ======================================
      // SKIPPED RECORDS
      // ======================================

      if (skippedRecords.length > 0) {
        console.log("\n======================================");
        console.log("⚠️ SKIPPED RECORDS");
        console.log("======================================");

        skippedRecords.forEach((item, index) => {
          console.log(`\n#${index + 1}`);

          console.log(`Payout ID      : ${item.payoutId}`);

          console.log(`Lead No        : ${item.leadNo}`);

          console.log(`Reason         : ${item.reason}`);

          if (item.existingId) {
            console.log(`Existing ID    : ${item.existingId}`);
          }
        });
      }

      process.exit();
    } catch (err) {
      console.log("❌ Migration Failed");
      console.log(err);

      process.exit(1);
    }
  });
