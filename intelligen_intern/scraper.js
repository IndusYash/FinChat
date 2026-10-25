const { chromium } = require('playwright');
const fs = require('fs');

(async () => {

    const browser = await chromium.launch({
        headless: false
    });

    const page = await browser.newPage();

    await page.goto(
        'https://internshala.com/internships/machine-learning-internship/'
    );

    await page.waitForTimeout(5000);

    // Close popup if present
    try {

        await page.click('.close-modal');

        console.log('Popup closed');

    } catch (error) {

        console.log('No popup found');

    }

    await page.waitForTimeout(2000);

    // Extract internships
    const internships = await page.$$eval(
        '.individual_internship',
        cards => cards.map(card => {

            const title =
                card.querySelector('.job-internship-name')
                    ?.innerText?.trim() || '';

            const company =
                card.querySelector('.company-name')
                    ?.innerText?.trim() || '';

            const location =
                card.querySelector('.locations')
                    ?.innerText?.trim() || '';

            // Improved stipend extraction
            let stipend = '';

            const stipendElement =
                card.querySelector('.stipend');

            if (stipendElement) {

                stipend =
                    stipendElement.innerText.trim();

            }

            const link =
                card.querySelector('a')?.href || '';

            return {

                title,
                company,
                location,
                stipend,
                link

            };

        })
    );

    fs.writeFileSync(
        'internships.json',
        JSON.stringify(internships, null, 2)
    );

    console.log('Internships saved successfully');

    await browser.close();

})();