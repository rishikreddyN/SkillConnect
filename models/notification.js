const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    user: {                 // who receives notification
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required:true
    },
    
    sender: {               // who sent request
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required:true
    },

    listing: {              // which tutor listing
        type: mongoose.Schema.Types.ObjectId,
        ref: "Listing"
    },

    message: String,

    link: String,

    isRead: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    status:{
    type:String,
    enum:["pending","accepted","declined"],
    default:"pending"
}
});

module.exports = mongoose.model("Notification", notificationSchema);