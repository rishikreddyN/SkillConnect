const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  skill: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  level: {
    type: String,
    required: true
  },
    owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
   reviews:[
    {
      type: mongoose.Schema.Types.ObjectId,
      ref:"Review"
    }
  ]


});

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;