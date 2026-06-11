// SELECT 
//     ap.*,

//     -- CUSTOMER / LEAD DETAILS
//     c.*,

//     -- ADVISOR DETAILS
//     adv.*,

//     -- EMPLOYEE DETAILS (ENTRY BY)
//     emp.*,

//     -- PROCESSED BY DETAILS
//     pb.*

// FROM company_payout_booking_tbl ap

// -- LEAD POPULATION
// LEFT JOIN customer_tbl c
//     ON c.lead_no = ap.lead_no

// -- ADVISOR POPULATION
// LEFT JOIN advisior_tbl adv
//     ON adv.advisior_id = c.created_by_id

// -- ENTRY BY EMPLOYEE POPULATION
// LEFT JOIN employee_tbl emp
//     ON emp.employee_id = ap.entry_by_id

// -- PROCESSED BY POPULATION
// LEFT JOIN processed_by_tbl pb
//     ON pb.processed_by_id = ap.processed_by_id;

import fs from "fs";
import csv from "csv-parser";
import mongoose from "mongoose";

import Invoice from "../models/Invoices.model.js";
import InvoiceMaster from "../models/InvoiceMaster.model.js";
import Lead from "../models/Lead.model.js";
import Employee from "../models/Employee.model.js";
import ProcessedBy from "../models/ProcessedBy.model.js";

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
const skippedRows = [];

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

const parseBoolean = (value) => {
  const cleaned = cleanValue(value);

  return cleaned === "1" || cleaned === "true";
};

const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const addSkippedRow = ({ row, reason, extra = {} }) => {
  skippedRows.push({
    payout_id: row.payout_id,
    lead_no: row.lead_no,
    invoice_no: row.invoice_no,
    payout_amount: row.payout_amount,
    reason,
    ...extra,
  });
};

// ======================================
// READ CSV
// ======================================

console.log("📄 Reading CSV File...");

