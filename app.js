const express = require("express");
const app = express();
const path = require('path');
const http = require("http");
const socketio = require("socket.io");

const server = http.createServer(app);
const io = socketio(server);

// Set the view engine to EJS
app.set("view engine", "ejs");

// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

// Handle socket connection
io.on("connection", function(socket) {
    console.log("A user connected:", socket.id);

    // Receive location and broadcast to all users
    socket.on("send-location", (data) => {
        io.emit("receive-location", { id: socket.id, ...data });
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        io.emit("user-disconnect", socket.id);
    });
});
app.get("/",(req,res)=>{
      res.render("landing");
})
// Serve the landing page
app.get("/map", function(req, res) {
    res.render('index');
});

// Start the server
server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
