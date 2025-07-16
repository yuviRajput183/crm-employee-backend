import mongoose from "mongoose";

const citySchema = new mongoose.Schema({
  stateName: {
    type: String,
    required: true,
    trim: true,
    description: "The name of the state"
  },
  cityName: {
    type: String,
    required: true,
    trim: true,
    description: "The name of the city"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
    description: "The employee who created this city"
  }
}, {
  timestamps: true
});

const City = mongoose.models.City || mongoose.model("City", citySchema);

export default City;
