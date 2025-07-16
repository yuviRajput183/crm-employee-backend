import mongoose from "mongoose";

export const connectDB = (DATABASE_URL) => {
    mongoose.connect(DATABASE_URL,{
        dbName: "loan-project",
    })
    .then((c)=> console.log(`DB Connected to ${c.connection.host}`))
    .catch((e) => console.log(e));
};