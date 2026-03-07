const mongoose = require("mongoose");

const passportLocalMongoose = require("passport-local-mongoose").default || require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    email: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);