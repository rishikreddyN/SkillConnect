
const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({

    student:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User"
    },

    tutor:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User"
    },

    listing:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Listing"
    },

    status:{
        type:String,
        default:"pending"
    }

});

module.exports = mongoose.model("Request",requestSchema);