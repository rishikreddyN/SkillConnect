require("dotenv").config();

const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server);

const mongoose = require("mongoose");
const Listing = require("./models/listings");
const Review = require("./models/review");
const Request = require("./models/request");
const User = require("./models/user");
const Notification = require("./models/notification");
const Message = require("./models/message");

const path = require("path");
const methodOverride = require("method-override");

const passport = require("passport");
const initializePassport = require("./config/passport");

const session = require("express-session");
const flash = require("connect-flash");


// ------------------ Middleware ------------------

app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const sessionMiddleware = session({
    secret: "mysupersecret",
    resave: false,
    saveUninitialized: false
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

initializePassport();

app.use(flash());

app.use((req, res, next) => {
    res.locals.currentUser = req.user || null;
    next();
});

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});


// ------------------ View Engine ------------------

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// ------------------ Database ------------------

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
}

main()
    .then(() => console.log("Database connected"))
    .catch((err) => console.log(err));


// ------------------ Server ------------------

server.listen(8080, () => {
    console.log("Server running on port 8080");
});


// ------------------ Socket.io ------------------

// Share session with socket.io
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

io.on("connection", (socket) => {

    socket.on("joinRoom", (roomId) => {
        socket.join(roomId);
    });

    socket.on("sendMessage", async (data) => {
        const { senderId, receiverId, listingId, content, roomId } = data;

        const message = new Message({
            sender: senderId,
            receiver: receiverId,
            listing: listingId,
            content
        });

        await message.save();

        const populatedMessage = await Message.findById(message._id).populate("sender", "username");

        io.to(roomId).emit("receiveMessage", {
            content: populatedMessage.content,
            sender: populatedMessage.sender.username,
            senderId: populatedMessage.sender._id,
            createdAt: populatedMessage.createdAt
        });
    });

});


// ------------------ Google Auth ------------------

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
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

function isLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        req.flash("error", "You must be logged in");
        return res.redirect("/login");
    }
    next();
}

async function isOwner(req, res, next) {
    if (!req.isAuthenticated()) {
        req.flash("error", "You must be logged in");
        return res.redirect("/login");
    }

    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing.owner.equals(req.user._id)) {
        req.flash("error", "You do not have permission");
        return res.redirect(`/listings/${id}`);
    }

    next();
}


// ------------------ Listings CRUD ------------------

app.get("/listings", isLoggedIn, async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index", { allListings });
});

app.get("/listings/new", isLoggedIn, (req, res) => {
    res.render("listings/new");
});

app.post("/listings", isLoggedIn, async (req, res) => {
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

    res.render("listings/show", { listing, existingRequest });
});

app.get("/listings/:id/edit", isLoggedIn, isOwner, async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit", { listing });
});

app.put("/listings/:id", isLoggedIn, isOwner, async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndUpdate(id, req.body);
    res.redirect(`/listings/${id}`);
});

app.delete("/listings/:id", isLoggedIn, isOwner, async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/listings");
});


// ------------------ Connect ------------------

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

    res.render("notifications", { notifications });
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
    } catch (err) {
        console.error("Accept error:", err);
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
    } catch (err) {
        console.error("Decline error:", err);
        res.redirect("/notifications");
    }
});


// ------------------ Chat ------------------

// List all chats for current user
app.get("/chats", isLoggedIn, async (req, res) => {
    // Find all accepted requests involving current user
    const requests = await Request.find({
        $or: [
            { student: req.user._id, status: "accepted" },
            { tutor: req.user._id, status: "accepted" }
        ]
    })
        .populate("student", "username")
        .populate("tutor", "username")
        .populate("listing", "name skill");

    res.render("chats/index", { requests });
});

// Open a specific chat
app.get("/chats/:requestId", isLoggedIn, async (req, res) => {
    const { requestId } = req.params;

    const request = await Request.findById(requestId)
        .populate("student", "username")
        .populate("tutor", "username")
        .populate("listing", "name skill");

    if (!request) {
        req.flash("error", "Chat not found");
        return res.redirect("/chats");
    }

    // Make sure current user is part of this chat
    const isParticipant =
        request.student._id.equals(req.user._id) ||
        request.tutor._id.equals(req.user._id);

    if (!isParticipant) {
        req.flash("error", "You do not have access to this chat");
        return res.redirect("/chats");
    }

    // Get chat partner
    const chatPartner = request.student._id.equals(req.user._id)
        ? request.tutor
        : request.student;

    // Load previous messages
    const messages = await Message.find({
        listing: request.listing._id,
        $or: [
            { sender: req.user._id, receiver: chatPartner._id },
            { sender: chatPartner._id, receiver: req.user._id }
        ]
    })
        .populate("sender", "username")
        .sort({ createdAt: 1 });

    res.render("chats/show", {
        request,
        chatPartner,
        messages,
        currentUser: req.user
    });
});


// ------------------ Reviews ------------------

app.post("/listings/:id/reviews", isLoggedIn, async (req, res) => {
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

// Signup
app.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const newUser = new User({ username, email });

        await User.register(newUser, password);

        req.flash("success", "Account created successfully! Please login.");
        res.redirect("/login");

    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/signup");
    }
});

// Login
app.post("/login",
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true
    }),
    (req, res) => {
        req.flash("success", "Welcome back!");
        res.redirect("/listings");
    }
);

// Logout
app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect("/");
    });
});