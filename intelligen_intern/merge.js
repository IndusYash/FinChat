const fs = require('fs');

// Load all datasets
const internshalaJobs = JSON.parse(
    fs.readFileSync('normalized_jobs.json')
);

const remoteokJobs = JSON.parse(
    fs.readFileSync('remoteok_jobs.json')
);

const arbeitnowJobs = JSON.parse(
    fs.readFileSync('arbeitnow_jobs.json')
);

// Merge all jobs
const allJobs = [

    ...internshalaJobs,

    ...remoteokJobs,

    ...arbeitnowJobs

];

// Save merged dataset
fs.writeFileSync(
    'all_jobs.json',
    JSON.stringify(allJobs, null, 2)
);

console.log(`Merged ${allJobs.length} jobs successfully`);