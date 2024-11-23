const express = require('express');
const connectDB = require('./config/database');
const app = express();
const port = 9003;
const projectRouter = require('./routers/ProjectDetails')

app.use(express.json())

app.use(projectRouter)

connectDB()
    .then((res) => {
        app.listen(port, () => {
            console.log(`===== server started and running at ${port}`)
        })
    })
    .catch((err) => {
        console.log("===err", err)
    })