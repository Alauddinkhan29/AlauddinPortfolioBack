const express = require('express');
const ProjectDetails = require("../models/ProjectDetails");
const router = express.Router();
const nodemailer = require('nodemailer');

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Add Project
 *     description: Add any project
 *     responses:
 *       200:
 *         description: Project added successfully!
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProjectDetails'
 * components:
 *   schemas:
 *     ProjectDetails:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         picUrl:
 *           type: string
 *         framework:
 *           type: string
 *         stateManagementSystem:
 *           type: string
 *         programmingLanguage:
 *           type: string
 *         version:
 *           type: string
 *         videoUrl:
 *           type: string
 */


// Add React Native Project
router.post("/project/add-project", async (req, res) => {
    console.log("==== body", req.body)
    // const { name, description, picUrl, framework, stateManagementSystem, programmingLanguage, version, videoUrl } = req.body;
    try {
        const newProject = await ProjectDetails(req.body)
        console.log("newProject", newProject);
        const validationErrors = newProject.validateSync(); // Validate data before saving
        if (validationErrors) {
            return res.status(400).json({ error: "Validation error", details: validationErrors.errors });
        }
        newProject.save();
        return res.send({ status: 'success', message: "Project added successfully!", data: newProject })
    } catch (err) {
        console.log("==== error", err)
    }
})

// get All Projects
router.get("/project/get-all-projects", async (req, res) => {
    try {
        const allProjects = await ProjectDetails.find({})
        console.log("=== all project", allProjects)
        const finalProjectsArr = allProjects.map((item) => {
            return {
                projectId: item._id,
                projectName: item.name,
                projectPicUrl: item.picUrl,
            }
        })
        console.log("=== final proj arr", finalProjectsArr)
        return res.status(200).send({ status: "success", message: "Projects fetched successfully!", data: finalProjectsArr })
    } catch (err) {
        console.log("=== error in all projects", err)
        res.status(500).send(err)
    }
})

// get All Projects as per framework
router.get("/project/get-projects-per-framework", async (req, res) => {
    const { framework } = req.query;
    console.log("==== framework", framework)
    try {
        const allProjects = await ProjectDetails.find({ framework })
        console.log("=== all project", allProjects)
        const finalProjectsArr = allProjects.map((item) => {
            return {
                projectId: item._id,
                projectName: item.name,
                projectPicUrl: item.picUrl,
            }
        })
        console.log("=== final proj arr", finalProjectsArr)
        setTimeout(() => {
            return res.status(200).send({ status: "success", message: "Projects fetched successfully!", data: finalProjectsArr })
        }, 3000)
    } catch (err) {
        console.log("=== error in all projects", err)
        res.status(500).send(err)
    }
})

// get Projects as per Project ID
router.get("/project/get-project-detail", async (req, res) => {
    const { projectId } = req.query;
    console.log("==== framework", projectId)
    try {
        const projectDetail = await ProjectDetails.findById({ _id: projectId })
        console.log("=== all project", projectDetail)
        res.status(200).send({ status: "success", message: "Project fetched successfully!", data: projectDetail })
    } catch (err) {
        console.log("=== error in all projects", err)
        res.status(500).send(err)
    }
})

// Your email configuration
const transporter = nodemailer.createTransport({
    service: "gmail", // Use your email provider's service
    auth: {
        user: process.env.EMAIL_USER, // Replace with your email
        pass: process.env.EMAIL_USER_PASS, // Replace with your email password or app password
    },
});

// POST API to send email
router.post("/send-mail", async (req, res) => {
    const { subject, message, email } = req.body;

    if (!subject || !message) {
        return res.status(400).json({ error: "Subject and message are required" });
    }

    const mailOptions = {
        from: "rcristiano786@gmail.com", // Replace with your email
        to: "alauddinkhan29@gmail.com", // Replace with your receiving email
        subject: subject,
        text: message,
        email: email,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: ", info.response);
        res.status(200).json({ message: "Email sent successfully", info: info.response });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Failed to send email", details: error });
    }
});

module.exports = router;