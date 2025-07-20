import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true,
        trim: true,
        description: "Name of the file"
    },
    filePath: {
        type: String,
        required: true,
        description: "Path of the file"
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        description: "The admin who created the payout"
    }
}, {
    timestamps: true
})

const Payout = mongoose.models.Payout || mongoose.model("Payout", payoutSchema);

export default Payout;