// is file ki help se hum leads k andar store document download kr rhe h.



// import fs from "fs";
// import path from "path";
// import csv from "csv-parser";
// import axios from "axios";

// // ======================================
// // CONFIG
// // ======================================

// // CSV FILE
// const CSV_FILE =
//   "./migration_data/Lead_all_new_data.csv";

// // CONSTANT URL
// const BASE_URL =
//   "https://crm.loansahayak.com/attachments/other_docs/";

// // DOWNLOAD FOLDER
// const DOWNLOAD_FOLDER =
//   "./downloaded_files";

// // ======================================
// // CREATE ROOT FOLDER
// // ======================================

// if (!fs.existsSync(DOWNLOAD_FOLDER)) {
//   fs.mkdirSync(DOWNLOAD_FOLDER, {
//     recursive: true,
//   });
// }

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

// const sanitizeFolderName = (name) => {
//   return String(name)
//     .replace(/[<>:"/\\|?*]/g, "_")
//     .replace(/\s+/g, "_");
// };

// // ======================================
// // DOWNLOAD FUNCTION
// // ======================================

// const downloadFile = async (
//   url,
//   outputPath
// ) => {
//   const response = await axios({
//     method: "GET",
//     url,
//     responseType: "stream",
//     timeout: 30000,
//   });

//   const writer = fs.createWriteStream(
//     outputPath
//   );

//   response.data.pipe(writer);

//   return new Promise((resolve, reject) => {
//     writer.on("finish", resolve);

//     writer.on("error", reject);
//   });
// };

// // ======================================
// // READ CSV
// // ======================================

// console.log("📄 Reading CSV File...");

// fs.createReadStream(CSV_FILE)
//   .pipe(csv())
//   .on("data", (data) => {
//     rows.push(data);

//     if (rows.length % 500 === 0) {
//       console.log(
//         `📦 Loaded ${rows.length} rows`
//       );
//     }
//   })
//   .on("end", async () => {
//     console.log(
//       `\n✅ CSV Loaded Successfully`
//     );

//     console.log(
//       `📊 Total Rows: ${rows.length}`
//     );

//     let downloaded = 0;
//     let skipped = 0;

//     // ======================================
//     // PROCESS ROWS
//     // ======================================

//     for (const row of rows) {
//       try {
//         // ======================================
//         // GET VALUES
//         // ======================================

//         const leadNo =
//           cleanValue(row.lead_no);

//         const clientName =
//           cleanValue(row.client_name);

//         const fileName =
//           cleanValue(row.logical_file_name);

//         // ======================================
//         // SKIP IF NO FILE
//         // ======================================

//         if (!fileName) {
//           skipped++;
//           continue;
//         }

//         // ======================================
//         // CREATE URL
//         // ======================================

//         // Example:
//         // https://crm.loansahayak.com/attachments/other_docs/944_27.pdf

//         const fileUrl = `${BASE_URL}${fileName}`;

//         // ======================================
//         // CREATE LEAD FOLDER
//         // ======================================

//         const folderName = `${leadNo}_${sanitizeFolderName(
//           clientName || "Unknown_Client"
//         )}`;

//         const localFolder = path.join(
//           DOWNLOAD_FOLDER,
//           folderName
//         );

//         // ======================================
//         // CREATE FOLDER
//         // ======================================

//         if (!fs.existsSync(localFolder)) {
//           fs.mkdirSync(localFolder, {
//             recursive: true,
//           });
//         }

//         // ======================================
//         // OUTPUT PATH
//         // ======================================

//         const outputPath = path.join(
//           localFolder,
//           fileName
//         );

//         // ======================================
//         // SKIP IF ALREADY EXISTS
//         // ======================================

//         if (fs.existsSync(outputPath)) {
//           console.log(
//             `⚠️ Already Exists -> ${fileName}`
//           );

//           skipped++;
//           continue;
//         }

//         // ======================================
//         // DOWNLOAD
//         // ======================================

//         console.log(
//           `\n⬇️ Downloading -> ${fileName}`
//         );

//         console.log(
//           `📁 Folder -> ${folderName}`
//         );

//         console.log(`🔗 URL -> ${fileUrl}`);

//         await downloadFile(
//           fileUrl,
//           outputPath
//         );

//         downloaded++;

//         console.log(
//           `✅ Downloaded -> ${fileName}`
//         );
//       } catch (err) {
//         skipped++;

//         console.log(
//           `❌ Failed -> ${row.logical_file_name}`
//         );

//         console.log(
//           `Reason -> ${err.message}`
//         );
//       }
//     }

//     // ======================================
//     // DONE
//     // ======================================

//     console.log(
//       "\n======================================"
//     );

//     console.log(
//       "🎉 FILE DOWNLOAD COMPLETED"
//     );

//     console.log(
//       `✅ Downloaded: ${downloaded}`
//     );

//     console.log(`⚠️ Skipped: ${skipped}`);

//     console.log(
//       "======================================"
//     );

//     process.exit();
//   });


import fs from "fs";
import path from "path";
import csv from "csv-parser";
import axios from "axios";

// ======================================
// CONFIG
// ======================================

// CSV FILE
const CSV_FILE =
  "./migration_data/Lead_all_new_data.csv";

// MULTIPLE BASE URLS
const BASE_URLS = [
  "https://crm.loansahayak.com/attachments/other_docs/",
  "https://crm.loansahayak.com/attachments/aadhar_card/",
  "https://crm.loansahayak.com/attachments/pan_card/",
  "https://crm.loansahayak.com/attachments/salary_slip/",
  "https://crm.loansahayak.com/attachments/bank_statement/"
];

