import mongoose from "mongoose";

const processedBySchema = new mongoose.Schema(
  {
    processedBy: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
  },
  { timestamps: true }
);

const ProcessedBy = mongoose.models.ProcessedBy || mongoose.model("ProcessedBy", processedBySchema);

export default ProcessedBy;
