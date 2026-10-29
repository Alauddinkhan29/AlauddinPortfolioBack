// One-off migration: adds role / status / store links / scale to existing
// projects and adds the internal STP project. Data comes from the Phase 1
// discovery interview (docs/discovery.md); download counts were read off
// the Play Store listings in Oct 2026. Safe to re-run.
//
// Run with: npm run update-project-impact

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const ProjectDetails = require('../models/ProjectDetails');

const updates = [
    {
        _id: '68dd0fe462a3da186f3c5c69', // Tata FleetVerse
        role: 'Lead developer',
        status: 'live',
        downloads: '50K+',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.tatamotors.fleetverse',
        appStoreUrl: 'https://apps.apple.com/in/app/fleetverse/id6698877922',
        highlights: [
            "Built the in-app conversational chatbot's chat UI and integrated it with the bot API (the bot backend was owned by another team/vendor).",
            'Published on both Google Play and the App Store under Tata Motors Limited.',
        ],
    },
    {
        _id: '6749579c1b283a896c03a4fa', // Teracar (customer app)
        role: 'Lead developer',
        status: 'live',
        downloads: '1K+',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.teracar.app',
        highlights: ['Customer-side app of the Teracar ride-hailing platform; the driver app is listed separately.'],
    },
    {
        _id: '6749583c1b283a896c03a4fc', // Teracar Driver
        role: 'Lead developer',
        status: 'live',
        downloads: '1K+',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.teracar.pro.app',
        highlights: ['Driver-side app of the Teracar ride-hailing platform; the customer app is listed separately.'],
    },
    {
        _id: '67495ac81955065b4e3b4feb', // Agent Contacts
        role: 'Lead developer',
        status: 'live',
        downloads: '1K+',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.attechnologies.at',
        appStoreUrl: 'https://apps.apple.com/us/app/agent-contacts/id1577208858',
    },
    {
        _id: '674959f71b283a896c03a4ff', // Shopmatic
        role: 'Lead developer',
        status: 'unpublished',
    },
    {
        _id: '67495bb11955065b4e3b4fed', // Adihex
        role: 'Core team member',
        status: 'unpublished',
        highlights: ['Event app for the 2024 edition of ADIHEX; unpublished after the event.'],
    },
];

const stp = {
    name: 'STP (Dealer CRM)',
    description:
        'Internal web CRM used by an automotive dealer network. Covers lead and enquiry management, ' +
        'test drive scheduling and vehicle bookings, vehicle inventory and stock, and dealer and ' +
        'sales performance dashboards.',
    framework: 'ReactJS',
    stateManagementSystem: 'Redux Toolkit, React Query',
    programmingLanguage: 'TypeScript',
    role: 'Lead developer',
    status: 'internal',
    highlights: ['Used by 400+ dealers across the PV and EV business units.'],
};

const run = async () => {
    await connectDB();

    for (const { _id, ...fields } of updates) {
        const result = await ProjectDetails.updateOne({ _id }, { $set: fields });
        if (result.matchedCount === 0) {
            throw new Error(`project ${_id} not found — refusing to continue`);
        }
        console.log(`=== updated ${_id}`);
    }

    await ProjectDetails.updateOne({ name: stp.name }, { $set: stp }, { upsert: true });
    console.log('=== upserted STP');

    await mongoose.disconnect();
};

run().catch((err) => {
    console.error('=== update-project-impact failed', err);
    process.exit(1);
});
