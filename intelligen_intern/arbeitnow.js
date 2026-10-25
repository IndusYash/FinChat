const axios = require('axios');
const fs = require('fs');

async function fetchArbeitnow() {

    try {

        const response = await axios.get(
            'https://www.arbeitnow.com/api/job-board-api'
        );

        const jobs = response.data.data;

        const normalizedJobs = jobs.map(job => {

            return {

                source: 'Arbeitnow',

                title: job.title || '',

                company: job.company_name || '',

                location: job.location || '',

                stipend: '',

                url: job.url || '',

                description: job.description || ''

            };

        });

        fs.writeFileSync(
            'arbeitnow_jobs.json',
            JSON.stringify(normalizedJobs, null, 2)
        );

        console.log('Arbeitnow jobs saved successfully');

    } catch (error) {

        console.log(error);

    }

}

fetchArbeitnow();