require("dotenv").config();

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const Listing = require("./models/listings");

const Review = require("./models/review");

const path = require("path");
const methodOverride = require("method-override");

const passport = require("passport");
const initializePassport = require("./config/passport");

const session = require("express-session");

const flash = require("connect-flash");

// ------------------ Middleware ------------------

app.use(methodOverride("_method"));

app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "mysupersecret",
    resave: false,
    saveUninitialized: false
}));

app.use(flash());

app.use((req,res,next)=>{
    res.locals.currentUser = req.user;
    next();
});

app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});

app.use(passport.initialize());
app.use(passport.session());

initializePassport();


// ------------------ View Engine ------------------

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// ------------------ Database ------------------

async function main() {
    await mongoose.connect("mongodb://127.0.0.1:27017/SkillConnect");
}

main()
.then(() => {
    console.log("Database connected");
})
.catch((err) => {
    console.log(err);
});


// ------------------ Server ------------------

app.listen(8080, () => {
    console.log("Server running on port 8080");
});


// ------------------ Google Auth ------------------

app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
);

app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        res.redirect("/listings");
    }
);


// ------------------ Home ------------------

app.get("/", (req, res) => {
    res.render("home");
});


// ------------------ Authorization Middleware ------------------

async function isOwner(req,res,next){

    const { id } = req.params;

    const listing = await Listing.findById(id);

    if(!listing.owner.equals(req.user._id)){
        req.flash("error","You do not have permission");
        return res.redirect(`/listings/${id}`);
    }

    next();
}

function isLoggedIn(req,res,next){
    if(!req.isAuthenticated()){
        req.flash("error","You must be logged in");
        return res.redirect("/login");
    }
    next();
}

// ------------------ Listings CRUD ------------------

// Show all listings
app.get("/listings",isLoggedIn, async (req, res) => {

    const allListings = await Listing.find({});

    res.render("listings/index", { allListings });

});


// Create form
app.get("/listings/new", isLoggedIn, (req, res) => {
    res.render("listings/new");
});


// Create listing
app.post("/listings",  isLoggedIn,async (req, res) => {

    const newListing = new Listing(req.body);

    newListing.owner = req.user._id;

    await newListing.save();

    res.redirect("/listings");

});

//show route
app.get("/listings/:id", isLoggedIn, async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id)
        .populate("owner")
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            }
        });

    res.render("listings/show", { listing });

});


// Edit form
app.get("/listings/:id/edit", isOwner, async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id);

    res.render("listings/edit", { listing });

});


// Update listing
app.put("/listings/:id", isOwner, async (req, res) => {

    const { id } = req.params;

    await Listing.findByIdAndUpdate(id, req.body);

    res.redirect(`/listings/${id}`);

});

const Request = require("./models/request");

app.post("/listings/:id/connect", isLoggedIn, async (req,res)=>{

    const { id } = req.params;

    const listing = await Listing.findById(id);

    const newRequest = new Request({
        student:req.user._id,
        tutor:listing.owner,
        listing:id
    });

    await newRequest.save();

    req.flash("success","Connection request sent!");

    res.redirect(`/listings/${id}`);

});

// Delete listing
app.delete("/listings/:id", isOwner, async (req, res) => {

    const { id } = req.params;

    await Listing.findByIdAndDelete(id);

    res.redirect("/listings");

});

app.post("/listings/:id/reviews", async (req,res)=>{

    const { id } = req.params;

    const listing = await Listing.findById(id);

    const newReview = new Review(req.body);

    newReview.author = req.user._id;


    await newReview.save();

    listing.reviews.push(newReview);

    await listing.save();

    res.redirect(`/listings/${id}`);

});
// ------------------ Auth Pages ------------------

app.get("/login", (req, res) => {
    res.render("details/login");
});

app.get("/signup", (req, res) => {
    res.render("details/signup");
});

const User = require("./models/user");

app.post("/signup", async (req, res) => {

    try {

        const { username, email, password } = req.body;

        const newUser = new User({
            username,
            email
        });

        await User.register(newUser, password);

        req.flash("success", "Account created successfully! Please login.");

        res.redirect("/login");

    } catch (err) {

        req.flash("error", err.message);

        res.redirect("/signup");

    }

});


app.post("/login",
passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true
}),
(req,res)=>{
    req.flash("success","Welcome back!");
    res.redirect("/listings");
});


app.get("/logout",(req,res)=>{
    req.logout(function(err){
        if(err){
            return next(err);
        }
        res.redirect("/");
    });
});