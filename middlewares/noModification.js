const usersId = [
  "58ff73cc1765a998979a3390",
  "58ff73cc1765a998979a338c",
  "58ff73cc1765a998979a338d",
  "58ff73cc1765a998979a338e",
  "58ff73cc1765a998979a338f",
];

const roomsId = [
  "58ff73d11765a998979a3396",
  "58ff73d11765a998979a3397",
  "58ff73d11765a998979a33a0",
  "58ff73cc1765a99897945391",
  "58ff73cc1765a9979391c532",
];

const noModification = async (req, res, next) => {
  const id = req.params.id;

  if (usersId.indexOf(id) !== -1) {
    return res
      .status(400)
      .json({ error: "You can't modify or delete this user !" });
  } else if (roomsId.indexOf(id) !== -1) {
    return res
      .status(400)
      .json({ error: "You can't modify or delete this room !" });
  } else {
    return next();
  }
};

module.exports = noModification;