// DOWNLOAD FOLDER
const DOWNLOAD_FOLDER =
  "./downloaded_files";

// LOG FILE
const LOG_FILE =
  "./download_logs.txt";

// ======================================
// CREATE ROOT FOLDER
// ======================================

if (!fs.existsSync(DOWNLOAD_FOLDER)) {
  fs.mkdirSync(DOWNLOAD_FOLDER, {
    recursive: true,
  });
}

// ======================================
// CREATE LOG FILE
// ======================================

if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(
    LOG_FILE,
    "=========== DOWNLOAD LOGS ===========\n\n"
  );
}

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

const sanitizeFolderName = (name) => {
  return String(name)
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_");
};

// ======================================
// WRITE LOG
// ======================================

const writeLog = (message) => {
  fs.appendFileSync(
    LOG_FILE,
    `${new Date().toISOString()} - ${message}\n`
  );
};

// ======================================
// DOWNLOAD FUNCTION
// ======================================

const downloadFile = async (
  url,
  outputPath
) => {
  const response = await axios({
    method: "GET",
    url,
    responseType: "stream",
    timeout: 30000,
  });

  const writer = fs.createWriteStream(
    outputPath
  );

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);

    writer.on("error", reject);
  });
};

// ======================================
// READ CSV
// ======================================

console.log("📄 Reading CSV File...");

fs.createReadStream(CSV_FILE)
  .pipe(csv())
  .on("data", (data) => {
    rows.push(data);

    if (rows.length % 500 === 0) {
      console.log(
        `📦 Loaded ${rows.length} rows`
      );
    }
  })
  .on("end", async () => {
    console.log(
      `\n✅ CSV Loaded Successfully`
    );

    console.log(
      `📊 Total Rows: ${rows.length}`
    );

    let downloaded = 0;
    let skipped = 0;

    // ======================================
    // PROCESS ROWS
    // ======================================

    for (const row of rows) {
      try {
        // ======================================
        // GET VALUES
        // ======================================

        const leadNo =
          cleanValue(row.lead_no);

        const clientName =
          cleanValue(row.client_name);

        const fileName =
          cleanValue(row.logical_file_name);

        // ======================================
        // SKIP IF NO FILE
        // ======================================

        if (!fileName) {
          skipped++;

          writeLog(
            `SKIPPED | LeadNo: ${leadNo} | File: NULL | Reason: No file name`
          );

          continue;
        }

        // ======================================
        // CREATE LEAD FOLDER
        // ======================================

        const folderName = `${leadNo}_${sanitizeFolderName(
          clientName || "Unknown_Client"
        )}`;

        const localFolder = path.join(
          DOWNLOAD_FOLDER,
          folderName
        );

        // ======================================
        // CREATE FOLDER
        // ======================================

        if (!fs.existsSync(localFolder)) {
          fs.mkdirSync(localFolder, {
            recursive: true,
          });
        }

        // ======================================
        // OUTPUT PATH
        // ======================================

        const outputPath = path.join(
          localFolder,
          fileName
        );

        // ======================================
        // SKIP IF ALREADY EXISTS
        // ======================================

        if (fs.existsSync(outputPath)) {
          console.log(
            `⚠️ Already Exists -> ${fileName}`
          );

          skipped++;

          writeLog(
            `ALREADY EXISTS | LeadNo: ${leadNo} | File: ${fileName}`
          );

          continue;
        }

        // ======================================
        // TRY MULTIPLE URLS
        // ======================================

        let downloadedSuccessfully = false;

        for (const baseUrl of BASE_URLS) {
          try {
            const fileUrl = `${baseUrl}${fileName}`;

            console.log(
              `\n🔍 Trying -> ${fileUrl}`
            );

            await downloadFile(
              fileUrl,
              outputPath
            );

            downloaded++;

            downloadedSuccessfully = true;

            console.log(
              `✅ Downloaded -> ${fileName}`
            );

            console.log(
              `📁 Saved To -> ${outputPath}`
            );

            writeLog(
              `DOWNLOADED | LeadNo: ${leadNo} | File: ${fileName} | URL: ${fileUrl}`
            );

            break;
          } catch (err) {
            console.log(
              `❌ Not Found -> ${baseUrl}${fileName}`
            );
          }
        }

        // ======================================
        // FILE NOT FOUND ANYWHERE
        // ======================================

        if (!downloadedSuccessfully) {
          skipped++;

          console.log(
            `⚠️ File Not Found Anywhere -> ${fileName}`
          );

          writeLog(
            `FAILED | LeadNo: ${leadNo} | File: ${fileName} | Reason: File not found in any URL`
          );
        }
      } catch (err) {
        skipped++;

        console.log(
          `❌ Failed -> ${row.logical_file_name}`
        );

        console.log(
          `Reason -> ${err.message}`
        );

        writeLog(
          `ERROR | LeadNo: ${row.lead_no} | File: ${row.logical_file_name} | Reason: ${err.message}`
        );
      }
    }

    // ======================================
    // DONE
    // ======================================

    console.log(
      "\n======================================"
    );

    console.log(
      "🎉 FILE DOWNLOAD COMPLETED"
    );

    console.log(
      `✅ Downloaded: ${downloaded}`
    );

    console.log(`⚠️ Skipped: ${skipped}`);

    console.log(
      "======================================"
    );

    writeLog(
      `\nFINAL RESULT => Downloaded: ${downloaded} | Skipped: ${skipped}\n`
    );

    process.exit();
  });