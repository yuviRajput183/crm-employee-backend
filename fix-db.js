import mongoose from "mongoose";
import AccountLead from "./models/AccountLead.model.js";

const DATABASE_URL = "mongodb+srv://yuvrajrajput091102_db_user:I13Lkoaj1sdvVAo3@loansahayak.5yesqu2.mongodb.net/test"; // Add db name if necessary, I'll try test and then loan-project

async function fix() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(DATABASE_URL);
    console.log("Connected.");
    
    const id = "6ac9cf9b346d018ab4c33e14";
    const doc = await AccountLead.findById(id);
    if (!doc) {
      console.log("Document not found in 'test' db. Let's try 'loan-project' db.");
      await mongoose.disconnect();
      await mongoose.connect("mongodb+srv://yuvrajrajput091102_db_user:I13Lkoaj1sdvVAo3@loansahayak.5yesqu2.mongodb.net/loan-project");
      const doc2 = await AccountLead.findById(id);
      if (!doc2) {
         console.log("Document not found in 'loan-project' db either.");
         return;
      }
      console.log("Found document:", doc2.caseName, doc2.lanApplicationNo, "Status:", doc2.status);
      doc2.status = "In Progress";
      await doc2.save({ validateBeforeSave: false }); // Bypass validators if needed
      console.log("Updated status to 'In Progress'.");
    } else {
      console.log("Found document:", doc.caseName, doc.lanApplicationNo, "Status:", doc.status);
      doc.status = "In Progress";
      await doc.save({ validateBeforeSave: false }); // Bypass validators if needed
      console.log("Updated status to 'In Progress'.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

fix();
