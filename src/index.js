require('dotenv').config({ path: './src/.env' });
const express = require('express');
const connectDB = require('./config/database');
const app = express();
const cors = require("cors");

app.use(cors({
    origin: [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://alauddin-khan-portfolio-web.vercel.app/"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

const port = process.env.PORT || 9003;
const projectRouter = require('./routers/ProjectDetails')
const videoRouter = require('./routers/videoRoutes')
const userRouter = require('./routers/User')
const articlesRouter = require('./routers/Aritcles')
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
    })
    .catch((err) => {
        console.log("===err", err)
    })
