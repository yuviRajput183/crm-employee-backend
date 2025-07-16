import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    loginName: {
        type: String,
        required: true,
        unique: true,
        description: "The login name of the user"
    },
    password: {
        type: String,
        required: true,
        description: "The password of the user"
    },
    role: {
        type: String,
        enum: ["employee", 'advisor'],
        required: true,
        description: "The role of the user"
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "role",
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        description: "The employee who created this user"
    }
}, {
    timestamps: true
})

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;