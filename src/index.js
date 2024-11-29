require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');
const app = express();
const port = 9003;
const projectRouter = require('./routers/ProjectDetails')
const videoRouter = require('./routers/videoRoutes')
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const bodyParser = require("body-parser");
console.log("==== index env", process.env.DATABASEURI)

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.use(express.json())

app.use(projectRouter)
app.use(videoRouter)

connectDB()
    .then((res) => {
        console.log("====ress on connectDB", res)

        app.listen(port, () => {
            console.log(`===== server started and running at ${port}`)
        })
    })
    .catch((err) => {
        console.log("===err", err)
    })



// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = "mongodb+srv://alauddinkhan29:qfFZuWhcuk1CaH9m@cluster0.njtp0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//     serverApi: {
//         version: ServerApiVersion.v1,
//         strict: true,
//         deprecationErrors: true,
//     }
// });

// async function run() {
//     try {
//         // Connect the client to the server	(optional starting in v4.7)
//         await client.connect();
//         // Send a ping to confirm a successful connection
//         await client.db("admin").command({ ping: 1 });
//         console.log("Pinged your deployment. You successfully connected to MongoDB!");
//     } finally {
//         // Ensures that the client will close when you finish/error
//         await client.close();
//     }
// }
// run().catch(console.dir);


// const { MongoClient } = require("mongodb");

// async function run() {
//     // TODO:
//     // Replace the placeholder connection string below with your
//     // Altas cluster specifics. Be sure it includes
//     // a valid username and password! Note that in a production environment,
//     // you do not want to store your password in plain-text here.
//     const uri =
//         "mongodb+srv://alauddinkhan29:qfFZuWhcuk1CaH9m@cluster0.njtp0.mongodb.net/portfolio?retryWrites=true&w=majority&appName=Cluster0";

//     // The MongoClient is the object that references the connection to our
//     // datastore (Atlas, for example)
//     const client = new MongoClient(uri);

//     // The connect() method does not attempt a connection; instead it instructs
//     // the driver to connect using the settings provided when a connection
//     // is required.
//     await client.connect();

//     // Provide the name of the database and collection you want to use.
//     // If the database and/or collection do not exist, the driver and Atlas
//     // will create them automatically when you first write data.
//     const dbName = "myDatabase";
//     const collectionName = "recipes";

//     // Create references to the database and collection in order to run
//     // operations on them.
//     const database = client.db(dbName);
//     const collection = database.collection(collectionName);


//     // Make sure to call close() on your client to perform cleanup operations
//     await client.close();
// }
// run().catch(console.dir);