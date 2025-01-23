const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    delivered: {
        type: Boolean,
        default: false,
    },
    read: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const Messages = mongoose.model('MessagesSchema', messageSchema)

module.exports = Messages;