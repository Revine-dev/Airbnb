const express = require("express");
const formidableMiddleware = require("express-formidable");
const app = express();
const cors = require("cors");
app.use(formidableMiddleware());
app.use(cors());
const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const signRoutes = require("./routes/user");
const roomRoutes = require("./routes/rooms");
app.use(signRoutes);
app.use(roomRoutes);

app.all("/", function (req, res) {
  res.json({ message: "Welcome to Airbnb Application !" });
});

app.all("*", function (req, res) {
  res.status(404).json({ error: "Ressource not found" });
});

app.listen(process.env.PORT, () => {
  console.log("Server started");
});