fs.createReadStream("./migration_data/Invoice_data1.csv")
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

          const leadNoCSV = parseNumber(row.lead_no);

          const employeeNameCSV = cleanValue(row.employee_name);

          const processedByNameCSV = cleanValue(row.processed_by_name);

          const invoiceNo = cleanValue(row.invoice_no) || "NA";

          const invoiceDate = parseDate(row.invoice_date);

          const disbursalDate = parseDate(row.disbursal_date);

          const disbursalAmount = parseNumber(row.disbursal_amount);

          const payoutPercent = parseNumber(row.payout_percentage);

          const payoutAmount = parseNumber(row.payout_amount);

          const tdsPercent = parseNumber(row.tds_percentage);

          const tdsAmount = parseNumber(row.tds_amount);

          const gstPercent = parseNumber(row.gst_percentage);

          const gstAmount = parseNumber(row.gst_amount);

          const netReceivableAmount = parseNumber(row.net_receivable_amount);

          const finalInvoice = parseBoolean(row.is_final_advisor_payout);

          // ======================================
          // REMARKS FIX
          // ======================================

          const remarks =
            cleanValue(values[16]) || cleanValue(row.payout_remarks) || "";

          // ======================================
          // FIND LEAD
          // ======================================

          const lead = await Lead.findOne({
            leadNo: leadNoCSV,
          }).session(session);

          if (!lead) {
            skipped++;

            addSkippedRow({
              row,
              reason: "Lead Not Found",
            });

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          // ======================================
          // FIND EMPLOYEE
          // ======================================

          let employee = null;

          if (employeeNameCSV) {
            employee = await Employee.findOne({
              name: {
                $regex: new RegExp(`^${escapeRegex(employeeNameCSV)}$`, "i"),
              },
            }).session(session);
          }

          if (!employee) {
            employee = await Employee.findOne({
              mobileNo: cleanValue(values[123]),
            }).session(session);
          }

          if (!employee) {
            skipped++;

            addSkippedRow({
              row,
              reason: "Employee Not Found",
            });

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          // ======================================
          // FIND PROCESSED BY
          // ======================================

          let processedBy = null;

          if (processedByNameCSV) {
            processedBy = await ProcessedBy.findOne({
              processedBy: {
                $regex: new RegExp(`^${escapeRegex(processedByNameCSV)}$`, "i"),
              },
            }).session(session);
          }

          if (!processedBy) {
            processedBy = await ProcessedBy.findOne().session(session);
          }

          if (!processedBy) {
            skipped++;

            addSkippedRow({
              row,
              reason: "ProcessedBy Not Found",
            });

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          // ======================================
          // CHECK DUPLICATE INVOICE
          // ======================================

          const existingInvoice = await Invoice.findOne({
            leadId: lead._id,
            invoiceNo,
            disbursalDate,
            payoutAmount,
            tdsAmount,
            gstAmount,
            netReceivableAmount,
          }).session(session);

          if (existingInvoice) {
            skipped++;

            addSkippedRow({
              row,
              reason: "Duplicate Invoice Found",
              extra: {
                existingInvoiceId: existingInvoice._id,
              },
            });

            await session.abortTransaction();
            session.endSession();

            continue;
          }

          // ======================================
          // FIND / CREATE INVOICE MASTER
          // ======================================

          let invoiceMaster = await InvoiceMaster.findOne({
            leadId: lead._id,
          }).session(session);

          if (!invoiceMaster) {
            invoiceMaster = await InvoiceMaster.create(
              [
                {
                  leadId: lead._id,

                  invoiceReceivableAmount: 0,

                  invoiceGstAmount: 0,

                  remainingReceivableAmount: 0,

                  remainingGstAmount: 0,
                },
              ],
              { session },
            );

            invoiceMaster = invoiceMaster[0];
          }

          // ======================================
          // CALCULATIONS
          // ======================================

          const calculatedPayoutAmount =
            payoutAmount || (disbursalAmount * payoutPercent) / 100;

          const calculatedTdsAmount =
            tdsAmount || (calculatedPayoutAmount * tdsPercent) / 100;

          const calculatedGstAmount =
            gstPercent > 0
              ? (calculatedPayoutAmount * gstPercent) / 100
              : gstAmount || 0;

          const calculatedNetReceivable =
            netReceivableAmount ||
            calculatedPayoutAmount - calculatedTdsAmount + calculatedGstAmount;

          // ======================================
          // CREATE INVOICE
          // ======================================

          await Invoice.create(
            [
              {
                invoiceMasterId: invoiceMaster._id,

                leadId: lead._id,

                disbursalAmount,

                disbursalDate,

                payoutPercent,

                payoutAmount: calculatedPayoutAmount,

                tdsPercent,

                tdsAmount: calculatedTdsAmount,

                gstPercent,

                gstAmount: calculatedGstAmount,

                invoiceNo,

                invoiceDate,

                netReceivableAmount: calculatedNetReceivable,

                processedById: processedBy._id,

                finalInvoice,

                remarks,

                createdBy: employee._id,

                updatedBy: employee._id,

                createdAt: parseDate(row.entry_date),

                updatedAt: parseDate(row.entry_date),
              },
            ],
            { session },
          );

          // ======================================
          // UPDATE INVOICE MASTER
          // ======================================

          invoiceMaster.invoiceReceivableAmount +=
            calculatedPayoutAmount - calculatedTdsAmount;

          invoiceMaster.invoiceGstAmount += calculatedGstAmount;

          invoiceMaster.remainingReceivableAmount +=
            calculatedPayoutAmount - calculatedTdsAmount;

          invoiceMaster.remainingGstAmount += calculatedGstAmount;

          await invoiceMaster.save({
            session,
          });

          // ======================================
          // UPDATE LEAD
          // ======================================

          if (finalInvoice === true) {
            lead.finalInvoice = true;

            await lead.save({ session });
          }

          // ======================================
          // COMMIT
          // ======================================

          await session.commitTransaction();
          session.endSession();

          inserted++;

          console.log(
            `✅ Inserted Invoice -> LeadNo: ${leadNoCSV} | InvoiceNo: ${invoiceNo}`,
          );
        } catch (err) {
          await session.abortTransaction();
          session.endSession();

          skipped++;

          addSkippedRow({
            row,
            reason: err.message,
          });
        }
      }

      // ======================================
      // FINAL SUMMARY
      // ======================================

      console.log("\n======================================");
      console.log("🎉 INVOICE MIGRATION COMPLETED");
      console.log(`✅ Inserted: ${inserted}`);
      console.log(`⚠️ Skipped: ${skipped}`);
      console.log("======================================");

      // ======================================
      // SKIPPED ROWS LOG
      // ======================================

      if (skippedRows.length > 0) {
        console.log("\n======================================");
        console.log("⚠️ SKIPPED RECORDS");
        console.log("======================================");

        skippedRows.forEach((item, index) => {
          console.log(`\n#${index + 1}`);

          console.log(`Payout ID      : ${item.payout_id}`);

          console.log(`Lead No        : ${item.lead_no}`);

          console.log(`Invoice No     : ${item.invoice_no}`);

          console.log(`Payout Amount  : ${item.payout_amount}`);

          console.log(`Reason         : ${item.reason}`);

          if (item.existingInvoiceId) {
            console.log(`Existing ID    : ${item.existingInvoiceId}`);
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
