import mongoose from "mongoose";

const serviceProviderSchema = new mongoose.Schema(
    {
        legalName: {
            type: String,
            required: [true, "Legal Name is required"],
            trim: true,
        },
        alias: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            enum: ["Proprietorship", "Partnership", "Private Limited", "Limited"],
            required: [true, "Type is required"],
        },
        address: {
            type: String,
            trim: true,
        },
        state: {
            type: String,
            trim: true,
        },
        stateCode: {
            type: String,
            trim: true,
        },
        gstin: {
            type: String,
            trim: true,
        },
        code: {
            type: String,
            trim: true,
        },
        billingFormat: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

const ServiceProvider = mongoose.model("ServiceProvider", serviceProviderSchema);

export default ServiceProvider;
