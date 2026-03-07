const mongoose = require("mongoose");
const Listing = require("../models/listings.js");
const { sampleListings } = require("./sample");


async function main() {
   await  mongoose.connect('mongodb://127.0.0.1:27017/SkillConnect');
}
main().then(()=>{
    console.log("database connected");
}).catch((err)=>{
    console.log(err);
})

async function initDB() {
  try {
    await Listing.deleteMany({});
    console.log("Old data deleted");

    await Listing.insertMany(sampleListings);
    console.log("Sample data inserted");
  } catch (err) {
    console.log(err);
  }
}

initDB();