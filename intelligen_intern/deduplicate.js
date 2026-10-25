const fs = require('fs');
const stringSimilarity = require('string-similarity');

// Load merged jobs
const allJobs = JSON.parse(
    fs.readFileSync('all_jobs.json')
);

const uniqueJobs = [];

for (const job of allJobs) {

    let duplicateFound = false;

    for (const existingJob of uniqueJobs) {

        const similarity =
            stringSimilarity.compareTwoStrings(
                job.title.toLowerCase(),
                existingJob.title.toLowerCase()
            );

        const sameCompany =
            job.company.toLowerCase() ===
            existingJob.company.toLowerCase();

        if (similarity > 0.8 && sameCompany) {

            duplicateFound = true;

            break;

        }

    }

    if (!duplicateFound) {

        uniqueJobs.push(job);

    }

}

fs.writeFileSync(
    'unique_jobs.json',
    JSON.stringify(uniqueJobs, null, 2)
);

console.log(
    `Reduced ${allJobs.length} jobs to ${uniqueJobs.length} unique jobs`
);