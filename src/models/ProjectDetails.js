const mongoose = require('mongoose')

const projectDetailsSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true
    },
    // Not required: internal projects (e.g. STP) have no public screenshots
    // or demo video, and the frontend only lists ReactNative/Flutter ones.
    picUrl: {
        type: String,
    },
    framework: {
        type: String,
        required: true
    },
    stateManagementSystem: {
        type: String,
        required: true
    },
    programmingLanguage: {
        type: String,
        required: true
    },
    version: {
        type: String,
    },
    videoUrl: {
        type: String,
    },
    role: {
        type: String,
    },
    status: {
        type: String,
        enum: ['live', 'internal', 'unpublished'],
    },
    downloads: {
        type: String, // as shown on the store, e.g. "50K+"
    },
    playStoreUrl: {
        type: String,
    },
    appStoreUrl: {
        type: String,
    },
    highlights: {
        type: [String],
        default: undefined,
    },
})

module.exports = mongoose.model("ProjectDetails", projectDetailsSchema)