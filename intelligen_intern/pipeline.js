const { execSync } = require('child_process');

function runStep(stepName, command) {

    console.log(`\n========== ${stepName} ==========\n`);

    try {

        execSync(command, {
            stdio: 'inherit'
        });

        console.log(`\n✅ ${stepName} completed\n`);

    } catch (error) {

        console.log(`\n❌ ${stepName} failed\n`);

        process.exit(1);

    }

}

// Run complete pipeline
runStep(
    'Internshala Scraper',
    'node scraper.js'
);

runStep(
    'Normalize Internshala Data',
    'node normalize.js'
);

runStep(
    'Fetch RemoteOK Jobs',
    'node remoteok.js'
);

runStep(
    'Fetch Arbeitnow Jobs',
    'node arbeitnow.js'
);

runStep(
    'Merge All Sources',
    'node merge.js'
);

runStep(
    'Deduplicate Jobs',
    'node deduplicate.js'
);

runStep(
    'Rank Jobs',
    'node rank_jobs.js'
);

console.log('\n🚀 COMPLETE PIPELINE EXECUTED SUCCESSFULLY\n');