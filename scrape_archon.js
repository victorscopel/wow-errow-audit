// ══════════════════════════════════════════════════════════
//  scrape_archon.js
//  Scrapes stat priorities from Archon.gg for all specs,
//  both heroic and mythic, then POSTs directly to the
//  GuildAudit Worker KV.
//
//  Usage:
//    WORKER_URL=https://your-worker.workers.dev \
//    ADMIN_TOKEN=your-secret-token \
//    node scrape_archon.js
//
//  Or via GitHub Actions (secrets set in repo settings).
// ══════════════════════════════════════════════════════════

const fs        = require('fs');
const puppeteer = require('puppeteer');

const WORKER_URL  = process.env.WORKER_URL  || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const specs = {
    'death-knight':  ['blood', 'frost', 'unholy'],
    'demon-hunter':  ['havoc', 'vengeance', 'devourer'],
    'druid':         ['balance', 'feral', 'guardian', 'restoration'],
    'evoker':        ['augmentation', 'devastation', 'preservation'],
    'hunter':        ['beast-mastery', 'marksmanship', 'survival'],
    'mage':          ['arcane', 'fire', 'frost'],
    'monk':          ['brewmaster', 'mistweaver', 'windwalker'],
    'paladin':       ['holy', 'protection', 'retribution'],
    'priest':        ['discipline', 'holy', 'shadow'],
    'rogue':         ['assassination', 'outlaw', 'subtlety'],
    'shaman':        ['elemental', 'enhancement', 'restoration'],
    'warlock':       ['affliction', 'demonology', 'destruction'],
    'warrior':       ['arms', 'fury', 'protection'],
};

const DIFFICULTIES = ['heroic', 'mythic'];

async function scrapeSpec(page, cls, spec, difficulty) {
    const url = `https://www.archon.gg/wow/builds/${spec}/${cls}/raid/overview/${difficulty}/all-bosses`;

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('.builds-stat-priority-section__container', { timeout: 10000 })
            .catch(() => {});

        const statArray = await page.evaluate(() => {
            const stats    = [];
            const labelEls = document.querySelectorAll(
                '.builds-stat-priority-section__container__stat-box__label'
            );

            labelEls.forEach(labelEl => {
                const statBox      = labelEl.closest('.builds-stat-priority-section__container__stat-box');
                const valueWrapper = statBox ? statBox.nextElementSibling : null;

                const label = labelEl.textContent.trim().toLowerCase();
                // Skip primary stats
                if (['agility', 'intellect', 'strength', 'stamina'].includes(label)) return;

                let value = null;
                if (
                    valueWrapper &&
                    valueWrapper.classList.contains(
                        'builds-stat-priority-section__container__stat-box__value-wrapper'
                    )
                ) {
                    const valueEl = valueWrapper.querySelector(
                        '.builds-stat-priority-section__container__stat-box__value'
                    );
                    if (valueEl) value = valueEl.textContent.trim();
                }

                stats.push(value ? `${label}(${value})` : label);
            });

            return stats;
        });

        if (statArray && statArray.length > 0) {
            const specStr = `${cls}-${spec}`;
            return `${specStr}:${statArray.join('>')}`;
        }
        return null;

    } catch (err) {
        console.error(`  ✗ ${cls}/${spec} [${difficulty}]: ${err.message}`);
        return null;
    }
}

async function scrapeAll() {
    console.log('Starting Archon.gg scraper...\n');

    if (!WORKER_URL || !ADMIN_TOKEN) {
        console.warn('⚠ WORKER_URL or ADMIN_TOKEN not set — will save to files only.\n');
    }

    const browser = await puppeteer.launch({ headless: 'new' });
    const page    = await browser.newPage();
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const results = { heroic: {}, mythic: {} };

    for (const diff of DIFFICULTIES) {
        console.log(`\n══ ${diff.toUpperCase()} ══`);

        for (const [cls, classSpecs] of Object.entries(specs)) {
            for (const spec of classSpecs) {
                process.stdout.write(`  ${cls}/${spec} ... `);
                const line = await scrapeSpec(page, cls, spec, diff);
                if (line) {
                    results[diff][`${cls}-${spec}`] = line;
                    console.log('✓');
                } else {
                    console.log('(no data)');
                }
                // Polite delay between requests
                await new Promise(r => setTimeout(r, 1500));
            }
        }
    }

    await browser.close();

    const timestamp = new Date().toISOString();

    // Build output strings
    for (const diff of DIFFICULTIES) {
        const lines  = Object.values(results[diff]);
        const output =
            `archon_stats_meta{\n` +
            lines.map(v => `  ${v}`).join('\n') +
            `\n  last_updated:${timestamp}\n}\n`;

        // Always save locally as backup
        const filename = `archon_stats_${diff}.txt`;
        fs.writeFileSync(filename, output);
        console.log(`\n✓ Saved ${filename} (${lines.length} specs)`);

        // POST to Worker if credentials are set
        if (WORKER_URL && ADMIN_TOKEN) {
            try {
                const res = await fetch(`${WORKER_URL}/api/archon/${diff}`, {
                    method:  'POST',
                    headers: {
                        'Content-Type':  'text/plain',
                        'X-Admin-Token': ADMIN_TOKEN,
                    },
                    body: output,
                });
                if (res.ok) {
                    console.log(`✓ POSTed ${diff} to Worker KV`);
                } else {
                    console.error(`✗ Worker rejected ${diff}: ${res.status} ${await res.text()}`);
                }
            } catch (e) {
                console.error(`✗ Failed to POST ${diff}: ${e.message}`);
            }
        }
    }

    console.log('\nDone!');
}

scrapeAll().catch(console.error);
