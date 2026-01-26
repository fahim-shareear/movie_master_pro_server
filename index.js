const express = require('express');
const admin = require('firebase-admin');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;


app.use(cors());
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