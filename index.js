const express = require('express');
const admin = require('firebase-admin');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// 1. Middleware & CORS
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 2. Firebase Admin
const serviceAccount = require("./movie_master_pro_firebase_sdk.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// 3. Security Middleware
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.decodedUser = decodedToken; // contains uid and email
        next();
    } catch (error) {
        res.status(401).send({ message: 'Unauthorized: Invalid token' });
    }
};

// 4. MongoDB
const uri = `mongodb+srv://${process.env.DB_ADMIN}:${process.env.DB_PASSWORD}@learning-server.eft4uy8.mongodb.net/?appName=learning-server`;
const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
    try {
        const db = client.db("movieMasterDB");
        const movieCollection = db.collection("movies");
        const usersCollection = db.collection("users");

        // --- PUBLIC ROUTES ---
        
        // Get all movies
        app.get('/movies', async (req, res) => {
            const result = await movieCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // Get single movie (PUBLIC - anyone can see details)
        app.get('/movies/:id', async (req, res) => {
            try {
                const query = { _id: new ObjectId(req.params.id) };
                const result = await movieCollection.findOne(query);
                if (!result) return res.status(404).send({ message: "Movie not found" });
                res.send(result);
            } catch (err) { res.status(400).send({ message: "Invalid ID" }); }
        });

        // --- PROTECTED ROUTES (Requires Login) ---

        // Add Movie
        app.post('/movies', verifyFirebaseToken, async (req, res) => {
            const movie = req.body;
            // Force the UID to be the authenticated one for security
            movie.uid = req.decodedUser.uid; 
            const result = await movieCollection.insertOne(movie);
            res.send(result);
        });

        // Update Movie (Creator Only)
        app.put('/movies/:id', verifyFirebaseToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            
            // Check if movie exists and if user owns it
            const existingMovie = await movieCollection.findOne(filter);
            if (!existingMovie) return res.status(404).send({ message: "Not found" });
            if (existingMovie.uid !== req.decodedUser.uid) {
                return res.status(403).send({ message: "Forbidden: You don't own this" });
            }

            const updateDoc = { $set: req.body };
            delete updateDoc.$set._id; // Prevent updating the MongoDB ID
            
            const result = await movieCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // Delete Movie (Creator Only)
        app.delete('/movies/:id', verifyFirebaseToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            const existingMovie = await movieCollection.findOne(filter);
            if (!existingMovie) return res.status(404).send({ message: "Not found" });
            if (existingMovie.uid !== req.decodedUser.uid) {
                return res.status(403).send({ message: "Forbidden" });
            }

            const result = await movieCollection.deleteOne(filter);
            res.send(result);
        });

        console.log("Connected to MongoDB");
    } finally {}
}
run().catch(console.dir);

app.listen(port, () => console.log(`Server on ${port}`));