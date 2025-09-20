// Load environment variables
require('dotenv').config();

const { LibreOfficeWrapper } = require('./dist/services/libreoffice-wrapper.service');

async function testLibreOffice() {
    console.log('🧪 Testing LibreOffice Configuration...\n');

    try {
        // Test installation
        const result = await LibreOfficeWrapper.testInstallation();

        console.log('📋 LibreOffice Test Results:');
        console.log(`   Available: ${result.available ? '✅ YES' : '❌ NO'}`);

        if (result.version) {
            console.log(`   Version: ${result.version}`);
        }

        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }

        console.log('\n🔧 Configuration:');
        console.log(`   LIBREOFFICE_AVAILABLE: ${process.env.LIBREOFFICE_AVAILABLE}`);
        console.log(`   LIBREOFFICE_PATH: ${process.env.LIBREOFFICE_PATH}`);

        if (result.available) {
            console.log('\n✅ LibreOffice is properly configured!');
            console.log('🚀 Your PDF→PPT conversions should now work with high quality.');
        } else {
            console.log('\n❌ LibreOffice configuration needs attention.');
            console.log('📝 Please check the installation and path configuration.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testLibreOffice();