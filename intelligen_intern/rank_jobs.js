const fs = require('fs');

// Load jobs
const jobs = JSON.parse(
    fs.readFileSync('unique_jobs.json')
);

// Weighted keyword scoring
const keywords = {

    'machine learning': 5,
    'artificial intelligence': 5,
    'ai': 4,
    'ml': 4,
    'python': 3,
    'data science': 4,
    'deep learning': 5,
    'nlp': 4,
    'computer vision': 4,
    'research': 3,
    'llm': 5,
    'generative ai': 5

};

const rankedJobs = jobs.map(job => {

    const text = (
        job.title + ' ' +
        job.description
    ).toLowerCase();

    let score = 0;

    for (const keyword in keywords) {

        if (text.includes(keyword)) {

            score += keywords[keyword];

        }

    }

    // Stipend bonus
    if (
        job.stipend &&
        (
            job.stipend.includes('15,000') ||
            job.stipend.includes('20,000') ||
            job.stipend.includes('25,000')
        )
    ) {

        score += 2;

    }

    let reason = '';

    if (score >= 12) {

        reason =
            'Excellent match for AI/ML profile';

    } else if (score >= 8) {

        reason =
            'Strong match for data and AI roles';

    } else if (score >= 4) {

        reason =
            'Moderate relevance';

    } else {

        reason =
            'Low relevance';

    }

    return {

        ...job,

        relevance_score: score,

        ai_reasoning: reason

    };

});

// Sort descending
rankedJobs.sort(
    (a, b) =>
        b.relevance_score - a.relevance_score
);

// Save ranked jobs
fs.writeFileSync(
    'ranked_jobs.json',
    JSON.stringify(rankedJobs, null, 2)
);

console.log('Ranking completed successfully');