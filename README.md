Overview

SkillConnect is a community-based platform where users can teach and learn skills from each other. Instead of paying for expensive courses, people can exchange their knowledge with others in the community.

Users can create profiles, list the skills they offer, connect with tutors, and leave reviews.

🚀 Features

🔐 User Authentication – Signup, login, and logout using Passport.js

👤 User Profiles – Each user can create a profile and offer skills

📚 Skill Listings – Users can post skills they want to teach

⭐ Ratings & Reviews – Learners can rate tutors and leave feedback

🔔 Notifications System – Users receive notifications for interactions

🛡️ Authorization – Only owners can edit or delete their listings

📱 Responsive UI – Works across desktop and mobile screens

🛠️ Tech Stack

Frontend

EJS

HTML5

CSS3

Bootstrap

Backend

Node.js

Express.js

Database

MongoDB

Mongoose

Authentication

Passport.js

Express Session

📂 Project Structure
SkillConnect
│
├── models
│   ├── user.js
│   ├── listing.js
│   ├── review.js
│   └── notification.js
│
├── views
│   ├── listings
│   ├── users
│   ├── notifications
│   └── includes
│
├── public
│   ├── css
│   └── images
│
├── script.js
└── package.json
⚙️ Installation & Setup
1️⃣ Clone the repository
git clone https://github.com/yourusername/SkillConnect.git
cd SkillConnect
2️⃣ Install dependencies
npm install
3️⃣ Setup MongoDB

Make sure MongoDB is running locally or use MongoDB Atlas.

Example connection:

mongoose.connect("mongodb://127.0.0.1:27017/SkillConnect")
4️⃣ Run the application
node script.js

Open in browser:

http://localhost:8080
📸 Demo

You can include screenshots of:

Homepage

Skill listing page

Tutor profile

Notifications page

(Add screenshots in GitHub later)

🎯 Future Improvements

Real-time chat between learners and tutors

Video call integration for online learning

Skill matching algorithm

Payment integration for premium tutoring

👨‍💻 Author

Rishik Reddy
B.Tech Computer Science Student

⭐ Contributing

Contributions are welcome. Feel free to fork this repository and submit pull requests.

📜 License

This project is licensed under the MIT License.

💡 Small tip for you (important for internships):
Add screenshots + deployment link (Render) in the README. Recruiters love seeing live projects.

If you want, I can also give you a 🔥 “GitHub README that looks like a 3rd-year developer built it” with:

badges

demo gif

project stats

better formatting

It will make your portfolio look much stronger.
