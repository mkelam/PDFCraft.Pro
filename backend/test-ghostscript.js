// Load environment variables
require('dotenv').config();

const { GhostscriptWrapper } = require('./dist/services/ghostscript-wrapper.service');

async function testGhostscript() {
    console.log('🧪 Testing Ghostscript Configuration...\n');

    try {
        // Test installation
        const info = await GhostscriptWrapper.getInstallationInfo();

        console.log('📋 Ghostscript Test Results:');
        console.log(`   Available: ${info.available ? '✅ YES' : '❌ NO'}`);

        if (info.path) {
            console.log(`   Path: ${info.path}`);
        }

        if (info.version) {
            console.log(`   Version: ${info.version}`);
        }

        if (info.error) {
            console.log(`   Error: ${info.error}`);
        }

        console.log('\n🔧 Configuration:');
        console.log(`   GHOSTSCRIPT_AVAILABLE: ${process.env.GHOSTSCRIPT_AVAILABLE}`);
        console.log(`   GHOSTSCRIPT_PATH: ${process.env.GHOSTSCRIPT_PATH}`);

        if (info.available) {
            console.log('\n✅ Ghostscript is properly configured!');
            console.log('🚀 Enhanced PDF processing capabilities:');
            console.log('   📊 High-quality PDF to image conversion');
            console.log('   🔧 PDF optimization and preprocessing');
            console.log('   📝 Advanced PDF metadata extraction');
            console.log('   ⚡ Industry-standard PDF operations');
        } else {
            console.log('\n❌ Ghostscript needs installation.');
            console.log('📝 Installation options:');
            console.log('   1. Download from: https://www.ghostscript.com/download/gsdnld.html');
            console.log('   2. Run the provided install-ghostscript.bat script');
            console.log('   3. Install manually and update GHOSTSCRIPT_PATH in .env');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testGhostscript();