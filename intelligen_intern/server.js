const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');

const app = express();

const PORT = 3000;

// Health check
app.get('/', (req, res) => {

    res.send('Internship Pipeline Running');

});

// Run pipeline endpoint
app.get('/run-pipeline', (req, res) => {

    try {

        console.log('Running pipeline...');

        execSync('node pipeline.js', {
            stdio: 'inherit'
        });

        const rankedJobs = JSON.parse(
            fs.readFileSync('ranked_jobs.json')
        );

        res.json({

            success: true,

            total_jobs: rankedJobs.length,

            top_jobs: rankedJobs.slice(0, 10)

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            error: error.message

        });

    }

});

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});