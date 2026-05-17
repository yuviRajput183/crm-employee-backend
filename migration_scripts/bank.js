// import fs from "fs";
// import mongoose from "mongoose";
// import csv from "csv-parser";

// import Bank from "./../models/Bank.model.js";

// // ✅ CONFIG
// const MONGO_URI =
//   "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project";

// const CREATED_BY = new mongoose.Types.ObjectId("687259ef1da43932f4f4c961");

// // ✅ Connect DB
// const connectDB = async () => {
//   await mongoose.connect(MONGO_URI);
//   console.log("MongoDB Connected");
// };

// // ✅ MAIN FUNCTION
// const importBanks = async () => {
//   const banks = [];

//   fs.createReadStream("./migration_data/Bank.csv")
//     .pipe(csv())
//     .on("data", (row) => {
//       const name = row.bank_name?.trim();

//       if (!name) return;

//       banks.push({
//         name,
//         createdBy: CREATED_BY,
//       });
//     })
//     .on("end", async () => {
//       try {
//         console.log("Parsed banks:", banks.length);

//         let insertedCount = 0;
//         let updatedCount = 0;

//         for (const bank of banks) {
//           try {
//             const result = await Bank.findOneAndUpdate(
//               { name: bank.name }, // 🔥 unique key
//               { $setOnInsert: bank }, // only insert if not exists
//               { upsert: true, new: true }
//             );

//             if (result.createdAt.getTime() === result.updatedAt.getTime()) {
//               insertedCount++;
//             } else {
//               updatedCount++;
//             }
//           } catch (err) {
//             if (err.code === 11000) {
//               console.warn("⚠️ Duplicate skipped:", bank.name);
//             } else {
//               console.error("❌ Error:", err);
//             }
//           }
//         }

//         console.log(`✅ Inserted: ${insertedCount}`);
//         console.log(`🔁 Already existed: ${updatedCount}`);
//         console.log("🎉 Bank import completed");

//         process.exit(0);
//       } catch (err) {
//         console.error("❌ Fatal Error:", err);
//         process.exit(1);
//       }
//     })
//     .on("error", (err) => {
//       console.error("CSV Error:", err);
//     });
// };

// // ✅ Run
// const run = async () => {
//   await connectDB();
//   await importBanks();
// };

// run();

import fs from "fs";
import mongoose from "mongoose";
import csv from "csv-parser";

import Bank from "./../models/Bank.model.js";

// ✅ CONFIG
const MONGO_URI =
  "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project";

// 🔥 NEW createdBy
const NEW_CREATED_BY = new mongoose.Types.ObjectId(
  "69f5fd405cef60070d7e688a"
);

// ✅ Connect DB
const connectDB = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB Connected");
};

// ✅ MAIN FUNCTION
const updateBanks = async () => {
  const banks = [];

  fs.createReadStream("./migration_data/Bank.csv")
    .pipe(csv())
    .on("data", (row) => {
      const name = row.bank_name?.trim();
      if (!name) return;

      banks.push(name);
    })
    .on("end", async () => {
      try {
        console.log("Parsed banks:", banks.length);

        let updatedCount = 0;
        let notFoundCount = 0;

        for (const name of banks) {
          const result = await Bank.findOneAndUpdate(
            { name },
            {
              $set: {
                createdBy: NEW_CREATED_BY, // 🔥 always update
              },
            },
            { new: true }
          );

          if (result) {
            updatedCount++;
          } else {
            console.warn("❌ Bank not found:", name);
            notFoundCount++;
          }
        }

        console.log(`✅ Updated: ${updatedCount}`);
        console.log(`❌ Not found: ${notFoundCount}`);
        console.log("🎉 Bank update completed");

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
  await updateBanks();
};

run();