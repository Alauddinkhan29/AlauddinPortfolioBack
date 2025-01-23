const express = require('express');
const User = require('../models/User');
const Chat = require('../models/Chat');
const router = express.Router();


router.post("/user/add-user", async (req, res) => {
    console.log("=== req", req.body)
    const { name, email } = req.body;
    try {
        const user = await User.findOne({ email: email })
        console.log("=== user", user)

        if (user) {
            if (user.name !== name) {
                return res.status(403).send({ status: "error", message: "The provided email is already associated with a different name. Please use the correct name", data: user });
            } else {
                return res.send({ status: "success", message: "User", data: user })
            }
        } else {
            const newUser = await User({
                name: name,
                email: email
            })
            newUser.save();
            return res.send({ status: "success", message: "NewUser", data: newUser })
        }
    } catch (err) {
        return res.status(500).send({ status: "error", message: "Something went wrong" })
    }
})


router.post("/login", async (req, res) => {
    try {
        const userEmail = 'alauddinkhan29@gmail.com';
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).send({ status: "error", message: "User not found!" })
        } else {
            return res.status(200).send({ status: "success", message: "Logged in successfully", data: user })
        }
    } catch (err) {
        res.status(500).send({ status: "error", message: err })
    }
})

module.exports = router;