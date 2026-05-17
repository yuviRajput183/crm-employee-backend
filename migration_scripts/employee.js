import fs from "fs";
import mongoose from "mongoose";
import csv from "csv-parser";
import path from "path";
import { fileURLToPath } from "url";

import Employee from "./../models/Employee.model.js";
import Department from "./../models/Department.model.js";

// 🔧 __dirname fix
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// ✅ CONFIG
const MONGO_URI = "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project";

const CREATED_BY = new mongoose.Types.ObjectId("687259ef1da43932f4f4c961");
const GROUP_ID = new mongoose.Types.ObjectId("687259ef1da43932f4f4c961");
const OWNER_ID = new mongoose.Types.ObjectId("687259ef1da43932f4f4c961");

// ✅ File path
// const filePath = path.join(__dirname, "./migration_data/Employee_All_Details.csv");

// ✅ Connect DB
const connectDB = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB Connected");
};

// ✅ MAIN FUNCTION
const importEmployees = async () => {
  const employees = [];

  fs.createReadStream("./migration_data/Employee_All_Details.csv")
    .pipe(csv()) 
    .on("data", (row) => {
      const departmentName = row.department_name?.trim();
      const designation = row.designation_name?.trim();

      employees.push({
        name: row.employee_name?.trim(),
        email: row.email_id || null,
        mobile: row.mobile_no,
        address: row.communication_address || null,
        altContact: row.alternative_contact_no || null,
        photoUrl: null,

        departmentName, // temp field (remove later)
        designation,

        dateOfJoining: row.date_of_joining
          ? new Date(row.date_of_joining)
          : new Date(),

        reportingOfficerName: row.reporting_officer_name?.trim(), // temp

        dateOfResign: row.dor ? new Date(row.dor) : null,

        isActive: row.dor ? false : true,

        role:
          departmentName === "Admin Department" ? "admin" : "employee",

        isOwner: false,

        createdBy: CREATED_BY,
        groupId: GROUP_ID,
        ownerId: OWNER_ID,
      });
    })
    .on("end", async () => {
      try {
        console.log("Parsed employees:", employees.length);

        // 🔥 Step 1: Map Department Name → ObjectId
        const departments = await Department.find();
        const deptMap = {};

        departments.forEach((d) => {
          deptMap[d.name] = d._id;
        });

        // 🔥 Step 2: Insert Employees (without reportingOfficer)
        const insertedEmployees = [];

        for (const emp of employees) {
          const deptId = deptMap[emp.departmentName];

          if (!deptId) {
            console.warn("❌ Department not found:", emp.departmentName);
            continue;
          }

          const newEmp = await Employee.create({
            name: emp.name,
            email: emp.email,
            mobile: emp.mobile,
            address: emp.address,
            altContact: emp.altContact,
            photoUrl: emp.photoUrl,
            department: deptId,
            designation: emp.designation,
            dateOfJoining: emp.dateOfJoining,
            dateOfResign: emp.dateOfResign,
            isActive: emp.isActive,
            role: emp.role,
            isOwner: emp.isOwner,
            createdBy: emp.createdBy,
            groupId: emp.groupId,
            ownerId: emp.ownerId,
          });

          insertedEmployees.push({
            ...newEmp.toObject(),
            reportingOfficerName: emp.reportingOfficerName,
          });
        }

        console.log("✅ Employees inserted:", insertedEmployees.length);

        // 🔥 Step 3: Map Name → ObjectId (for reporting officer)
        const empMap = {};
        insertedEmployees.forEach((e) => {
          empMap[e.name] = e._id;
        });

        // 🔥 Step 4: Update reportingOfficer
        for (const emp of insertedEmployees) {
          const reportingId = empMap[emp.reportingOfficerName];

          if (!reportingId) continue;

          await Employee.updateOne(
            { _id: emp._id },
            { reportingOfficer: reportingId }
          );
        }

        console.log("🎉 Reporting officers updated successfully");

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

// ✅ Run
const run = async () => {
  await connectDB();
  await importEmployees();
};

run();