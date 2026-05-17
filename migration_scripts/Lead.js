// SELECT 
//     c.*, 
//     ca.*, 
//     cb.*, 
//     ce.*, 
//     ct.*, 
//     tf.*,
//     sef.*,
//     se.*,
//     -- Populated Fields from Master Tables
//     adv.advisior_name,   -- Populated from advisor_tbl
//     emp.employee_name,  -- Populated from employee_tbl
//     bnk.banker_name     -- Populated from banker_tbl
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

// -- New Joins to populate the requested IDs
// LEFT JOIN advisior_tbl AS adv
//     ON c.created_by_id = adv.advisior_id
// LEFT JOIN employee_tbl AS emp
//     ON tf.assign_to_id = emp.employee_id
// LEFT JOIN banker_details_tbl AS bnk
//     ON cb.banker_id = bnk.banker_id;


import fs from "fs";
import csv from "csv-parser";
import mongoose from "mongoose";

import Lead from "./../models/Lead.model.js";
import Advisor from "./../models/Advisor.model.js";
import Employee from "./../models/Employee.model.js";
import Banker from "./../models/Banker.model.js";

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

const parseDate = (date) => {
  const cleaned = cleanValue(date);

  if (!cleaned || cleaned === "0") {
    return null;
  }

  const parsed = new Date(cleaned);

  return isNaN(parsed.getTime()) ? null : parsed;
};

// ======================================
// READ CSV
// ======================================

console.log("📄 Reading CSV File...");

