const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
const serviceAccount = require("./movie_master_pro_firebase_sdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.get('/', (req, res)=>{
    res.send("Server is up and running");
});


app.listen(port, ()=>{
    console.log(`Server is running on ${port}`);
});