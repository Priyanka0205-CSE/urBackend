const mongoose = require('mongoose');

const developerSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    maxProjects: {
        type: Number,
        default: 1
    },
    refreshToken: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Developer', developerSchema);
