const axios = require('axios');
const fs = require('fs');

async function fetchRemoteOK() {

    try {

        const response = await axios.get(
            'https://remoteok.com/api',
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            }
        );

        // Remove metadata object
        const jobs = response.data.slice(1);

        const normalizedJobs = jobs.map(job => {

            return {

                source: 'RemoteOK',

                title: job.position || '',

                company: job.company || '',

                location: job.location || '',

                stipend: '',

                url: job.url || '',

                description: job.description || ''

            };

        });

        fs.writeFileSync(
            'remoteok_jobs.json',
            JSON.stringify(normalizedJobs, null, 2)
        );

        console.log('RemoteOK jobs saved successfully');

    } catch (error) {

        console.log(error);

    }

}

fetchRemoteOK();