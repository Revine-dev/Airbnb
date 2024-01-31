const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

const Room = require("../models/Room");
const User = require("../models/User");

const isAuthenticated = require("../middlewares/isAuthenticated");
const noModification = require("../middlewares/noModification");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* Create room */
router.post("/room/publish", isAuthenticated, async (req, res) => {
  if (
    req.fields.title &&
    req.fields.price &&
    req.fields.description &&
    req.fields.location
  ) {
    try {
      const locationTab = [req.fields.location.lat, req.fields.location.lng];
      const newRoom = new Room({
        title: req.fields.title,
        description: req.fields.description,
        price: req.fields.price,
        location: locationTab,
        user: req.user._id,
      });
      await newRoom.save();

      const user = await User.findById(req.user._id);
      let tab = user.rooms;
      tab.push(newRoom._id);
      await User.findByIdAndUpdate(req.user._id, {
        rooms: tab,
      });
      res.json(newRoom);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing parameters" });
  }
});

/* Get rooms */
router.get("/rooms", async (req, res) => {
  const queryTab = Object.keys(req.query);

  try {
    if (queryTab.length > 0) {
      const createFilters = (req) => {
        const filters = {};

        if (req.query.title) {
          filters.title = new RegExp(req.query.title, "i");
        }

        if (req.query.priceMin) {
          filters.price = {};
          filters.price.$gte = req.query.priceMin;
        }

        if (req.query.priceMax) {
          if (filters.price) {
            filters.price.$lte = req.query.priceMax;
          } else {
            filters.price = {};
            filters.price.$lte = req.query.priceMax;
          }
        }

        return filters;
      };

      const filters = createFilters(req);

      const search = Room.find(filters, { description: false }).populate({
        path: "user",
        select: "account",
      });

      if (req.query.sort === "price-asc") {
        search.sort({ price: 1 });
      } else if (req.query.sort === "price-desc") {
        search.sort({ price: -1 });
      }

      if (req.query.page) {
        const page = Number(req.query.page);
        const limit = Number(req.query.limit);
        search.limit(limit).skip(limit * (page - 1));
      }

      const rooms = await search;

      res.json(rooms);
    } else {
      const rooms = await Room.find();

      if (rooms.length > 20) {
        const maxRooms = 20;

        let randomRooms = [];

        for (let i = 0; i < maxRooms; i++) {
          const randomNumber = Math.floor(Math.random() * rooms.length);

          if (randomRooms.indexOf(rooms[randomNumber]) === -1) {
            randomRooms.push(rooms[randomNumber]);
          }
        }
        res.json(randomRooms);
      } else {
        res.json(rooms);
      }
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* Get rooms around user */
router.get("/rooms/around", async (req, res) => {
  if (req.query.longitude && req.query.latitude) {
    try {
      const rooms = await Room.find({
        location: {
          $near: [req.query.latitude, req.query.longitude],
          $maxDistance: 0.1,
        },
      });

      res.json(rooms);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing location" });
  }
});

/* Get one room */
router.get("/rooms/:id", async (req, res) => {
  if (req.params.id) {
    try {
      const room = await Room.findById(req.params.id).populate({
        path: "user",
        select: "account",
      });
      if (room) {
        res.json(room);
      } else {
        res.json({ message: "Room not found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing room id" });
  }
});

/* Update room (except pictures) */
router.put(
  "/room/update/:id",
  [noModification, isAuthenticated],
  async (req, res) => {
    if (req.params.id) {
      try {
        const room = await Room.findById(req.params.id);

        if (room) {
          const userId = req.user._id;
          const roomUserId = room.user;

          if (String(userId) === String(roomUserId)) {
            if (
              req.fields.title ||
              req.fields.price ||
              req.fields.description ||
              req.fields.location
            ) {
              const newObj = {};

              if (req.fields.price) {
                newObj.price = req.fields.price;
              }
              if (req.fields.title) {
                newObj.title = req.fields.title;
              }
              if (req.fields.description) {
                newObj.description = req.fields.description;
              }
              if (req.fields.location) {
                newObj.location = [
                  req.fields.location.lat,
                  req.fields.location.lng,
                ];
              }

              await Room.findByIdAndUpdate(req.params.id, newObj);
              const roomUpdated = await Room.findById(req.params.id);
              res.json(roomUpdated);
            } else {
              res.status(400).json({ error: "Missing parameters" });
            }
          } else {
            res.status(401).json({ error: "Unauthorized" });
          }
        } else {
          res.status(400).json({ error: "Room not found" });
        }
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: "Missing room id" });
    }
  }
);

/* Upload one picture */
router.put(
  "/room/upload_picture/:id",
  [noModification, isAuthenticated],
  async (req, res) => {
    if (req.params.id) {
      if (req.files.picture) {
        try {
          const room = await Room.findById(req.params.id);

          if (room) {
            const roomUserId = room.user;

            if (String(roomUserId) === String(req.user._id)) {
              let tab = room.photos;

              if (tab.length < 5) {
                await cloudinary.uploader.upload(
                  req.files.picture.path,

                  async function (error, result) {
                    const newObj = {
                      url: result.secure_url,
                      picture_id: result.public_id,
                    };

                    tab.push(newObj);
                  }
                );

                await Room.findByIdAndUpdate(req.params.id, { photos: tab });

                const roomUpdated = await Room.findById(req.params.id);
                res.json(roomUpdated);
              } else {
                res
                  .status(400)
                  .json({ error: "Can't add more than 5 pictures" });
              }
            } else {
              res.status(401).json({ error: "Unauthorized" });
            }
          } else {
            res.status(400).json({ error: "Room not found" });
          }
        } catch (error) {
          res.status(400).json({ error: error.message });
        }
      } else {
        res.status(400).json({ error: "Missing parameters" });
      }
    } else {
      res.status(400).json({ error: "Missing room id" });
    }
  }
);

/* Delete one picture */
router.put(
  "/room/delete_picture/:id",
  [noModification, isAuthenticated],
  async (req, res) => {
    if (req.params.id) {
      try {
        if (req.fields.picture_id) {
          const room = await Room.findById(req.params.id);

          if (room) {
            const userId = req.user._id;
            const roomUserId = room.user;

            if (String(userId) === String(roomUserId)) {
              let picture_id = req.fields.picture_id;

              let tab = room.photos;

              let isPhoto = false;
              for (let y = 0; y < tab.length; y++) {
                if (tab[y].picture_id === picture_id) {
                  isPhoto = true;
                }
              }

              if (isPhoto === false) {
                res.status(400).json({ error: "Picture not found" });
              } else {
                for (let i = 0; i < tab.length; i++) {
                  if (tab[i].picture_id === picture_id) {
                    let num = tab.indexOf(tab[i]);
                    tab.splice(num, 1);

                    await cloudinary.uploader.destroy(picture_id);

                    await Room.findByIdAndUpdate(req.params.id, {
                      photos: tab,
                    });
                  }
                }
                res.status(200).json({ message: "Picture deleted" });
              }
            } else {
              res.status(401).json({ error: "Unauthorized" });
            }
          } else {
            res.status(400).json({ error: "Room not found" });
          }
        } else {
          res.status(400).json({ error: "Missing picture id" });
        }
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: "Missing room id" });
    }
  }
);

/* Delete room */
router.delete(
  "/room/delete/:id",
  [noModification, isAuthenticated],
  async (req, res) => {
    if (req.params.id) {
      try {
        const room = await Room.findById(req.params.id);
        if (room) {
          const userId = req.user._id;
          const roomUserId = room.user;
          if (String(userId) === String(roomUserId)) {
            const photosTab = room.photos;

            for (let i = 0; i < photosTab.length; i++) {
              let picture_id = photosTab[i].picture_id;
              await cloudinary.uploader.destroy(picture_id);
            }

            await Room.findByIdAndRemove(req.params.id);

            const user = await User.findById(userId);

            let tab = user.rooms;
            let num = tab.indexOf(req.params.id);
            tab.splice(num, 1);

            await User.findByIdAndUpdate(userId, {
              rooms: tab,
            });

            res.status(200).json({ message: "Room deleted" });
          } else {
            res.status(401).json({ error: "Unauthorized" });
          }
        } else {
          res.status(400).json({ error: "Room not found" });
        }
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: "Missing room id" });
    }
  }
);

module.exports = router;
