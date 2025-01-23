const Chat = require("../models/Chat");
const Messages = require("../models/Messages");
const User = require("../models/User");


const handleConnection = (socket, io) => {
    socket.on('joinRoom', async (data) => {
        console.log(`User joined room: ${data}`);
        const { senderId, receiverId } = data;
        console.log("==== sender ID and reciver id", senderId, receiverId)
        let chatRoom = await Chat.findOne({
            $or: [
                { senderId: senderId, receiverId: receiverId },
                { senderId: receiverId, receiverId: senderId },
            ],
        }).exec();

        console.log("==== chatroom", chatRoom)

        if (chatRoom) {
            console.log(`Chat already exists between ${senderId} and ${receiverId}`);
        } else {
            // Create a new chat if not found
            console.log(`No chat found, creating a new chat between ${senderId} and ${receiverId}`);
            chatRoom = new Chat({
                senderId: senderId,
                receiverId: receiverId,
                messages: [],  // You can initialize with an empty messages array or populate it later
            });
            await chatRoom.save();
            console.log('New chat room created');
        }

        // Now, join the room (you can use the chatRoom._id or senderId + receiverId as the room identifier)
        const roomId = chatRoom._id.toString();  // Use the chat's unique ID as the room ID
        socket.join(roomId);
        console.log(`User ${senderId} joined room: ${roomId}`);

        // console.log("=== chat room", chatRoom)

        const populatedChatRoom = await Chat.findById(roomId)
            .populate({
                path: 'messages',  // The path to the array field (messages)
                model: 'MessagesSchema', // The model to populate from
                populate: [
                    { path: 'senderId', select: 'name email' }, // Optionally populate sender data
                    { path: 'receiverId', select: 'name email' } // Optionally populate receiver data
                ]
            });

        // Send the chat's messages array (history) back to the client
        socket.emit('roomJoined', {
            roomId: roomId,
            senderId: chatRoom.senderId,
            receiverId: chatRoom.receiverId,
            messages: populatedChatRoom.messages,  // Send messages history back to the frontend
        });

    });

    socket.on('SendMessage', async (data) => {
        try {
            const { chatId, senderId, receiverId, message } = data;

            console.log("==== data in send message === sender ID", senderId, "reciever ID", receiverId, "Chat ", chatId, "message", message)

            // Validate if sender and receiver exist in the database
            const sender = await User.findById(senderId);
            const receiver = await User.findById(receiverId);
            const chatRoom = await Chat.findById(chatId);

            if (!sender || !receiver) {
                socket.emit('error', { message: 'Sender or Receiver not found' });
                return;
            }

            // Create a new message document
            const newMessage = new Messages({
                senderId,
                receiverId,
                message,
                time: Date.now(),
                delivered: false,
                read: false
            });

            console.log("=== newMessage", newMessage)

            // Save the message to the database
            await newMessage.save();

            chatRoom.messages.push(newMessage._id);

            // Save the updated chat room with the new message
            await chatRoom.save();

            console.log("==== messages", chatRoom.messages);

            // Populate the messages array in the chatRoom to get full message details
            const populatedChatRoom = await Chat.findById(chatRoom._id)
                .populate({
                    path: 'messages',  // The path to the array field (messages)
                    model: 'MessagesSchema', // The model to populate from
                    populate: [
                        { path: 'senderId', select: 'name email' }, // Optionally populate sender data
                        { path: 'receiverId', select: 'name email' } // Optionally populate receiver data
                    ]
                });

            // Emit the populated messages to the client
            io.to(chatId).emit('ReceiveMessage', populatedChatRoom.messages);

            // // Optionally, broadcast to other clients in the chat room
            // socket.to(receiverID).emit('ReceiveMessage', newMessage);

        } catch (error) {
            console.error('Error in SendMessage:', error);
            socket.emit('error', { message: 'An error occurred while sending the message' });
        }
    })

    socket.on("getAllChats", async (data) => {
        try {
            const aluddinId = "6789f9f39bba5fcb741eba2a";
            socket.join(aluddinId);
            let arrayOfChats = [];
            let chatRoom = await Chat.find({
                $or: [
                    { senderId: aluddinId },
                    { receiverId: aluddinId },
                ],
            }).exec();
            console.log("=== chat room", chatRoom)
            for (let i = 0; i < chatRoom.length; i++) {
                console.log("==== chatroom index", chatRoom[i])
                const populatedChatRoom = await Chat.findById(chatRoom[i]._id)
                    .populate({
                        path: 'senderId',
                        model: 'User',
                        select: 'name email',
                    })
                    .populate({
                        path: 'receiverId',
                        model: 'User',
                        select: 'name email',
                    })
                    .populate({
                        path: 'messages',
                        model: 'MessagesSchema',
                        populate: [
                            { path: 'senderId', model: 'User', select: 'name email' },
                            { path: 'receiverId', model: 'User', select: 'name email' },
                        ],
                    });
                arrayOfChats.push(populatedChatRoom);
            }

            console.log("=== array of chats", arrayOfChats)

            io.to(aluddinId).emit("ReceiveAllChats", arrayOfChats)
        } catch (err) {
            console.log("=== error in get all chats", err)
        }
    })

    socket.on('disconnect', () => {
        console.log("==== in disconnect")
    })
}

module.exports = { handleConnection }