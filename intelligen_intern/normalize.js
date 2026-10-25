const fs = require('fs');

// Read scraped data
const internshalaData = JSON.parse(
    fs.readFileSync('internships.json')
);

// Normalize schema
const normalizedData = internshalaData.map(job => {

    return {

        source: 'Internshala',

        title: job.title || '',

        company: job.company || '',

        location: job.location || '',

        stipend: job.stipend || '',

        url: job.link || '',

        description: ''

    };

});

// Save normalized data
fs.writeFileSync(
    'normalized_jobs.json',
    JSON.stringify(normalizedData, null, 2)
);

console.log('Normalization completed');