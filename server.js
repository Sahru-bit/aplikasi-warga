require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors({
  origin: "https://aplikasi-warga-production.up.railway.app",
  credentials: true
}));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query(`
CREATE TABLE IF NOT EXISTS warga (
  id SERIAL PRIMARY KEY,
  nama TEXT,
  nik TEXT,
  no_kk TEXT,
  alamat TEXT,
  jumlah_anggota INTEGER,
  status_rumah TEXT,
  pendidikan TEXT,
  kesehatan TEXT,
  agama TEXT,
  hamil TEXT,
  lansia TEXT,
  no_registrasi TEXT,
  dasawisma TEXT,
  jabatan_pkk TEXT
)
`);

pool.query(`
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT
)
`);

pool.query(`
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  username TEXT,
  role TEXT,
  aksi TEXT,
  target TEXT,
  waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`);

const passwordAdmin = bcrypt.hashSync(process.env.DEFAULT_ADMIN_PASSWORD, 10);

pool.query(
  `
  INSERT INTO users (username, password, role)
  SELECT $1, $2, $3
  WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = $1
  )
  `,
  ["admin", passwordAdmin, "admin"]
);

const passwordOperator = bcrypt.hashSync(process.env.DEFAULT_OPERATOR_PASSWORD, 10);

pool.query(
  `
  INSERT INTO users (username, password, role)
  SELECT $1, $2, $3
  WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = $1
  )
  `,
  ["operator", passwordOperator, "operator"]
);

app.post("/tambah", harusLogin, async (req, res) => {

  const {
    nama, nik, no_kk, alamat, jumlah_anggota,
    status_rumah, pendidikan, kesehatan,
    agama, hamil, lansia, no_registrasi, dasawisma, jabatan_pkk
  } = req.body;

  try {

    await pool.query(
      `
      INSERT INTO warga (
        nama, nik, no_kk, alamat, jumlah_anggota,
        status_rumah, pendidikan, kesehatan,
        agama, hamil, lansia, no_registrasi,
        dasawisma, jabatan_pkk
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,$12,
        $13,$14
      )
      `,
      [
        nama, nik, no_kk, alamat, jumlah_anggota,
        status_rumah, pendidikan, kesehatan,
        agama, hamil, lansia, no_registrasi,
        dasawisma, jabatan_pkk
      ]
    );

    await simpanLog(
    req.session.user.username,
   req.session.user.role,
   "tambah",
    nama
 );

    res.send("Berhasil tambah");

  } catch(err) {
    console.log(err);
    res.status(500).send("Server error");
  }

});

app.get("/data", harusLogin, async (req, res) => {

  const limit = parseInt(req.query.limit) || 50;

  try {

    const result = await pool.query(
      "SELECT * FROM warga LIMIT $1",
      [limit]
    );

    res.send(result.rows);

  } catch(err) {
    console.log(err);
    res.status(500).send("Server error");
  }

});

app.get("/lansia", harusLogin, async (req, res) => {

  try {

    const result = await pool.query(
      "SELECT * FROM warga WHERE lansia = $1",
      ["Ya"]
    );

    res.send(result.rows);

  } catch(err) {
    console.log(err);
    res.status(500).send("Server error");
  }

});

