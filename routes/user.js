const express = require("express");
const router = express.Router();
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const fn = require("../middlewares/functions");

const User = require("../models/user");

router.post("/user/signup", async (req, res) => {
  const { email, password, username, name, description } = req.fields;

  if (email && password && username && name && description) {
    if (!username.match(/[A-Za-z]/) || !name.match(/[A-Za-z]/)) {
      return fn.error(res, "Username or name format is not valid.", 400);
    } else if (!fn.isValidMail(email)) {
      return fn.error(res, "Email is not valid.", 400);
    }

    try {
      const salt = uid2(16);
      const hash = SHA256(password + salt).toString(encBase64);
      const token = uid2(16);
      const isUser = await User.findOne({ email });

      if (isUser) {
        return fn.error(res, "Sorry, this email is already taken.");
      }

      const newUser = await User.create({
        email,
        account: {
          username,
          name,
          description,
        },
        token,
        hash,
        salt,
      });
      return res.json({
        _id: newUser._id,
        token: newUser.token,
        email,
        username,
        description,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  res.status(400, "Missing parameters");
});

router.post("/user/log_in", async (req, res) => {
  const { email, password } = req.fields;

  if (email && password) {
    try {
      if (!fn.isValidMail(email)) {
        return fn.error(res, "Email is not valid.", 400);
      }
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const hash = SHA256(password + user.salt).toString(encBase64);
      if (hash === user.hash) {
        return res.json({
          _id: user._id,
          token: user.token,
          email: user.email,
          username: user.account.username,
          description: user.account.username,
        });
      } else {
        return res.status(401).json({ error: "Unauthorized" });
      }
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
  res.status(400).json({ error: "Unavailable" });
});

module.exports = router;
