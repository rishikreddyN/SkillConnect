const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("../models/user");

module.exports = function(){

    // Local login
    passport.use(new LocalStrategy(User.authenticate()));

    // Google login
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 
process.env.NODE_ENV === "production"
? "https://skillconnect-5-aerx.onrender.com/auth/google/callback"
: "http://localhost:8080/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done)=>{

        let user = await User.findOne({ googleId: profile.id });

        if(!user){
            user = new User({
                username: profile.displayName,
                googleId: profile.id
            });

            await user.save();
        }

        return done(null, user);
    }
    ));

    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());

};