app.get("/hamil", harusLogin, async (req, res) => {
  try {

    const result = await pool.query(
      "SELECT * FROM warga WHERE hamil = $1",
      ["Ya"]
    );

    res.send(result.rows);

  } catch(err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

app.put("/update/:id", harusLogin, async (req, res) => {

  const id = req.params.id;

  const {
    nama, nik, no_kk, alamat, jumlah_anggota,
    status_rumah, pendidikan, kesehatan,
    agama, hamil, lansia,
    no_registrasi, dasawisma, jabatan_pkk
  } = req.body;

  try {

    await pool.query(
      `
      UPDATE warga
      SET
        nama=$1,
        nik=$2,
        no_kk=$3,
        alamat=$4,
        jumlah_anggota=$5,
        status_rumah=$6,
        pendidikan=$7,
        kesehatan=$8,
        agama=$9,
        hamil=$10,
        lansia=$11,
        no_registrasi=$12,
        dasawisma=$13,
        jabatan_pkk=$14
      WHERE id=$15
      `,
      [
        nama, nik, no_kk, alamat, jumlah_anggota,
        status_rumah, pendidikan, kesehatan,
        agama, hamil, lansia,
        no_registrasi, dasawisma, jabatan_pkk,
        id
      ]
    );

    await simpanLog(
      req.session.user.username,
      req.session.user.role,
      "update",
      nama
    );

    res.send("Berhasil diupdate");

  } catch(err) {

    console.log(err);

    res.status(500).send("Server error");

  }

});

app.delete("/hapus/:id",harusLogin, async (req, res) => {
  const id = req.params.id;
  const dataLama = await pool.query(
  "SELECT nama FROM warga WHERE id = $1",
  [id]
);

  await simpanLog(
    req.session.user.username,
    req.session.user.role,
    "hapus",
    dataLama.rows[0]?.nama || ("id " + id)
  );

  try {
    await pool.query("DELETE FROM warga WHERE id = $1", [id]);
    res.send("Data berhasil dihapus");
  } catch(err) {
    console.log(err);
res.status(500).send("Server error");
  }
});

app.get("/search/:keyword", harusLogin, async (req, res) => {
  const keyword = req.params.keyword;

  try {
    const result = await pool.query(
      "SELECT * FROM warga WHERE nama ILIKE $1",
      ["%" + keyword + "%"]
    );
    res.send(result.rows);
  } catch(err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

app.post("/login", async (req, res) => {

  const { username, password } = req.body;

  try {

    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).send("User tidak ditemukan");
    }

    const cocok = await bcrypt.compare(
      password,
      user.password
    );

    if (!cocok) {
      return res.status(401).send("Password salah");
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    await simpanLog(
     user.username,
      user.role,
     "login",
      "login sistem"
    );

    res.send({
      message: "Login berhasil",
      role: user.role
    });

  } catch(err) {
    console.log(err);
    res.status(500).send("Server error");
  }

});

app.get("/logs", harusLogin, async (req, res) => {

  // 🔒 hanya admin
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).send("Akses ditolak");
  }

  try {

    const result = await pool.query(
      `
      SELECT * FROM audit_logs
      ORDER BY waktu DESC
      LIMIT 100
      `
    );

    res.send(result.rows);

  } catch(err) {

    console.log(err);
    res.status(500).send("Server error");

  }

});

async function simpanLog(username, role, aksi, target) {

  try {

    await pool.query(
      `
      INSERT INTO audit_logs
      (username, role, aksi, target)
      VALUES ($1, $2, $3, $4)
      `,
      [username, role, aksi, target]
    );

  } catch(err) {

    console.log("Audit log error:", err);

  }

}

function hanyaAdmin(req, res, next) {

  if (!req.session.user) {
    return res.status(401).send("Harus login");
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).send("Akses ditolak");
  }

  next();

}

app.post("/tambah-user", hanyaAdmin, async (req, res) => {

  const { username, password, role } = req.body;

  try {

    const cek = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (cek.rows.length > 0) {
      return res.send("Username sudah dipakai");
    }

    if (role !== "admin" && role !== "operator") {
      return res.status(400).send("Role tidak valid");
    }

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      `
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, $3)
      `,
      [username, hash, role]
    );

    await simpanLog(
      req.session.user.username,
      req.session.user.role,
      "tambah user",
      username
    );

    res.send("User berhasil ditambah");

  } catch(err) {

    console.log(err);

    res.status(500).send("Server error");

  }

});

function harusLogin(req, res, next) {

  if (!req.session.user) {
    return res.status(401).send("Harus login");
  }

  next();

}

app.get("/users", hanyaAdmin, async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT id, username, role
      FROM users
      ORDER BY id DESC
      `
    );

    res.send(result.rows);

  } catch(err) {

    console.log(err);
    res.status(500).send("Server error");
  }

});

app.post("/logout", (req, res) => {

  req.session.destroy(() => {
    res.send("Logout berhasil");
  });

});

app.get("/me", harusLogin, (req, res) => {

  res.send({
    username: req.session.user.username,
    role: req.session.user.role
  });

});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server jalan...");
});