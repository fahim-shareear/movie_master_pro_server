const express = require('express');
const admin = require('firebase-admin');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// 1. Full CORS Middleware (Now including PATCH)
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 2. Firebase Admin Initialization
const serviceAccount = require("./movie_master_pro_firebase_sdk.json");
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// 3. Security Middleware
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.decodedUser = decodedToken;
        next();
    } catch (error) {
        res.status(401).send({ message: 'Invalid token' });
    }
};

// 4. MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_ADMIN}:${process.env.DB_PASSWORD}@learning-server.eft4uy8.mongodb.net/?appName=learning-server`;
const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
    try {
        const db = client.db("movieMasterDB");
        const movieCollection = db.collection("movies");

        // --- PUBLIC ROUTES (Home & All Movies) ---
        
        // Get all movies (Restored for Home/All Movies)
        app.get('/movies', async (req, res) => {
            const result = await movieCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // Get single movie details (Restored for Details page)
        app.get('/movies/:id', async (req, res) => {
            try {
                const query = { _id: new ObjectId(req.params.id) };
                const result = await movieCollection.findOne(query);
                if (!result) return res.status(404).send({ message: "Movie not found" });
                res.send(result);
            } catch (err) { res.status(400).send({ message: "Invalid ID" }); }
        });

        // --- PROTECTED ROUTES (Requires Login) ---

        // NEW: Get only logged-in user's movies (For My Collection Page)
        app.get('/my-movies', verifyFirebaseToken, async (req, res) => {
            const uid = req.decodedUser.uid;
            const query = { uid: uid };
            const result = await movieCollection.find(query).toArray();
            res.send(result);
        });

        // Add Movie
        app.post('/movies', verifyFirebaseToken, async (req, res) => {
            const movie = req.body;
            movie.uid = req.decodedUser.uid; 
            const result = await movieCollection.insertOne(movie);
            res.send(result);
        });

        // PATCH: Update Movie (Creator Only - For My Collection Edit)
        app.patch('/movies/:id', verifyFirebaseToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            
            const existingMovie = await movieCollection.findOne(filter);
            if (!existingMovie) return res.status(404).send({ message: "Not found" });
            if (existingMovie.uid !== req.decodedUser.uid) {
                return res.status(403).send({ message: "Forbidden" });
            }

            const { _id, uid, addedBy, ...updateData } = req.body; 
            const result = await movieCollection.updateOne(filter, { $set: updateData });
            res.send(result);
        });

        // Delete Movie (Creator Only)
        app.delete('/movies/:id', verifyFirebaseToken, async (req, res) => {
            const filter = { _id: new ObjectId(req.params.id) };
            const existingMovie = await movieCollection.findOne(filter);
            if (!existingMovie || existingMovie.uid !== req.decodedUser.uid) {
                return res.status(403).send({ message: "Forbidden" });
            }
            const result = await movieCollection.deleteOne(filter);
            res.send(result);
        });

        console.log("Database Connected & Routes Restored");
    } finally {}
}
run().catch(console.dir);

app.listen(port, () => console.log(`Server running on port ${port}`));