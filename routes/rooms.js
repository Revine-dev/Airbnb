const express = require("express");
const router = express.Router();

const Room = require("../models/Room");
const User = require("../models/User");

const isAuthenticated = require("../middlewares/isAuthenticated");

/* Create room */
router.post("/room/publish", isAuthenticated, async (req, res) => {
  // dans cette route, on appelle le middleware "isAuthenticated" pour vérifier que l'utilisateur qui poste une annonce est présent en BDD
  if (
    req.fields.title &&
    req.fields.price &&
    req.fields.description &&
    req.fields.location
  ) {
    // on vérifie que le titre, le prix, la description et la localisation ont bien été renseignés
    try {
      const locationTab = [req.fields.location.lat, req.fields.location.lng];
      // on crée un tableau pour les données de localisation

      const newRoom = new Room({
        title: req.fields.title,
        description: req.fields.description,
        price: req.fields.price,
        location: locationTab,
        user: req.user._id,
        // dans la fonction "isAuthenticated", a été ajoutée la clé "user" à req ce qui permet ici de retrouver l'id de l'utilisateur qui publie une annonce
      });
      await newRoom.save();

      const user = await User.findById(req.user._id);
      // on recherche en BDD l'utilisateur' qui a posté l'annonce
      let tab = user.rooms;
      // on crée un tableau nommé "tab", équivalent au tableau contenant les références des annonces
      tab.push(newRoom._id);
      // on ajoute à ce tableau l'id de l'annonce qui vient d'être créée
      await User.findByIdAndUpdate(req.user._id, {
        rooms: tab,
      });
      // on modifie, en BDD, la clé "rooms" de l'utilisateur

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
  try {
    const rooms = await Room.find({}, { description: false }).populate({
      path: "user",
      select: "account",
    });
    // la fonction find() renvoie un tableau de tous les documents de la collection rooms
    // le premier paramètre est un objet vide, il signifie qu'il n'y a pas de filtres spécifiques à cette recherche
    // le deuxième paramètre est un objet dans lequel on précise quels champs ne doivent pas être retournés (ici, "description")
    // la fonction populate permet ici d'afficher les informations de l'utilisateur du champ "account"
    res.json(rooms);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* Get one room */
router.get("/rooms/:id", async (req, res) => {
  // ":id" permet de récupérer l'id d'une annonce passé en paramètre dans la route
  if (req.params.id) {
    try {
      const room = await Room.findById(req.params.id).populate({
        path: "user",
        select: "account",
      });
      // la fonction findById() permet de rechercher une annonce précise(à partir de son id)
      if (room) {
        // si une annonce a bien été trouvée en BDD
        res.json(room);
      } else {
        // si l'annonce n'a pas été trouvée : room = null
        res.json({ message: "Room not found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing room id" });
  }
});

/* Update room */
router.put("/room/update/:id", isAuthenticated, async (req, res) => {
  if (req.params.id) {
    // on vérifie que l'id de l'annonce est bien reçu
    try {
      const room = await Room.findById(req.params.id);
      // on recherche l'annonce en BDD grâce à son id
      if (room) {
        // si l'annonce existe bien en BDD

        const userId = req.user._id;
        // on récupère l'id de l'utilisateur stocké dans req.user grâce au middleware "isAuthenticated"
        const roomUserId = room.user;
        // on récupère l'id de l'utilisateur lié à cette annonce

        if (String(userId) === String(roomUserId)) {
          // on vérifie que l'utilisateur souhaitant modifier l'annonce est bien le propriétaire de l'annonce
          // on compare les 2 id (les "ObjectId" étant des objets, on les convertit en string)
          if (
            req.fields.title ||
            req.fields.price ||
            req.fields.description ||
            req.fields.location
          ) {
            // on vérifie qu'au moins une modification de l'annonce a été envoyée

            const newObj = {};
            // on crée un objet qui contiendra les modifications envoyées
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
            // on modifie l'annonce en lui passant newObj; ceci aura pour effet de ne modifier en BDD que les clés présentes dans newObj

            const roomUpdated = await Room.findById(req.params.id);
            // on recherche de nouveau l'annonce une fois toutes les modifications effectuées
            res.json(roomUpdated);
          } else {
            // si aucune modification de l'annonce n'a été envoyée
            res.status(400).json({ error: "Missing parameters" });
          }
        } else {
          // si celui qui modifie n'est pas le propriétaire de l'annonce
          res.status(401).json({ error: "Unauthorized" });
        }
      } else {
        // si l'annonce n'existe pas en BDD
        res.status(400).json({ error: "Room not found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    // si l'id de l'annonce n'a pas été renseigné
    res.status(400).json({ error: "Missing room id" });
  }
});

/* Delete room */
router.delete("/room/delete/:id", isAuthenticated, async (req, res) => {
  if (req.params.id) {
    try {
      const room = await Room.findById(req.params.id);
      if (room) {
        // si l'annonce existe bien en BDD

        const userId = req.user._id;
        // on récupère l'id de l'utilisateur stocké dans req.user grâce au middleware "isAuthenticated"
        const roomUserId = room.user;
        // on récupère l'id de l'utilisateur lié à l'annonce que l'on souhaite supprimer

        if (String(userId) === String(roomUserId)) {
          await Room.findByIdAndRemove(req.params.id);
          // on supprime l'annonce en BDD

          const user = await User.findById(userId);
          // on recherche l'utilisateur en BDD

          let tab = user.rooms;
          let num = tab.indexOf(req.params.id);
          tab.splice(num, 1);
          // on supprime du tableau "rooms" l'id de l'annonce qui vient d'être supprimée en BDD
          await User.findByIdAndUpdate(userId, {
            rooms: tab,
          });
          // on modifie "rooms" en BDD : l'annonce supprimée n'apparaitra plus dans le tableau des annonces de l'utilisateur

          res.status(200).json({ message: "Room deleted" });
        } else {
          // si celui qui supprime n'est pas le propriétaire de l'annonce
          res.status(401).json({ error: "Unauthorized" });
        }
      } else {
        // si l'annonce n'existe pas en BDD
        res.status(400).json({ error: "Room not found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing room id" });
  }
});

module.exports = router;
