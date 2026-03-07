const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({

    rating:{
        type:Number,
        min:1,
        max:5
    },

    comment:{
        type:String,
        required:true
    },

    author:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User"
    },

    createdAt:{
        type:Date,
        default:Date.now
    }

});

module.exports = mongoose.model("Review", reviewSchema);