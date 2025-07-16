import mongoose from "mongoose";

const bankSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        description: "Name of the bank"
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        description: "The admin who created the bank entry"
    }
}, {
    timestamps: true
})

const Bank = mongoose.models.Bank || mongoose.model("Bank", bankSchema);

export default Bank;