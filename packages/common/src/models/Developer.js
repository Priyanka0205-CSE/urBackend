const mongoose = require('mongoose');

const developerSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        select: false
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
        default: null,
        select: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Developer', developerSchema);
