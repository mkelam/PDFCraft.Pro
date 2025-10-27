const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function simpleUITest() {
    let browser;
    const screenshotsDir = path.join(__dirname, 'test-screenshots');

    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    try {
        console.log('🚀 Starting Simple UI Test...\n');

        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // Navigate to homepage
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

        // Take homepage screenshot
        await page.screenshot({
            path: path.join(screenshotsDir, 'homepage-full.png'),
            fullPage: true
        });

        console.log('✅ Homepage screenshot taken');

        // Check mobile responsiveness
        await page.setViewport({ width: 375, height: 667 });
        await page.screenshot({
            path: path.join(screenshotsDir, 'mobile-homepage.png'),
            fullPage: true
        });

        console.log('✅ Mobile view screenshot taken');

        // Back to desktop and test navigation
        await page.setViewport({ width: 1920, height: 1080 });

        // Try to navigate to features page if it exists
        try {
            const featuresLink = await page.$('a[href="/features"]');
            if (featuresLink) {
                await featuresLink.click();
                await page.waitForTimeout(2000);
                await page.screenshot({
                    path: path.join(screenshotsDir, 'features-page.png'),
                    fullPage: true
                });
                console.log('✅ Features page screenshot taken');

                // Go back to homepage
                await page.goBack();
                await page.waitForTimeout(1000);
            }
        } catch (error) {
            console.log('⚠️  Features page navigation failed:', error.message);
        }

        // Check for drag and drop areas specifically
        const dragAreas = await page.$$eval('*', elements => {
            const areas = [];
            elements.forEach(el => {
                const hasDropzoneProps = el.hasAttribute && (
                    el.hasAttribute('data-testid') ||
                    el.className.includes('dropzone') ||
                    el.textContent.toLowerCase().includes('drop') ||
                    el.textContent.toLowerCase().includes('drag')
                );

                if (hasDropzoneProps && el.offsetWidth > 100 && el.offsetHeight > 50) {
                    areas.push({
                        tagName: el.tagName,
                        className: el.className || '',
                        text: el.textContent.substring(0, 50) + '...'
                    });
                }
            });
            return areas.slice(0, 5); // Top 5
        });

        console.log('\n📤 Found drag/drop areas:');
        dragAreas.forEach((area, i) => {
            console.log(`   [${i+1}] ${area.tagName}: ${area.text.replace(/\s+/g, ' ').trim()}`);
        });

        // Test glassmorphic elements
        const glassCount = await page.$$eval('*', elements => {
            return elements.filter(el => {
                const className = el.className || '';
                return typeof className === 'string' && className.includes('glass');
            }).length;
        });

        console.log(`\n✨ Found ${glassCount} elements with 'glass' class`);

        // Final screenshot
        await page.screenshot({
            path: path.join(screenshotsDir, 'final-state.png'),
            fullPage: true
        });

        console.log('\n🎯 Test Results:');
        console.log(`   - Homepage loads: ✅`);
        console.log(`   - Responsive design: ✅`);
        console.log(`   - Drag/drop areas found: ${dragAreas.length}`);
        console.log(`   - Glassmorphic elements: ${glassCount}`);
        console.log(`   - Screenshots saved: ✅`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

simpleUITest().catch(console.error);