fs.createReadStream("./migration_data/Lead_all_new_data.csv")
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

      console.log("\n🔄 Grouping rows by lead_no...");

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

      let processed = 0;

      // ======================================
      // PROCESS LEADS
      // ======================================

      for (const leadNo of uniqueLeads) {
        try {
          console.log("\n================================================");
          console.log(`🚀 Processing Lead No: ${leadNo}`);

          const leadRows = groupedData[leadNo];

          if (!leadRows || leadRows.length === 0) {
            console.log("❌ No Rows Found");
            continue;
          }

          const firstRow = leadRows[0];

          // ======================================
          // FIND ADVISOR
          // ======================================

          console.log("🔍 Finding Advisor...");

          let advisor = null;

          const advisorName = cleanValue(firstRow.advisior_name);

          if (advisorName) {
            advisor = await Advisor.findOne({
              name: {
                $regex: new RegExp(`^${advisorName}$`, "i"),
              },
            });

            if (advisor) {
              console.log(`✅ Advisor Found: ${advisor.name}`);
            } else {
              console.log(`❌ Advisor Not Found: ${advisorName}`);
            }
          }

          // ======================================
          // FIND EMPLOYEE
          // ======================================

          console.log("🔍 Finding Employee...");

          let employee = null;

          const employeeName = cleanValue(firstRow.employee_name);

          if (employeeName) {
            employee = await Employee.findOne({
              name: {
                $regex: new RegExp(`^${employeeName}$`, "i"),
              },
            });

            if (employee) {
              console.log(`✅ Employee Found: ${employee.name}`);
            } else {
              console.log(`❌ Employee Not Found: ${employeeName}`);
            }
          }

          // ======================================
          // FIND BANKER
          // ======================================

          console.log("🔍 Finding Banker...");

          let banker = null;

          const bankerName = cleanValue(firstRow.banker_name);

          if (bankerName) {
            banker = await Banker.findOne({
              name: {
                $regex: new RegExp(`^${bankerName}$`, "i"),
              },
            });

            if (banker) {
              console.log(`✅ Banker Found: ${banker.name}`);
            } else {
              console.log(`❌ Banker Not Found: ${bankerName}`);
            }
          }

          // ======================================
          // REFERENCES
          // ======================================

          const references = [];

          if (cleanValue(firstRow.ref_1_name)) {
            references.push({
              name: cleanValue(firstRow.ref_1_name),
              mobileNo: cleanValue(firstRow.ref_1_mobile_no),
              address: cleanValue(firstRow.ref_1_address),
              relation: cleanValue(firstRow.ref_1_relation),
            });
          }

          if (cleanValue(firstRow.ref_2_name)) {
            references.push({
              name: cleanValue(firstRow.ref_2_name),
              mobileNo: cleanValue(firstRow.ref_2_mobile_no),
              address: cleanValue(firstRow.ref_2_address),
              relation: cleanValue(firstRow.ref_2_relation),
            });
          }

          console.log(`📌 References Added: ${references.length}`);

          // ======================================
          // DOCUMENTS
          // ======================================

          const documents = [];

          for (const row of leadRows) {
            if (
              cleanValue(row.attachment_type) ||
              cleanValue(row.file_content)
            ) {
              documents.push({
                attachmentType: cleanValue(row.attachment_type),
                fileUrl: cleanValue(row.file_content),
                password: cleanValue(row.attachment_password),
              });
            }
          }

          console.log(`📄 Documents Added: ${documents.length}`);

          // ======================================
          // HISTORY
          // ======================================

          const history = [];

          // First collect history
          for (const row of leadRows) {
            if (
              cleanValue(row.lead_feedback_type) ||
              cleanValue(row.remarks) ||
              cleanValue(row.entry_date_time)
            ) {
              history.push({
                feedback: cleanValue(row.lead_feedback_type),

                commentBy: cleanValue(row.employee_name),

                commentDate: parseDate(row.entry_date_time),

                remarks: cleanValue(row.remarks),

                replyDate: parseDate(row.reply_date_by_advisior),

                advisorReply: cleanValue(row.remarks_by_advisior),
              });
            }
          }

          // ======================================
          // SORT HISTORY BY DATE
          // OLD FIRST → LATEST LAST
          // ======================================

          history.sort((a, b) => {
            const dateA = a.commentDate ? new Date(a.commentDate).getTime() : 0;

            const dateB = b.commentDate ? new Date(b.commentDate).getTime() : 0;

            return dateA - dateB;
          });

          console.log(`📝 History Added: ${history.length}`);
          // ======================================
          // RUNNING LOANS
          // ======================================

          const runningLoans = [];

          for (let i = 1; i <= 4; i++) {
            if (
              cleanValue(firstRow[`loan_type_${i}`]) ||
              parseNumber(firstRow[`loan_amount_${i}`]) > 0
            ) {
              runningLoans.push({
                loanType: cleanValue(firstRow[`loan_type_${i}`]),
                loanAmount: parseNumber(firstRow[`loan_amount_${i}`]),
                bankName: cleanValue(firstRow[`bank_name_${i}`]),
                emiAmount: parseNumber(firstRow[`emi_amount_${i}`]),
                paidEmi: parseNumber(firstRow[`paid_emi_${i}`]),
              });
            }
          }

          console.log(`🏦 Running Loans Added: ${runningLoans.length}`);

          // ======================================
          // COMPANY DETAILS
          // ======================================

          const companyDetails = {
            companyName: cleanValue(firstRow.company_name),
            annualTurnover: parseNumber(firstRow.annual_turnover),
            companyAddress: cleanValue(firstRow.company_address),
            companyAddressTakenFrom: cleanValue(
              firstRow.company_address_taken_from,
            ),
            businessAge: cleanValue(firstRow.business_age),
            businessType: cleanValue(firstRow.business_type),
            natureOfBusiness: cleanValue(firstRow.nature_of_business),
            businessRegistrationProof: cleanValue(
              firstRow.business_registration_proof,
            ),
            noOfEmployees: parseNumber(firstRow.no_of_employees),
            businessPremises: cleanValue(firstRow.business_premises),
            howManyYearItrAvailable: cleanValue(
              firstRow.how_many_year_itr_available,
            ),
          };

          console.log("🏢 Company Details Added");

          // ======================================
          // SALARY DETAILS
          // ======================================

          const salaryDetails = {
            companyName: cleanValue(firstRow.company_name),
            designation: cleanValue(firstRow.designation),
            companyAddress: cleanValue(firstRow.company_address),
            netSalary: parseNumber(firstRow.net_salary),
            salaryTransferMode: cleanValue(firstRow.salary_transfer_mode),
            jobPeriod: cleanValue(firstRow.job_period),
            totalJobExperience: cleanValue(firstRow.total_job_experience),
            officialEmailId: cleanValue(firstRow.official_email_id),
            officialNumber: cleanValue(firstRow.official_number),
          };

          console.log("💼 Salary Details Added");

          // ======================================
          // CHECK EXISTING
          // ======================================

          console.log("🔍 Checking Existing Lead...");

          const existingLead = await Lead.findOne({
            leadNo: parseNumber(firstRow.lead_no),
          });

          if (existingLead) {
            console.log(`⚠️ Lead Already Exists: ${firstRow.lead_no}`);

            continue;
          }

          // ======================================
          // LEAD DATA
          // ======================================

          const leadData = {
            // BASIC DETAILS
            productType: cleanValue(firstRow.loan_type) || "Personal Loan",

            loanSavingAs: cleanValue(firstRow.loan_saving_as),

            creditCardApplyFor: cleanValue(firstRow.credit_card_apply_for),

            loanRequirementAmount: parseNumber(
              firstRow.loan_requirement_amount,
            ),

            leadNo: parseNumber(firstRow.lead_no),

            clientName: cleanValue(firstRow.client_name),

            mobileNo: String(cleanValue(firstRow.mobile_no) || ""),

            emailId: cleanValue(firstRow.email_id),

            dob: parseDate(firstRow.date_of_birth),

            panNo: cleanValue(firstRow.pan_no),

            aadharNo: cleanValue(firstRow.aadhar_no),

            maritalStatus: cleanValue(firstRow.marital_status),

            spouseName: cleanValue(firstRow.spouse_name),

            motherName: cleanValue(firstRow.mother_name),

            otherContactNo: cleanValue(firstRow.other_contact_no),

            qualification: cleanValue(firstRow.qualification),

            residenceType: cleanValue(firstRow.residance_type),

            residentialAddress: cleanValue(firstRow.residential_address),

            residentialAddressTakenFrom: cleanValue(
              firstRow.residential_address_taken_from,
            ),

            residentialStability: cleanValue(firstRow.residential_stability),

            stateId: parseNumber(firstRow.state_id),

            cityId: parseNumber(firstRow.city_id),

            pinCode: cleanValue(firstRow.pin_code),

            noOfDependent: parseNumber(firstRow.no_of_dependent),

            creditCardOutstandingAmount: parseNumber(
              firstRow.credit_card_outstanding_amount,
            ),

            // ARRAYS
            references,
            documents,
            history,
            runningLoans,

            // PROPERTY
            propertyType: cleanValue(firstRow.property_type),

            propertyMarketValue: parseNumber(firstRow.property_market_value),

            propertyTotalArea: cleanValue(firstRow.property_total_area),

            propertyAddress: cleanValue(firstRow.property_address),

            // CAR
            carName: cleanValue(firstRow.car_name),

            fuelType: cleanValue(firstRow.fuel_type),

            manufacturingYear: cleanValue(firstRow.manufacturing_year),

            carExShowroomPrice: parseNumber(firstRow.car_exshowroom_price),

            insuranceType: cleanValue(firstRow.insurance_type),

            // PERSONAL
            occupation: cleanValue(firstRow.occupation),

            nomineeName: cleanValue(firstRow.nominee_name),

            relationWithNominee: cleanValue(firstRow.relation_with_nominee),

            monthlyIncome: parseNumber(firstRow.monthly_income),

            salaryForCreditCard: parseNumber(firstRow.salary_for_credit_card),

            description: cleanValue(firstRow.client_description),

            // LOAN
            disbursalDate: parseDate(firstRow.disbursal_date),

            lanApplicationNo: cleanValue(firstRow.loan_account_no),

            dateOfLead: parseDate(firstRow.date_of_lead),

            // COMPANY DETAILS
            ...companyDetails,

            // SALARY DETAILS
            salaryDetails,

            // IDS
            allocatedTo: employee?._id || null,

            advisorId: advisor?._id || null,

            employeeId: employee?._id || null,

            bankerId: banker?._id || null,

            createdBy: employee?._id || null,

            updatedBy: employee?._id || null,
          };

          // ======================================
          // SAVE LEAD
          // ======================================

          console.log("💾 Saving Lead Into MongoDB...");

          await Lead.create(leadData);

          processed++;

          console.log(`✅ Lead Saved Successfully -> ${leadNo}`);

          console.log(`📈 Progress: ${processed}/${uniqueLeads.length}`);
        } catch (err) {
          console.log(`❌ Error Processing Lead No: ${leadNo}`);

          console.log(err);
        }
      }

      // ======================================
      // COMPLETED
      // ======================================

      console.log("\n======================================");
      console.log("🎉 MIGRATION COMPLETED");
      console.log(`✅ Total Leads Inserted: ${processed}`);
      console.log("======================================");

      process.exit();
    } catch (err) {
      console.log("❌ Migration Failed");
      console.log(err);

      process.exit(1);
    }
  });
