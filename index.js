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
          console.log('POST /users endpoint called');
          console.log('Request body:', req.body);
          
          const newUser = req.body;
          const email = req.body.email;
          const query = {email: email};
          
          try {
            const existingUser = await usersCollection.findOne(query);
            console.log('Existing user check:', existingUser);
            
            if(existingUser){
              console.log('User already exists');
              return res.send({message: 'User already exists'});
            }
            
            const result = await usersCollection.insertOne(newUser);
            console.log('User inserted:', result);
            res.send(result);
          } catch (error) {
            console.error('Error in /users endpoint:', error);
            res.status(500).send({error: error.message});
          }
        });

        //USERS GET API:
        app.get('/users', async(req, res) =>{
          console.log('GET /users endpoint called');
          try {
            const cursor = usersCollection.find();
            const result = await cursor.toArray();
            console.log('Users fetched:', result);
            res.send(result);
          } catch (error) {
            console.error('Error in GET /users:', error);
            res.status(500).send({error: error.message});
          }
        });

        // JWT endpoint
        app.post('/jwt', async(req, res) =>{
          console.log('POST /jwt endpoint called');
          console.log('Request body:', req.body);
          const user = req.body;
          const token = user.email; // This is a placeholder - you should implement real JWT logic
          console.log('Token created for:', token);
          res.send({token: token});
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