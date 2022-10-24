const Sequelize = require("sequelize");
const JWT = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { STRING } = Sequelize;
const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

Note.belongsTo(User);
User.hasMany(Note);

User.byToken = async (token) => {
  try {
    const payload = JWT.verify(token, process.env.JWT);
    const user = await User.findByPk(payload.id);
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, 5);
});

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  if (user) {
    return JWT.sign({ id: user.id }, process.env.JWT);
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

User.getNotes = async (id) => {
  const user = await User.findByPk(id);
  if (user) {
    return user.getNotes();
  }
  const error = Error("Cant get notes");
  error.status = 401;
  throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const notes = [
    {
      text: "Lorem ipsum dolor sit amet, eu quo consetetur voluptatum, eu iusto posidonium adversarium sea, cum cibo persius facilis at. Ius recteque posidonium te",
    },
    {
      text: "Lorem ipsum dolor sit amet, eu quo consetetur voluptatum, eu iusto posidonium adversarium sea, cum cibo persius facilis at. Ius recteque posidonium te",
    },
    {
      text: "Lorem ipsum dolor sit amet, eu quo consetetur voluptatum, eu iusto posidonium adversarium sea, cum cibo persius facilis at. Ius recteque posidonium te",
    },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  const [text1, text2, text3] = await Promise.all(
    notes.map((note) => Note.create(note))
  );
  lucy.setNotes(text1);
  moe.setNotes(text2);
  larry.setNotes(text3);
  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
