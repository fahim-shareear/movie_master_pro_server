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

        // GET: Advanced Search & Filtering
        app.get('/movies/search', async (req, res) => {
            try {
                const { q, genres, minRating, maxRating } = req.query;
                let query = {};

                // 1. Text Search (Title)
                if (q) {
                    query.title = { $regex: q, $options: 'i' };
                }

                // 2. Multi-Genre Filter ($in)
                if (genres) {
                    const genreArray = genres.split(',');
                    query.genre = { $in: genreArray };
                }

                // 3. Rating Range Filter ($gte, $lte)
                if (minRating || maxRating) {
                    query.rating = {};
                    if (minRating) query.rating.$gte = parseFloat(minRating);
                    if (maxRating) query.rating.$lte = parseFloat(maxRating);
                }

                const result = await movieCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Search failed" });
            }
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

        // --- WATCHLIST ROUTES ---

        // POST: Add to Watchlist
        app.post('/watchlist', verifyFirebaseToken, async (req, res) => {
            const { movieId, movieTitle, moviePoster, movieGenre } = req.body;
            const uid = req.decodedUser.uid;

            const watchlistCollection = client.db("movieMasterDB").collection("watchlist");

            // Prevent duplicates: Check if user already added this movie
            const existing = await watchlistCollection.findOne({ uid, movieId });
            if (existing) {
                return res.status(400).send({ message: "Already in your watchlist!" });
            }

            const watchlistItem = {
                uid,
                movieId,
                movieTitle,
                moviePoster,
                movieGenre,
                addedAt: new Date()
            };

            const result = await watchlistCollection.insertOne(watchlistItem);
            res.send(result);
        });

        // GET: User's Watchlist
        app.get('/watchlist', verifyFirebaseToken, async (req, res) => {
            const watchlistCollection = client.db("movieMasterDB").collection("watchlist");
            const query = { uid: req.decodedUser.uid };
            // Sorting by addedAt so the newest are at the bottom (queue style)
            const result = await watchlistCollection.find(query).sort({ addedAt: 1 }).toArray();
            res.send(result);
        });

        // DELETE: Remove from Watchlist
        app.delete('/watchlist/:id', verifyFirebaseToken, async (req, res) => {
            const watchlistCollection = client.db("movieMasterDB").collection("watchlist");
            const id = req.params.id;
            const query = { _id: new ObjectId(id), uid: req.decodedUser.uid };
            const result = await watchlistCollection.deleteOne(query);
            res.send(result);
        });

        console.log("Database Connected & Routes Restored");
    } finally {}
}
run().catch(console.dir);

// app.listen(port, () => console.log(`Server running on port ${port}`));