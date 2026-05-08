const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(session({
  secret: "rahasia_desa",
  resave: false,
  saveUninitialized: true
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
  username TEXT,
  password TEXT,
  role TEXT
)
`);

const passwordAdmin = bcrypt.hashSync("12345", 10);

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

const passwordOperator = bcrypt.hashSync("12345", 10);

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

app.post("/tambah", async (req, res) => {

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

    res.send("Berhasil tambah");

  } catch(err) {
    res.send(err);
  }

});

app.get("/data", async (req, res) => {

  const limit = parseInt(req.query.limit) || 50;

  try {

    const result = await pool.query(
      "SELECT * FROM warga LIMIT $1",
      [limit]
    );

    res.send(result.rows);

  } catch(err) {
    res.send(err);
  }

});

app.get("/lansia", async (req, res) => {

  try {

    const result = await pool.query(
      "SELECT * FROM warga WHERE lansia = $1",
      ["Ya"]
    );

    res.send(result.rows);

  } catch(err) {
    res.send(err);
  }

});

app.get("/hamil", async (req, res) => {
  try {

    const result = await pool.query(
      "SELECT * FROM warga WHERE hamil = $1",
      ["Ya"]
    );

    res.send(result.rows);

  } catch(err) {
    res.send(err);
  }
});

app.put("/update/:id", async (req, res) => {

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

    res.send("Berhasil diupdate");

  } catch(err) {
    res.send(err);
  }

});

app.delete("/hapus/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await pool.query("DELETE FROM warga WHERE id = $1", [id]);
    res.send("Data berhasil dihapus");
  } catch(err) {
    res.send(err);
  }
});

app.get("/search/:keyword", async (req, res) => {
  const keyword = req.params.keyword;

  try {
    const result = await pool.query(
      "SELECT * FROM warga WHERE nama ILIKE $1",
      ["%" + keyword + "%"]
    );
    res.send(result.rows);
  } catch(err) {
    res.send(err);
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

    res.send({
      message: "Login berhasil",
      role: user.role
    });

  } catch(err) {
    res.send(err);
  }

});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server jalan...");
});