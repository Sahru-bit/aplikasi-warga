const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(__dirname));

const db = new sqlite3.Database("data.db");

db.run(`
CREATE TABLE IF NOT EXISTS warga (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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

app.post("/tambah", (req, res) => {
  const {
    nama, nik, no_kk, alamat, jumlah_anggota,
    status_rumah, pendidikan, kesehatan,
    agama, hamil, lansia, no_registrasi, dasawisma, jabatan_pkk
  } = req.body;

  db.run(
    `INSERT INTO warga (
      nama, nik, no_kk, alamat, jumlah_anggota,
      status_rumah, pendidikan, kesehatan,
      agama, hamil, lansia, no_registrasi, dasawisma, jabatan_pkk
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nama, nik, no_kk, alamat, jumlah_anggota,
      status_rumah, pendidikan, kesehatan,
      agama, hamil, lansia, no_registrasi, dasawisma, jabatan_pkk
    ],
    function (err) {
      if (err) return res.send(err);
      res.send("Berhasil tambah");
    }
  );
});

app.get("/data", (req, res) => {
  const limit = req.query.limit || 50;

  db.all(
    "SELECT * FROM warga LIMIT ?",
    [limit],
    (err, rows) => {
      if (err) return res.send(err);
      res.send(rows);
    }
  );
});

app.get("/lansia", (req, res) => {
  db.all("SELECT * FROM warga WHERE lansia = 'Ya'", [], (err, rows) => {
    if (err) return res.send(err);
    res.send(rows);
  });
});

app.get("/hamil", (req, res) => {
  db.all("SELECT * FROM warga WHERE hamil = 'Ya'", [], (err, rows) => {
    if (err) return res.send(err);
    res.send(rows);
  });
});

app.put("/update/:id", (req, res) => {
  const id = req.params.id;

  const {
    nama, nik, no_kk, alamat, jumlah_anggota,
    status_rumah, pendidikan, kesehatan,
    agama, hamil, lansia, no_registrasi, dasawisma, jabatan_pkk
  } = req.body;

  db.run(
    `UPDATE warga 
     SET nama=?, nik=?, no_kk=?, alamat=?, jumlah_anggota=?, 
         status_rumah=?, pendidikan=?, kesehatan=?, 
         agama=?, hamil=?, lansia=?, no_registrasi=?, dasawisma=?, jabatan_pkk=? 
     WHERE id=?`,
    [
      nama, nik, no_kk, alamat, jumlah_anggota,
      status_rumah, pendidikan, kesehatan,
      agama, hamil, lansia, no_registrasi, dasawisma, jabatan_pkk,
      id
    ],
    function (err) {
      if (err) return res.send(err);
      res.send("Berhasil diupdate");
    }
  );
});

app.delete("/hapus/:id", (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM warga WHERE id = ?", [id], function (err) {
    if (err) return res.send(err);
    res.send("Data berhasil dihapus");
  });
});

app.get("/search/:keyword", (req, res) => {
  const keyword = req.params.keyword;

  db.all(
    "SELECT * FROM warga WHERE nama LIKE ?",
    ["%" + keyword + "%"],
    (err, rows) => {
      if (err) return res.send(err);
      res.send(rows);
    }
  );
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server jalan...");
});