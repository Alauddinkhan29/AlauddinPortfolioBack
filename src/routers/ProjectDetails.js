const express = require('express');
const ProjectDetails = require("../models/ProjectDetails");
const router = express.Router();

// Add React Native Project
router.post("/project/add-project", async (req, res) => {
    console.log("==== body", req.body)
    // const { name, description, picUrl, framework, stateManagementSystem, programmingLanguage, version, videoUrl } = req.body;
    try {
        const newProject = await ProjectDetails(req.body)
        console.log("newProject", newProject);
        newProject.save();
        res.send({ status: 'success', message: "Project added successfully!" })
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
        res.status(200).send({ status: "success", message: "Projects fetched successfully!", data: finalProjectsArr })
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

module.exports = router;