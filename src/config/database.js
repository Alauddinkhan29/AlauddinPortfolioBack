const mongoose = require('mongoose');




const connectDB = async () => {
    // console.log("=== env", process.env);
    try {
        const uri = process.env.DATABASEURI;


        await mongoose.connect(uri);

        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);

    }
};

module.exports = connectDB;


// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = "mongodb+srv://alauddinkhan29:qfFZuWhcuk1CaH9m@cluster0.njtp0.mongodb.net/portfolio?retryWrites=true&w=majority&appName=Cluster0/portfolio";
// const dbname = 'portfolio'
// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//     serverApi: {
//         version: ServerApiVersion.v1,
//         strict: true,
//         deprecationErrors: true,
//     },
// });

// const connectDB = async function run() {
//     try {
//         // Connect the client to the server	(optional starting in v4.7)
//         await client.connect();
//         // Send a ping to confirm a successful connection
//         const db = await client.db(dbname).command({ ping: 1 });
//         console.log("Pinged your deployment. You successfully connected to MongoDB!", db);

//     } catch (err) {

//     } finally {
//         await client.close()
//     }
// }
// // run().catch(console.dir);

// module.exports = connectDB;
