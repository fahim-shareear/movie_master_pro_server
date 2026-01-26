const express = require('express');
const admin = require('firebase-admin');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Configure CORS to allow credentials
const corsOptions = {
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
const serviceAccount = require("./movie_master_pro_firebase_sdk.json");

//setting middleware to check logger is true or false:
const logger = (req, res, next) =>{
  next();
};

//Verifying FIrebase ID Token Mmiddleware:
const verifyFirebaseToken = async (req, res, next) =>{
  const authorization = req.headers.authorization;
  if(!authorization || !authorization.startWith('Bearer ')){
    return res.status(401).send({message: 'Unauthorized access'});
  };

  const token = authorization.split(' ')[1];
  try{
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.token_email = decodedToken.email;
    next();
  }
  catch{
    res.status(401).send({message: 'Unauthorized access'});
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
//mongodb connection link:
const uri = `mongodb+srv://${process.env.DB_ADMIN}:${process.env.DB_PASSWORD}@learning-server.eft4uy8.mongodb.net/?appName=learning-server`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


app.get('/', (req, res)=>{
    res.send("Server is up and running");
});


async function run(){
    try{
        await client.connect();
        const movieCollection = client.db("movieMasterDB").collection("movies");
        const watchListCollection = client.db("movieMasterDB").collection("watchList");
        const usersCollection = client.db("movieMasterDB").collection("users");

        //creating Users Collection post API:
        app.post('/users', async(req, res) =>{
          const newUser = req.body;
          const email = req.body.email;
          const query = {email: email};
          
          try {
            const existingUser = await usersCollection.findOne(query);
            // console.log('Existing user check:', existingUser);
            
            if(existingUser){
              // console.log('User already exists');
              return res.send({message: 'User already exists'});
            }
            
            const result = await usersCollection.insertOne(newUser);
            // console.log('User inserted:', result);
            res.send(result);
          } catch (error) {
            // console.error('Error in /users endpoint:', error);
            res.status(500).send({error: error.message});
          }
        });

        //USERS GET API:
        app.get('/users', async(req, res) =>{
          console.log('GET /users endpoint called');
          try {
            const cursor = usersCollection.find();
            const result = await cursor.toArray();
            // console.log('Users fetched:', result);
            res.send(result);
          } catch (error) {
            // console.error('Error in GET /users:', error);
            res.status(500).send({error: error.message});
          }
        });

        // Middleware to verify user is authenticated
        const verifyUser = (req, res, next) => {
          const uid = req.body?.uid;
          const authHeader = req.headers.authorization;
          
          console.log('Verifying user - UID:', uid, 'Auth Header:', authHeader ? 'Present' : 'Missing');
          
          if (!uid) {
            console.error('No UID provided');
            return res.status(401).send({error: 'User not authenticated. Please log in.'});
          }
          
          next();
        };

        // POST - Add new movie
        app.post('/movies', verifyUser, async(req, res) =>{
          console.log('POST /movies endpoint called');
          console.log('Request body:', req.body);
          
          const newMovie = req.body;
          
          try {
            // Validate that movie has required fields and user info
            if (!newMovie.uid) {
              console.error('No user UID in movie data');
              return res.status(401).send({error: 'User not authenticated'});
            }
            
            if (!newMovie.title || !newMovie.genre || !newMovie.releaseDate) {
              console.error('Missing required movie fields');
              return res.status(400).send({error: 'Missing required movie fields'});
            }

            const result = await movieCollection.insertOne(newMovie);
            console.log('Movie inserted:', result);
            res.send(result);
          } catch (error) {
            console.error('Error adding movie:', error);
            if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
              res.status(401).send({error: 'User authentication failed. Please log in again.'});
            } else {
              res.status(500).send({error: error.message});
            }
          }
        });

        // GET - All movies
        app.get('/movies', async(req, res) =>{
          console.log('GET /movies endpoint called');
          try {
            const cursor = movieCollection.find().sort({addedAt: -1});
            const result = await cursor.toArray();
            console.log('Movies fetched:', result.length);
            res.send(result);
          } catch (error) {
            console.error('Error fetching movies:', error);
            res.status(500).send({error: error.message});
          }
        });

        // GET - Single movie by ID
        app.get('/movies/:id', async(req, res) =>{
          console.log('GET /movies/:id endpoint called for id:', req.params.id);
          try {
            const { ObjectId } = require('mongodb');
            const query = {_id: new ObjectId(req.params.id)};
            const result = await movieCollection.findOne(query);
            console.log('Movie fetched:', result);
            res.send(result);
          } catch (error) {
            console.error('Error fetching movie:', error);
            res.status(500).send({error: error.message});
          }
        });

        

        await client.db("admin").command({ping: 1});
        console.log("Pinged your deployment. You have successfully connected to MongoDB!")
    }
    finally{

    }
};

run().catch(console.dir);




app.listen(port, ()=>{
    console.log(`Server is running on ${port}`);
});