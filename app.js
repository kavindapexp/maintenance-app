const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Connects to the PostgreSQL container inside Kubernetes
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres-service',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'maintenancedb',
  port: 5432,
});

// Serve the web form
app.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM maintenance_logs ORDER BY id DESC');
    let logItems = rows.map(r => `<li>[${r.status}] ${r.title}</li>`).join('');
    
    res.send(`
      <h2>Maintenance Log Entry</h2>
      <form action="/add" method="POST">
        <input type="text" name="title" placeholder="Log Title" required />
        <select name="status">
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <button type="submit">Add Log</button>
      </form>
      <h3>Existing Logs:</h3>
      <ul>${logItems}</ul>
    `);
  } catch (err) {
    res.status(500).send("Database connection error: " + err.message);
  }
});

app.post('/add', async (req, res) => {
  const { title, status } = req.body;
  await pool.query('INSERT INTO maintenance_logs (title, status) VALUES (\$1, \$2)', [title, status]);
  res.redirect('/');
});

app.listen(8080, () => console.log('App running on port 8080'));