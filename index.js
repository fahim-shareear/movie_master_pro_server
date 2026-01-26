const express = require('express');
const admin = require('firebase-admin');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 3000;


app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
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
          const newUser = req.body;
          const email = req.body.email;
          const query = {email: email};
          const existingUser = await usersCollection.findOne(query);
          if(existingUser){
            return res.send({message: 'User already exists'});
          }
          const result = await usersCollection.insertOne(newUser);
          res.send(result);
        });

        //USERS GET API:
        app.get('/users', async(req, res) =>{
          const cursor = usersCollection.find();
          const result = await cursor.toArray();
          res.send(result);
        });

        // Issue JWT and set as HttpOnly cookie
        app.post('/jwt', async (req, res) => {
          const { email } = req.body || {};
          if (!email) {
            return res.status(400).send({ error: 'Email required' });
          }

          const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET || 'dev-secret', { expiresIn: '1h' });

          // Set cookie; client must request with credentials to receive it
          res.cookie('access_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 1000 // 1 hour
          });

          return res.json({ success: true });
        });

        // Logout: clear cookie
        app.post('/logout', (req, res) => {
          res.clearCookie('access_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          });
          res.json({ success: true });
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