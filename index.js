import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./utils/db.js";
import errorHandler from "./middlewares/error.handler.js";
import authRoutes from "./routes/auth.route.js";
import employeeRoutes from "./routes/employee.route.js";
import userRoutes from "./routes/user.route.js";
import advisorRoutes from "./routes/advisor.route.js";
import departmentRoutes from "./routes/department.route.js";
import cityRoutes from "./routes/city.route.js";
import bankRoutes from "./routes/bank.route.js";
import bankerRoutes from "./routes/banker.route.js";
import processedByRoutes from "./routes/processedBy.route.js";
import payoutRoutes from "./routes/payout.route.js";
import sliderRoutes from "./routes/slider.route.js";
import leadRoutes from "./routes/lead.route.js";
import advisorPayoutRoutes from "./routes/advisorPayout.route.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const DATABASE_URL = process.env.DATABASE_URL || "";
connectDB(DATABASE_URL);


app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use('/uploads', express.static('uploads'));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/advisors', advisorRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/cities', cityRoutes);
app.use('/api/v1/banks', bankRoutes);
app.use('/api/v1/bankers', bankerRoutes);
app.use('/api/v1/processedBy', processedByRoutes);
app.use('/api/v1/payouts', payoutRoutes);
app.use('/api/v1/sliders', sliderRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/advisorPayouts', advisorPayoutRoutes);
// app.use('/api/v1/license', licenseRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


