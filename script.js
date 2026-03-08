require("dotenv").config();

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const Listing = require("./models/listings");
const Review = require("./models/review");
const Request = require("./models/request");
const User = require("./models/user");
const Notification = require("./models/notification");

const path = require("path");
const methodOverride = require("method-override");

const passport = require("passport");
const initializePassport = require("./config/passport");

const session = require("express-session");
const flash = require("connect-flash");


// ------------------ Middleware ------------------

app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,"public")));

app.use(session({
    secret: "mysupersecret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

initializePassport();

app.use(flash());

app.use((req,res,next)=>{
    res.locals.currentUser = req.user || null;
    next();
});

app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});


// ------------------ View Engine ------------------

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// ------------------ Database ------------------

async function main(){
    await mongoose.connect(process.env.MONGO_URI);
}

main()
.then(()=>console.log("Database connected"))
.catch((err)=>console.log(err));


// ------------------ Server ------------------

app.listen(8080, ()=>{
    console.log("Server running on port 8080");
});


// ------------------ Google Auth ------------------

app.get("/auth/google",
passport.authenticate("google",{ scope:["profile","email"] })
);

app.get("/auth/google/callback",
passport.authenticate("google",{ failureRedirect:"/login" }),
(req,res)=>{
    res.redirect("/listings");
});


// ------------------ Home ------------------

app.get("/",(req,res)=>{
    res.render("home");
});


// ------------------ Authorization Middleware ------------------

function isLoggedIn(req,res,next){
    if(!req.isAuthenticated()){
        req.flash("error","You must be logged in");
        return res.redirect("/login");
    }
    next();
}

async function isOwner(req,res,next){

    if(!req.isAuthenticated()){
        req.flash("error","You must be logged in");
        return res.redirect("/login");
    }

    const { id } = req.params;

    const listing = await Listing.findById(id);

    if(!listing.owner.equals(req.user._id)){
        req.flash("error","You do not have permission");
        return res.redirect(`/listings/${id}`);
    }

    next();
}


// ------------------ Listings CRUD ------------------

app.get("/listings", isLoggedIn, async (req,res)=>{

    const allListings = await Listing.find({});

    res.render("listings/index",{ allListings });

});


app.get("/listings/new", isLoggedIn,(req,res)=>{
    res.render("listings/new");
});


app.post("/listings", isLoggedIn, async (req,res)=>{

    const newListing = new Listing(req.body);

    newListing.owner = req.user._id;

    await newListing.save();

    res.redirect("/listings");

});

app.get("/listings/:id", isLoggedIn, async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id)
    .populate("owner")
    .populate({
        path: "reviews",
        populate: { path: "author" }
    });

    const existingRequest = await Request.findOne({
        student: req.user._id,
        listing: id
    });

    res.render("listings/show", { listing, existingRequest }); // ✅ added

});


app.get("/listings/:id/edit", isLoggedIn, isOwner, async (req,res)=>{

    const { id } = req.params;

    const listing = await Listing.findById(id);

    res.render("listings/edit",{ listing });

});


app.put("/listings/:id", isLoggedIn, isOwner, async (req,res)=>{

    const { id } = req.params;

    await Listing.findByIdAndUpdate(id, req.body);

    res.redirect(`/listings/${id}`);

});


app.delete("/listings/:id", isLoggedIn, isOwner, async (req,res)=>{

    const { id } = req.params;

    await Listing.findByIdAndDelete(id);

    res.redirect("/listings");

});
//connections send
app.post("/listings/:id/connect", isLoggedIn, async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id).populate("owner");

    const existingRequest = await Request.findOne({
        student: req.user._id,
        listing: id
    });

    if (existingRequest) {
        req.flash("error", "Request already sent!");
        return res.redirect(`/listings/${id}`);
    }

    const newRequest = new Request({
        student: req.user._id,
        tutor: listing.owner._id,
        listing: id
    });

    await newRequest.save();

    const notification = new Notification({
        user: listing.owner._id,
        sender: req.user._id,
        listing: id,
        message: `${req.user.username} wants to connect with you`,
        link: `/listings/${id}`
    });

    await notification.save();

    req.flash("success", "Connection request sent!");

    res.redirect(`/listings/${id}`);
});

// ------------------ Notifications ------------------

app.get("/notifications", isLoggedIn, async (req, res) => {

    const notifications = await Notification.find({
        user: req.user._id
    })
    .populate("sender")
    .sort({ createdAt: -1 });

    res.render("notifications", { notifications }); // ✅ fixed

});

app.post("/notifications/:id/read", isLoggedIn, async (req, res) => {

    const { id } = req.params;

    await Notification.findByIdAndUpdate(id, { isRead: true });

    res.redirect("/notifications");

});

// accept
app.post("/notifications/:id/accept", isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findById(id);
        notification.status = "accepted";
        await notification.save();

        const updatedRequest = await Request.findOneAndUpdate(
            { listing: notification.listing, student: notification.sender },
            { status: "accepted" },
            { new: true }
        );

        console.log("Updated Request:", updatedRequest);

        res.redirect("/notifications");
    } catch(err) {
        console.error("Accept error:", err); // ← shows real error
        res.redirect("/notifications");
    }
});

// decline
app.post("/notifications/:id/decline", isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findById(id);
        notification.status = "declined";
        await notification.save();

        const updatedRequest = await Request.findOneAndUpdate(
            { listing: notification.listing, student: notification.sender },
            { status: "declined" },
            { new: true }
        );

        console.log("Updated Request:", updatedRequest);

        res.redirect("/notifications");
    } catch(err) {
        console.error("Decline error:", err); // ← shows real error
        res.redirect("/notifications");
    }
});
// ------------------ Reviews ------------------

app.post("/listings/:id/reviews", isLoggedIn, async (req,res)=>{

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

app.get("/login",(req,res)=>{
    res.render("details/login");
});

app.get("/signup",(req,res)=>{
    res.render("details/signup");
});


// Signup
app.post("/signup", async (req,res)=>{

    try{

        const { username,email,password } = req.body;

        const newUser = new User({
            username,
            email
        });

        await User.register(newUser,password);

        req.flash("success","Account created successfully! Please login.");

        res.redirect("/login");

    }
    catch(err){

        req.flash("error",err.message);

        res.redirect("/signup");

    }

});


// Login
app.post("/login",
passport.authenticate("local",{
    failureRedirect:"/login",
    failureFlash:true
}),
(req,res)=>{
    req.flash("success","Welcome back!");
    res.redirect("/listings");
});


// Logout
app.get("/logout",(req,res)=>{
    req.logout(function(err){
        if(err){ return next(err); }
        res.redirect("/");
    });
});