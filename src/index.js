require('dotenv').config({ path: './src/.env' });
const express = require('express');
const connectDB = require('./config/database');
const app = express();
const cors = require("cors");

// Render sits in front of this app as a reverse proxy; without this,
// express-rate-limit (used on /api/chat) sees Render's IP for every
// request instead of the real client IP.
app.set('trust proxy', 1);

app.use(cors({
    origin: [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://alauddin-khan-portfolio.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

//cache test

const port = process.env.PORT || 9003;
const projectRouter = require('./routers/ProjectDetails')
const videoRouter = require('./routers/videoRoutes')
const userRouter = require('./routers/User')
const articlesRouter = require('./routers/Aritcles')
const chatRouter = require('./routers/Chat')
const { warmUpEmbeddings, isEmbeddingReady } = require('./services/embeddingService')
const mongoose = require('mongoose')
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const bodyParser = require("body-parser");
// console.log("==== dotenv", dotenv)

const socketIo = require('socket.io')
const http = require('http');

const server = http.createServer(app)
const io = socketIo(server)

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.use(express.json())

app.use(projectRouter)
app.use(videoRouter)
app.use(userRouter)
app.use(articlesRouter)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/ready', (req, res) => {
    const database = mongoose.connection.readyState === 1;
    const embedding = isEmbeddingReady();
    return res.status(database && embedding ? 200 : 503).json({
        status: database && embedding ? 'ready' : 'not_ready', database, embedding,
    });
});
app.use(chatRouter)

const admin = require('firebase-admin');
const { handleConnection } = require('./controllers/SocketController');

// Replace with the path to your service account JSON file
// const serviceAccount = require('./portfolio-92be3-d71a1d319d7c.json');

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
// });


const sendNotification = async () => {
    const deviceToken = 'ea7RkCTeRcGq_1tkPz6psX:APA91bGrg-qQtE8K4XuZbNx7teq47o7rMcsFFawcdEsQVkwEJARPhtaMyABvNpTINmiw9JY9WsnJiOXtb0yi-W2WC45RAlTYaWMax6o_U-z--sXHtHB6DB4';

    const message = {
        token: deviceToken,
        notification: {
            title: 'Test Notification',
            body: 'This is a test message from Firebase Cloud Messaging',
        },
        data: {
            customKey: 'customValue', // Optional: Add custom data
            screen: 'About', // This is the custom data to identify which screen to navigate to
        },
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Notification sent successfully:', response);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

connectDB()
    .then((res) => {
        console.log("====ress on connectDB")

        io.on('connection', (socket) => {
            console.log("=== socket connected")
            handleConnection(socket, io);
        })

        server.listen(port, () => {
            console.log(`===== server started and running at ${port}`)
        })

        // Loading the embedding model takes seconds; do it now so the first
        // /api/chat request doesn't pay for it.
        warmUpEmbeddings()
            .then(() => console.log('=== embedding model ready'))
            .catch((err) => console.error('=== embedding model failed to load', err))
    })
    .catch((err) => {
        console.log("===err", err)
    })
// bind mount test
