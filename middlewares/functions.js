//const cloudinary = require("cloudinary").v2;

let options = {
  resultsPerPage: 5,
  message: {
    Unauthorized: 401,
    Forbidden: 403,
    "Not Found": 404,
  },
  validation: {
    allowedExts: ["gif", "jpeg", "jpg", "png", "svg", "blob"],
    allowedMimeTypes: [
      "image/gif",
      "image/jpeg",
      "image/pjpeg",
      "image/x-png",
      "image/png",
      "image/svg+xml",
    ],
  },
};

const fn = {
  getOption: (key) => {
    return options.hasOwnProperty(key) ? options[key] : false;
  },

  cloudinary: () => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return cloudinary;
  },

  isValidPicture: (picture) => {
    if (typeof picture !== "object" || !picture.size || !picture.type) {
      return false;
    } else if (
      picture.size <= 0 ||
      options.validation.allowedMimeTypes.indexOf(picture.type) === -1
    ) {
      return false;
    }
    return true;
  },

  jsonResponse: (response = "Access denied", result = true) => {
    if (response === "Unauthorized" || response === "Access denied") {
      result = false;
    }
    return result ? { response } : { error: response };
  },

  notFound: (res) => {
    return res.status(404).json(fn.jsonResponse("Page not found"));
  },

  accesDenied: (res, message = "Unauthorized") => {
    let status = 403;
    if (message === "Unauthorized") {
      status = 401;
    }
    return res.status(status).json(fn.jsonResponse(message));
  },

  error: (res, message = "An error has occured", status = 200) => {
    return res.status(status).json(fn.jsonResponse(message, false));
  },

  fatalError: (res, message = "An error has occured") => {
    return res.status(400).json(fn.jsonResponse(message, false));
  },

  isValidMail: (mail) => {
    var mailformat = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return mail.match(mailformat) ? true : false;
  },
};

module.exports = fn;
