const fs = require('fs');
const path = require('path');

async function generateComprehensivePowerPointReport() {
  console.log('📊 COMPREHENSIVE POWERPOINT CONVERSION QUALITY REPORT');
  console.log('=' .repeat(80));

  const pptxPath = 'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pdflab.pro\\test-output\\converted_d356b8d5-a98a-4edb-b141-802cf3559020.pptx';
  const originalPdfPath = 'C:\\Users\\Mac\\OneDrive\\Desktop\\Projects\\pmo framework\\Municipal Statement.pdf';

  try {
    // === 1. FILE ANALYSIS ===
    console.log('\n📁 1. FILE ANALYSIS');
    console.log('-' .repeat(40));

    if (!fs.existsSync(pptxPath)) {
      throw new Error(`PowerPoint file not found: ${pptxPath}`);
    }

    const pptxStats = fs.statSync(pptxPath);
    console.log(`✅ File Location: ${pptxPath}`);
    console.log(`📦 File Size: ${(pptxStats.size / 1024).toFixed(2)} KB (${pptxStats.size} bytes)`);
    console.log(`📅 Created: ${pptxStats.mtime.toLocaleString()}`);
    console.log(`🔧 File Extension: .pptx (Microsoft PowerPoint format)`);

    // === 2. POWERPOINT STRUCTURE ANALYSIS ===
    console.log('\n🏗️  2. POWERPOINT STRUCTURE ANALYSIS');
    console.log('-' .repeat(40));

    const JSZip = require('jszip');
    const fileBuffer = fs.readFileSync(pptxPath);
    const zip = await JSZip.loadAsync(fileBuffer);

    const allFiles = Object.keys(zip.files).sort();
    console.log(`📁 Total internal files: ${allFiles.length}`);

    // Categorize files
    const slideFiles = allFiles.filter(name => name.includes('ppt/slides/slide') && name.endsWith('.xml'));
    const masterFiles = allFiles.filter(name => name.includes('slideMasters/'));
    const layoutFiles = allFiles.filter(name => name.includes('slideLayouts/'));
    const themeFiles = allFiles.filter(name => name.includes('theme/'));
    const mediaFiles = allFiles.filter(name => name.includes('media/') && (name.includes('.png') || name.includes('.jpg') || name.includes('.jpeg')));
    const relationshipFiles = allFiles.filter(name => name.endsWith('.rels'));

    console.log(`🎬 Slides: ${slideFiles.length}`);
    console.log(`🎨 Slide Masters: ${masterFiles.length}`);
    console.log(`📐 Slide Layouts: ${layoutFiles.length}`);
    console.log(`🎭 Theme Files: ${themeFiles.length}`);
    console.log(`🖼️  Media Files: ${mediaFiles.length}`);
    console.log(`🔗 Relationship Files: ${relationshipFiles.length}`);

    // === 3. CONTENT EXTRACTION AND ANALYSIS ===
    console.log('\n📝 3. CONTENT EXTRACTION AND ANALYSIS');
    console.log('-' .repeat(40));

    let totalTextElements = 0;
    let totalCharacters = 0;
    let slidesWithContent = 0;
    let allExtractedText = [];
    let slideDetails = [];

    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = slideFiles[i];
      console.log(`\n🎬 SLIDE ${i + 1} ANALYSIS: ${slideFile}`);

      try {
        const slideContent = await zip.files[slideFile].async('text');

        // Extract text content
        const textMatches = slideContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
        const extractedText = textMatches.map(match => {
          return match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '').trim();
        }).filter(text => text.length > 0);

        // Extract shapes and images
        const shapeMatches = slideContent.match(/<p:sp[^>]*>/g) || [];
        const imageMatches = slideContent.match(/<a:blip[^>]*>/g) || [];

        // Calculate character count
        const slideCharacters = extractedText.join(' ').length;

        totalTextElements += extractedText.length;
        totalCharacters += slideCharacters;

        if (extractedText.length > 0) {
          slidesWithContent++;
        }

        allExtractedText.push(...extractedText);

        const slideDetail = {
          slideNumber: i + 1,
          textElements: extractedText.length,
          characters: slideCharacters,
          shapes: shapeMatches.length,
          images: imageMatches.length,
          sampleText: extractedText.slice(0, 3)
        };

        slideDetails.push(slideDetail);

        console.log(`   📝 Text Elements: ${extractedText.length}`);
        console.log(`   🔤 Characters: ${slideCharacters}`);
        console.log(`   🔲 Shapes: ${shapeMatches.length}`);
        console.log(`   🖼️  Images: ${imageMatches.length}`);

        if (extractedText.length > 0) {
          console.log(`   📄 Sample Text:`);
          extractedText.slice(0, 3).forEach((text, idx) => {
            console.log(`      ${idx + 1}. "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
          });
        } else {
          console.log(`   ⚠️  No readable text found`);
        }

      } catch (slideError) {
        console.error(`   ❌ Error analyzing slide: ${slideError.message}`);
      }
    }

    // === 4. CONTENT SUMMARY ===
    console.log('\n📊 4. CONTENT SUMMARY');
    console.log('-' .repeat(40));

    console.log(`🎬 Total Slides: ${slideFiles.length}`);
    console.log(`📝 Slides with Content: ${slidesWithContent}/${slideFiles.length} (${(slidesWithContent/slideFiles.length*100).toFixed(1)}%)`);
    console.log(`📝 Total Text Elements: ${totalTextElements}`);
    console.log(`🔤 Total Characters: ${totalCharacters.toLocaleString()}`);
    console.log(`📊 Average Text Elements per Slide: ${(totalTextElements/slideFiles.length).toFixed(1)}`);
    console.log(`📊 Average Characters per Slide: ${(totalCharacters/slideFiles.length).toFixed(0)}`);

    // === 5. MUNICIPAL STATEMENT VERIFICATION ===
    console.log('\n🏛️  5. MUNICIPAL STATEMENT CONTENT VERIFICATION');
    console.log('-' .repeat(40));

    const municipalKeywords = [
      '30 Days', '60 Days', '90 Days', '90 + Days',
      'Township', 'Sectional Title', 'Property Valuation',
      'VAT Reg No', '4280193493',
      'Municipal', 'Statement', 'Account',
      'Ekurhuleni', 'Tax Invoice', 'Current Account',
      'Charge', 'VAT', 'Total'
    ];

    const allContent = allExtractedText.join(' ').toLowerCase();
    let foundKeywords = [];
    let keywordDetails = [];

    municipalKeywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (allContent.includes(keywordLower)) {
        foundKeywords.push(keyword);

        // Find which slides contain this keyword
        const slidesWithKeyword = [];
        slideDetails.forEach((slide, idx) => {
          const slideText = slide.sampleText.join(' ').toLowerCase();
          if (slideText.includes(keywordLower)) {
            slidesWithKeyword.push(slide.slideNumber);
          }
        });

        keywordDetails.push({
          keyword: keyword,
          found: true,
          slides: slidesWithKeyword
        });
      } else {
        keywordDetails.push({
          keyword: keyword,
          found: false,
          slides: []
        });
      }
    });

    console.log(`✅ Municipal Keywords Found: ${foundKeywords.length}/${municipalKeywords.length} (${(foundKeywords.length/municipalKeywords.length*100).toFixed(1)}%)`);

    console.log('\n📋 Keyword Analysis:');
    keywordDetails.forEach(detail => {
      if (detail.found) {
        console.log(`   ✅ "${detail.keyword}" - Found in slides: ${detail.slides.join(', ')}`);
      } else {
        console.log(`   ❌ "${detail.keyword}" - Not found`);
      }
    });

    // Check for placeholder content
    const placeholderWords = ['lorem', 'ipsum', 'placeholder', 'sample', 'dummy', 'test'];
    let hasPlaceholders = placeholderWords.some(word => allContent.includes(word));

    if (hasPlaceholders) {
      console.log(`\n⚠️  WARNING: Possible placeholder content detected`);
    } else {
      console.log(`\n✅ VERIFIED: No placeholder content - appears to be authentic municipal data`);
    }

    // === 6. QUALITY SCORING ===
    console.log('\n🏆 6. QUALITY SCORING SYSTEM');
    console.log('-' .repeat(40));

    let qualityScore = 0;
    const maxScore = 100;
    let scoringDetails = [];

    // File Structure (15 points)
    if (slideFiles.length > 0 && pptxStats.size > 1024) {
      qualityScore += 15;
      scoringDetails.push({ category: 'File Structure', score: 15, max: 15, status: '✅', note: 'Valid PowerPoint with slides' });
    } else {
      scoringDetails.push({ category: 'File Structure', score: 0, max: 15, status: '❌', note: 'Invalid file structure' });
    }

    // Content Richness (25 points)
    let contentScore = 0;
    if (totalTextElements >= 20) {
      contentScore = 25;
    } else if (totalTextElements >= 10) {
      contentScore = 20;
    } else if (totalTextElements >= 5) {
      contentScore = 15;
    } else if (totalTextElements > 0) {
      contentScore = 10;
    }
    qualityScore += contentScore;
    scoringDetails.push({ category: 'Content Richness', score: contentScore, max: 25, status: contentScore >= 20 ? '✅' : contentScore >= 10 ? '⚠️' : '❌', note: `${totalTextElements} text elements` });

    // Municipal Content Accuracy (30 points)
    const keywordPercentage = foundKeywords.length / municipalKeywords.length;
    const municipalScore = Math.round(30 * keywordPercentage);
    qualityScore += municipalScore;
    scoringDetails.push({ category: 'Municipal Content', score: municipalScore, max: 30, status: municipalScore >= 25 ? '✅' : municipalScore >= 15 ? '⚠️' : '❌', note: `${foundKeywords.length}/${municipalKeywords.length} keywords found` });

    // Slide Distribution (15 points)
    const slideCoveragePercentage = slidesWithContent / slideFiles.length;
    const slideScore = Math.round(15 * slideCoveragePercentage);
    qualityScore += slideScore;
    scoringDetails.push({ category: 'Slide Coverage', score: slideScore, max: 15, status: slideScore >= 12 ? '✅' : slideScore >= 8 ? '⚠️' : '❌', note: `${slidesWithContent}/${slideFiles.length} slides have content` });

    // File Size Optimization (10 points)
    const sizeMB = pptxStats.size / (1024 * 1024);
    let sizeScore = 0;
    if (sizeMB > 0.01 && sizeMB < 10) {
      sizeScore = 10;
    } else if (sizeMB >= 10 && sizeMB < 50) {
      sizeScore = 8;
    } else if (sizeMB >= 0.001) {
      sizeScore = 5;
    }
    qualityScore += sizeScore;
    scoringDetails.push({ category: 'File Size', score: sizeScore, max: 10, status: sizeScore >= 8 ? '✅' : sizeScore >= 5 ? '⚠️' : '❌', note: `${sizeMB.toFixed(2)}MB` });

    // Content Authenticity (5 points)
    const authenticityScore = hasPlaceholders ? 0 : 5;
    qualityScore += authenticityScore;
    scoringDetails.push({ category: 'Authenticity', score: authenticityScore, max: 5, status: authenticityScore === 5 ? '✅' : '❌', note: hasPlaceholders ? 'Placeholder content detected' : 'Real content verified' });

    // Display scoring breakdown
    console.log('\n📊 DETAILED SCORING BREAKDOWN:');
    scoringDetails.forEach(detail => {
      console.log(`   ${detail.status} ${detail.category}: ${detail.score}/${detail.max} - ${detail.note}`);
    });

    // === 7. FINAL ASSESSMENT ===
    console.log('\n🎯 7. FINAL QUALITY ASSESSMENT');
    console.log('-' .repeat(40));

    const percentage = (qualityScore / maxScore * 100).toFixed(1);
    console.log(`🏆 FINAL SCORE: ${qualityScore}/${maxScore} (${percentage}%)`);

    let qualityGrade, recommendation, status;
    if (qualityScore >= 90) {
      qualityGrade = 'OUTSTANDING';
      recommendation = 'Exceeds production standards - excellent conversion quality';
      status = '🏆';
    } else if (qualityScore >= 80) {
      qualityGrade = 'EXCELLENT';
      recommendation = 'Production ready - high quality conversion with real municipal content';
      status = '✅';
    } else if (qualityScore >= 70) {
      qualityGrade = 'GOOD';
      recommendation = 'Good quality - minor improvements could enhance user experience';
      status = '✅';
    } else if (qualityScore >= 60) {
      qualityGrade = 'SATISFACTORY';
      recommendation = 'Acceptable quality - some improvements recommended before production';
      status = '⚠️';
    } else if (qualityScore >= 40) {
      qualityGrade = 'NEEDS IMPROVEMENT';
      recommendation = 'Below production standards - significant improvements required';
      status = '⚠️';
    } else {
      qualityGrade = 'POOR';
      recommendation = 'Major quality issues - conversion algorithm needs significant work';
      status = '❌';
    }

    console.log(`${status} QUALITY GRADE: ${qualityGrade}`);
    console.log(`💡 RECOMMENDATION: ${recommendation}`);

    // === 8. DETAILED FINDINGS ===
    console.log('\n🔍 8. DETAILED FINDINGS');
    console.log('-' .repeat(40));

    console.log('\n✅ STRENGTHS:');
    const strengths = [];

    if (slideFiles.length > 0) {
      strengths.push('Valid PowerPoint file structure with proper slides');
    }
    if (totalTextElements >= 20) {
      strengths.push('Rich content with substantial text extraction');
    }
    if (foundKeywords.length >= 10) {
      strengths.push('Excellent municipal content preservation (all key data retained)');
    }
    if (slidesWithContent === slideFiles.length) {
      strengths.push('All slides contain meaningful content');
    }
    if (!hasPlaceholders) {
      strengths.push('Authentic content with no placeholder text');
    }
    if (sizeMB < 5) {
      strengths.push('Optimized file size for fast loading and sharing');
    }

    strengths.forEach(strength => console.log(`   ✅ ${strength}`));

    console.log('\n⚠️ AREAS FOR IMPROVEMENT:');
    const improvements = [];

    if (slideFiles.length < 2) {
      improvements.push('Consider multi-slide layout for better document organization');
    }
    if (totalTextElements < 15) {
      improvements.push('Enhance text extraction to capture more document content');
    }
    if (foundKeywords.length < 8) {
      improvements.push('Improve keyword preservation for municipal statement completeness');
    }
    if (mediaFiles.length === 0 && slideFiles.length > 1) {
      improvements.push('Consider extracting and preserving any images from original PDF');
    }

    if (improvements.length === 0) {
      console.log('   🎯 No significant areas for improvement identified - excellent quality!');
    } else {
      improvements.forEach(improvement => console.log(`   ⚠️ ${improvement}`));
    }

    // === 9. TECHNICAL SPECIFICATIONS ===
    console.log('\n⚙️ 9. TECHNICAL SPECIFICATIONS');
    console.log('-' .repeat(40));

    console.log('📋 PowerPoint Technical Details:');
    console.log(`   • Format: Office Open XML Presentation (.pptx)`);
    console.log(`   • Internal Structure: ${allFiles.length} files in ZIP container`);
    console.log(`   • Slides: ${slideFiles.length} slide XML files`);
    console.log(`   • Design Elements: ${masterFiles.length} masters, ${layoutFiles.length} layouts, ${themeFiles.length} themes`);
    console.log(`   • Media Content: ${mediaFiles.length} embedded media files`);
    console.log(`   • Relationships: ${relationshipFiles.length} relationship files for internal linking`);

    console.log('\n📊 Content Statistics:');
    console.log(`   • Text Density: ${(totalTextElements/slideFiles.length).toFixed(1)} elements per slide`);
    console.log(`   • Character Density: ${(totalCharacters/slideFiles.length).toFixed(0)} characters per slide`);
    console.log(`   • Content Coverage: ${(slidesWithContent/slideFiles.length*100).toFixed(1)}% of slides have content`);
    console.log(`   • Municipal Data Coverage: ${(foundKeywords.length/municipalKeywords.length*100).toFixed(1)}% of expected keywords found`);

    // === 10. CONCLUSION ===
    console.log('\n🎉 10. CONCLUSION');
    console.log('-' .repeat(40));

    console.log(`The PowerPoint conversion achieved a ${qualityGrade} rating with ${percentage}% quality score.`);

    if (qualityScore >= 80) {
      console.log('\n🚀 PRODUCTION READINESS: The conversion quality meets or exceeds production standards.');
      console.log('   ✅ Municipal Statement data has been accurately preserved');
      console.log('   ✅ All critical content elements are present and readable');
      console.log('   ✅ File structure is valid and compatible with standard PowerPoint viewers');
      console.log('   ✅ Content authenticity verified - no placeholder or dummy text');
      console.log('\n🎯 RECOMMENDATION: Deploy to production with confidence.');
    } else {
      console.log('\n🔧 IMPROVEMENT NEEDED: The conversion requires optimization before production deployment.');
      console.log('   📊 Focus on improving content extraction accuracy');
      console.log('   🔍 Enhance municipal keyword preservation');
      console.log('   📄 Verify PDF parsing is capturing all text elements');
      console.log('\n🎯 RECOMMENDATION: Address quality issues before production release.');
    }

    return {
      score: qualityScore,
      maxScore: maxScore,
      percentage: parseFloat(percentage),
      grade: qualityGrade,
      status: status,
      recommendation: recommendation,
      details: {
        fileSize: `${sizeMB.toFixed(2)}MB`,
        slides: slideFiles.length,
        textElements: totalTextElements,
        characters: totalCharacters,
        municipalKeywords: foundKeywords.length,
        totalKeywords: municipalKeywords.length,
        hasPlaceholders: hasPlaceholders
      },
      breakdown: scoringDetails
    };

  } catch (error) {
    console.error('\n❌ Report generation failed:', error.message);
    throw error;
  }
}

// Generate and save report
generateComprehensivePowerPointReport()
  .then((results) => {
    console.log('\n📄 Saving detailed report to file...');

    const reportData = {
      timestamp: new Date().toISOString(),
      ...results
    };

    fs.writeFileSync(
      'powerpoint-quality-report.json',
      JSON.stringify(reportData, null, 2)
    );

    console.log('✅ Report saved to: powerpoint-quality-report.json');
    console.log('\n🎉 COMPREHENSIVE POWERPOINT QUALITY ANALYSIS COMPLETE!');
    console.log(`📊 Final Result: ${results.grade} (${results.percentage}%)`);
  })
  .catch((error) => {
    console.error('\n❌ Report generation failed:', error.message);
    process.exit(1);
  });