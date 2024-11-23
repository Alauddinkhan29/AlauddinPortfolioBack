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
    picUrl: {
        type: String,
        required: true
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
        required: true
    },
    videoUrl: {
        type: String,
        required: true
    },
})

module.exports = mongoose.model("ProjectDetails", projectDetailsSchema)