const User = require("../models/users");
const fn = require("./functions");

const isAuthenticated = async (req, res, next) => {
  if (req.headers.authorization) {
    const user = await User.findOne({
      token: req.headers.authorization.replace("Bearer ", ""),
    }).select("account _id");

    if (!user) {
      return fn.accesDenied(res);
    } else {
      req.user = user;
      // On crée une clé "user" dans req. La route dans laquelle le middleware est appelé pourra avoir accès à req.user
      return next();
    }
  } else {
    return fn.accesDenied(res);
  }
};

module.exports = isAuthenticated;
