import mongoose from 'mongoose';

const sliderSchema = new mongoose.Schema({
    slider1: {
        type: String,
        description: "First image shown into home page slider"
    },
    slider2: {
        type: String,
        description: "Second image shown into home page slider"
    },
    slider3: {
        type: String,
        description: "Third image shown into home page slider"
    },
    slider4: {
        type: String,
        description: "Fourth image shown into home page slider"
    },
    slider5: {
        type: String,
        description: "Fifth image shown into home page slider"
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        description: "The admin who created the slider"
    },
}, {
    timestamps: true
});

const Slider = mongoose.models.Slider || mongoose.model("Slider", sliderSchema);

export default Slider;