import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      description: "The name of the product",
    },
    subProducts: [
      {
        type: String,
        description: "The sub product of the product",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      description: "The employee who created this product",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      description: "The Super Admin group this product belongs to",
    },
    isDefault: {
      type: Boolean,
      default: false,
      description:
        "Marks this product as default (cannot be updated or deleted)",
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
