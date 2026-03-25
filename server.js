const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'quizforge'
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL Connected');
});

app.post('/signup', (req, res) => {
  const { name, email, password } = req.body;

  db.query(
    'INSERT INTO users (name,email,password) VALUES (?,?,?)',
    [name, email, password],
    (err) => {
      if (err) {
        res.json({ success: false });
      } else {
        res.json({ success: true });
      }
    }
  );
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query(
    'SELECT * FROM users WHERE email=? AND password=?',
    [email, password],
    (err, result) => {
      if (result.length > 0) {
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    }
  );
});

app.post('/save-result', (req, res) => {
  const { email, quiz_name, score } = req.body;

  db.query(
    'INSERT INTO results (email,quiz_name,score) VALUES (?,?,?)',
    [email, quiz_name, score],
    () => {
      res.json({ success: true });
    }
  );
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
})

