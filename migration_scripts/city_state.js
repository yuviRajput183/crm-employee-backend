import fs from "fs";
import mongoose from "mongoose";
import csv from "csv-parser";

import City from "./../models/City.model.js";

// ✅ CONFIG
const MONGO_URI =
  "mongodb+srv://thunderyuvi911:Rajput11@cluster0.zydhdyp.mongodb.net/loan-project";

const CREATED_BY = new mongoose.Types.ObjectId("69f5fd405cef60070d7e688a");

// ✅ Connect DB
const connectDB = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB Connected");
};

// ✅ Helper: clean string
const clean = (val) => {
  if (!val) return null;
  return val.replace(/"/g, "").trim();
};

// ✅ MAIN FUNCTION
const importCities = async () => {
  const cities = [];

  fs.createReadStream("./migration_data/City_State_details.csv")
    .pipe(
      csv({
        headers: ["city_id", "city_name", "state_id", "state_name"],
        skipLines: 0,
      })
    )
    .on("data", (row) => {
      const cityName = clean(row.city_name);
      const stateName = clean(row.state_name);

      if (!cityName || !stateName) return;

      cities.push({
        cityName,
        stateName,
      });
    })
    .on("end", async () => {
      try {
        console.log("Parsed cities:", cities.length);

        let inserted = 0;

        for (const city of cities) {
          await City.updateOne(
            {
              cityName: city.cityName,
              stateName: city.stateName, // 🔥 avoid duplicates combo
            },
            {
              $set: {
                cityName: city.cityName,
                stateName: city.stateName,
                createdBy: CREATED_BY,
              },
            },
            { upsert: true }
          );

          inserted++;
        }

        console.log("✅ Cities inserted/updated:", inserted);

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
  await importCities();
};

run();