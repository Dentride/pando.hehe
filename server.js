import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = 'db.json';

// Initialize DB
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}));
}

function getDb() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveDb(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.get('/room/:id', (req, res) => {
    const db = getDb();
    if (db[req.params.id]) {
        res.json(db[req.params.id]);
    } else {
        res.status(404).json({ error: "Room not found" });
    }
});

app.post('/room/:id', (req, res) => {
    const db = getDb();
    db[req.params.id] = req.body;
    saveDb(db);
    res.json({ success: true });
});

app.listen(3000, '0.0.0.0', () => {
    console.log("Backend running on port 3000");
});
