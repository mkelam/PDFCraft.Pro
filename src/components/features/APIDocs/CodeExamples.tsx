import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Code, Copy, CheckCircle, Download, Book, ExternalLink } from 'lucide-react'
import { GlassmorphicCard } from '../../ui/GlassmorphicCard'

interface CodeExample {
  id: string
  title: string
  description: string
  language: string
  category: string
  code: string
  dependencies?: string[]
  documentation?: string
}

const CODE_EXAMPLES: CodeExample[] = [
  {
    id: 'js-upload',
    title: 'Upload and Compress PDF',
    description: 'Upload a PDF file and compress it using JavaScript/Node.js',
    language: 'javascript',
    category: 'JavaScript',
    dependencies: ['@pdfsaas/sdk', 'form-data'],
    code: `import PDFSaaS from '@pdfsaas/sdk';
import FormData from 'form-data';
import fs from 'fs';

// Initialize the SDK
const pdfsaas = new PDFSaaS({
  apiKey: 'your_api_key_here',
  baseUrl: 'https://api.pdfsaas.com/v1'
});

async function compressPDF() {
  try {
    // Upload and compress PDF
    const job = await pdfsaas.processing.compress({
      file: fs.createReadStream('input.pdf'),
      quality: 'medium',
      preserveImages: true
    });

    console.log('Job created:', job.jobId);

    // Wait for completion
    const result = await pdfsaas.jobs.waitForCompletion(job.jobId);

    if (result.status === 'completed') {
      // Download the compressed file
      const compressedFile = await pdfsaas.files.download(result.downloadUrl);
      fs.writeFileSync('compressed.pdf', compressedFile);

      console.log(\`Compression complete! Original: \${result.originalSize}, Compressed: \${result.compressedSize}\`);
    }
  } catch (error) {
    console.error('Compression failed:', error.message);
  }
}

compressPDF();`,
    documentation: 'https://docs.pdfsaas.com/sdks/javascript'
  },
  {
    id: 'python-convert',
    title: 'Convert PDF to DOCX',
    description: 'Convert a PDF file to DOCX format using Python',
    language: 'python',
    category: 'Python',
    dependencies: ['pdfsaas-python', 'requests'],
    code: `import pdfsaas
import asyncio

# Initialize the client
client = pdfsaas.Client(api_key='your_api_key_here')

async def convert_pdf_to_docx():
    try:
        # Upload and convert PDF
        with open('document.pdf', 'rb') as file:
            job = await client.processing.convert(
                file=file,
                output_format='docx',
                options={
                    'include_images': True,
                    'preserve_layout': True
                }
            )

        print(f"Conversion job started: {job.job_id}")

        # Poll for completion
        while True:
            status = await client.jobs.get_status(job.job_id)

            if status.status == 'completed':
                # Download the converted file
                download_url = status.result.download_url
                converted_file = await client.files.download(download_url)

                with open('converted_document.docx', 'wb') as output_file:
                    output_file.write(converted_file)

                print("Conversion completed successfully!")
                break
            elif status.status == 'failed':
                print(f"Conversion failed: {status.error}")
                break

            await asyncio.sleep(1)  # Wait 1 second before checking again

    except pdfsaas.PDFSaaSError as e:
        print(f"API Error: {e.message}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")

# Run the conversion
asyncio.run(convert_pdf_to_docx())`,
    documentation: 'https://docs.pdfsaas.com/sdks/python'
  },
  {
    id: 'curl-split',
    title: 'Split PDF with cURL',
    description: 'Split a PDF into multiple files using cURL',
    language: 'bash',
    category: 'cURL',
    code: `#!/bin/bash

API_KEY="your_api_key_here"
INPUT_FILE="large_document.pdf"
BASE_URL="https://api.pdfsaas.com/v1"

echo "Uploading PDF for splitting..."

# Upload and split PDF
RESPONSE=$(curl -s -X POST "$BASE_URL/processing/split" \\
  -H "X-API-Key: $API_KEY" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@$INPUT_FILE" \\
  -F "split_type=pages" \\
  -F "pages_per_file=5")

JOB_ID=$(echo $RESPONSE | jq -r '.job_id')

if [ "$JOB_ID" = "null" ]; then
  echo "Error: Failed to create split job"
  echo $RESPONSE | jq '.'
  exit 1
fi

echo "Split job created: $JOB_ID"

# Poll for completion
while true; do
  STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/processing/jobs/$JOB_ID" \\
    -H "X-API-Key: $API_KEY")

  STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')

  if [ "$STATUS" = "completed" ]; then
    echo "Split completed!"

    # Get download URLs
    DOWNLOAD_URLS=$(echo $STATUS_RESPONSE | jq -r '.result.files[].download_url')

    # Download each split file
    INDEX=1
    for URL in $DOWNLOAD_URLS; do
      echo "Downloading part $INDEX..."
      curl -H "X-API-Key: $API_KEY" -o "split_part_$INDEX.pdf" "$URL"
      INDEX=$((INDEX + 1))
    done

    echo "All files downloaded successfully!"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Split failed:"
    echo $STATUS_RESPONSE | jq '.error'
    exit 1
  fi

  echo "Status: $STATUS - waiting..."
  sleep 2
done`,
    documentation: 'https://docs.pdfsaas.com/api/curl-examples'
  },
  {
    id: 'php-merge',
    title: 'Merge Multiple PDFs',
    description: 'Merge multiple PDF files using PHP',
    language: 'php',
    category: 'PHP',
    dependencies: ['pdfsaas/php-sdk', 'guzzlehttp/guzzle'],
    code: `<?php

require_once 'vendor/autoload.php';

use PDFSaaS\\Client;
use PDFSaaS\\Exceptions\\PDFSaaSException;

// Initialize the client
$client = new Client([
    'api_key' => 'your_api_key_here',
    'base_url' => 'https://api.pdfsaas.com/v1'
]);

function mergePDFs() {
    global $client;

    try {
        $files = [
            'document1.pdf',
            'document2.pdf',
            'document3.pdf'
        ];

        // Upload and merge PDFs
        $job = $client->processing->merge([
            'files' => $files,
            'add_bookmarks' => true,
            'preserve_metadata' => true
        ]);

        echo "Merge job created: " . $job->getJobId() . "\\n";

        // Wait for completion
        $result = $client->jobs->waitForCompletion($job->getJobId(), [
            'timeout' => 300, // 5 minutes
            'poll_interval' => 2 // Check every 2 seconds
        ]);

        if ($result->getStatus() === 'completed') {
            // Download the merged file
            $downloadUrl = $result->getDownloadUrl();
            $mergedContent = $client->files->download($downloadUrl);

            file_put_contents('merged_document.pdf', $mergedContent);

            echo "Merge completed successfully!\\n";
            echo "Original files: " . count($files) . "\\n";
            echo "Total pages: " . $result->getTotalPages() . "\\n";
            echo "File size: " . $result->getFileSize() . "\\n";
        } else {
            echo "Merge failed: " . $result->getError() . "\\n";
        }

    } catch (PDFSaaSException $e) {
        echo "API Error: " . $e->getMessage() . "\\n";
        echo "Error Code: " . $e->getCode() . "\\n";
    } catch (Exception $e) {
        echo "Unexpected error: " . $e->getMessage() . "\\n";
    }
}

// Run the merge
mergePDFs();

?>`,
    documentation: 'https://docs.pdfsaas.com/sdks/php'
  },
  {
    id: 'react-component',
    title: 'React PDF Processor Component',
    description: 'A complete React component for PDF processing with progress tracking',
    language: 'jsx',
    category: 'React',
    dependencies: ['@pdfsaas/sdk', 'react', 'react-hooks'],
    code: `import React, { useState, useCallback } from 'react';
import PDFSaaS from '@pdfsaas/sdk';

const PDFProcessor = ({ apiKey }) => {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const pdfsaas = new PDFSaaS({ apiKey });

  const handleFileSelect = useCallback((event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid PDF file');
    }
  }, []);

  const processFile = useCallback(async (processingType, options = {}) => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Start processing
      const job = await pdfsaas.processing[processingType]({
        file,
        ...options
      });

      // Poll for progress
      const pollProgress = async () => {
        const status = await pdfsaas.jobs.getStatus(job.jobId);

        setProgress(status.progress || 0);

        if (status.status === 'completed') {
          setResult({
            downloadUrl: status.result.downloadUrl,
            fileSize: status.result.fileSize,
            processingTime: status.processingTime
          });
          setProcessing(false);
        } else if (status.status === 'failed') {
          setError(status.error || 'Processing failed');
          setProcessing(false);
        } else {
          // Continue polling
          setTimeout(pollProgress, 1000);
        }
      };

      pollProgress();

    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  }, [file, pdfsaas]);

  const downloadResult = useCallback(async () => {
    if (result?.downloadUrl) {
      try {
        const blob = await pdfsaas.files.downloadAsBlob(result.downloadUrl);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`processed_\${file.name}\`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        setError('Download failed: ' + err.message);
      }
    }
  }, [result, file, pdfsaas]);

  return (
    <div className="pdf-processor">
      {/* File Upload */}
      <div className="upload-area">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          disabled={processing}
        />
        {file && (
          <div className="file-info">
            <p>Selected: {file.name}</p>
            <p>Size: {(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        )}
      </div>

      {/* Processing Options */}
      {file && !processing && !result && (
        <div className="processing-options">
          <button onClick={() => processFile('compress', { quality: 'medium' })}>
            Compress PDF
          </button>
          <button onClick={() => processFile('convert', { outputFormat: 'docx' })}>
            Convert to DOCX
          </button>
          <button onClick={() => processFile('split', { splitType: 'pages', pagesPerFile: 5 })}>
            Split PDF
          </button>
        </div>
      )}

      {/* Progress */}
      {processing && (
        <div className="progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: \`\${progress}%\` }}
            />
          </div>
          <p>Processing: {progress}%</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="result">
          <p>✅ Processing completed!</p>
          <p>File size: {result.fileSize}</p>
          <p>Processing time: {result.processingTime}</p>
          <button onClick={downloadResult}>
            Download Processed File
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error">
          <p>❌ Error: {error}</p>
        </div>
      )}
    </div>
  );
};

export default PDFProcessor;`,
    documentation: 'https://docs.pdfsaas.com/sdks/react'
  }
]

export const CodeExamples: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('JavaScript')
  const [copiedCode, setCopiedCode] = useState('')

  const categories = Array.from(new Set(CODE_EXAMPLES.map(example => example.category)))

  const filteredExamples = CODE_EXAMPLES.filter(example => example.category === selectedCategory)

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(''), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const getLanguageColor = (language: string) => {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'jsx':
        return 'bg-yellow-100 text-yellow-800'
      case 'python':
        return 'bg-blue-100 text-blue-800'
      case 'php':
        return 'bg-purple-100 text-purple-800'
      case 'bash':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Code Examples</h2>
        <p className="text-slate-600">
          Ready-to-use code examples in popular programming languages
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Code Examples */}
      <div className="space-y-6">
        {filteredExamples.map((example, index) => (
          <motion.div
            key={example.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassmorphicCard className="overflow-hidden">
              {/* Example Header */}
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getLanguageColor(example.language)}`}>
                      {example.language}
                    </span>
                    <h3 className="text-xl font-semibold text-slate-800">{example.title}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {example.documentation && (
                      <a
                        href={example.documentation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                      >
                        <Book className="w-4 h-4" />
                        <span className="text-sm">Docs</span>
                      </a>
                    )}
                    <button
                      onClick={() => copyToClipboard(example.code, example.id)}
                      className="flex items-center space-x-1 text-slate-600 hover:text-slate-800"
                    >
                      {copiedCode === example.id ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span className="text-sm">
                        {copiedCode === example.id ? 'Copied!' : 'Copy'}
                      </span>
                    </button>
                  </div>
                </div>

                <p className="text-slate-600 mb-3">{example.description}</p>

                {/* Dependencies */}
                {example.dependencies && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-500">Dependencies:</span>
                    <div className="flex flex-wrap gap-1">
                      {example.dependencies.map(dep => (
                        <span
                          key={dep}
                          className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Code Block */}
              <div className="relative">
                <div className="bg-slate-900 overflow-x-auto">
                  <pre className="p-6 text-sm">
                    <code className="text-green-400 font-mono whitespace-pre">
                      {example.code}
                    </code>
                  </pre>
                </div>
              </div>
            </GlassmorphicCard>
          </motion.div>
        ))}
      </div>

      {/* SDK Downloads */}
      <GlassmorphicCard className="p-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
          <Download className="w-5 h-5 mr-2" />
          SDK Downloads
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              name: 'JavaScript SDK',
              package: '@pdfsaas/sdk',
              version: 'v2.1.0',
              downloads: '50K+ monthly',
              npm: 'npm install @pdfsaas/sdk',
              github: 'https://github.com/pdfsaas/javascript-sdk'
            },
            {
              name: 'Python SDK',
              package: 'pdfsaas-python',
              version: 'v1.8.0',
              downloads: '25K+ monthly',
              npm: 'pip install pdfsaas-python',
              github: 'https://github.com/pdfsaas/python-sdk'
            },
            {
              name: 'PHP SDK',
              package: 'pdfsaas/php-sdk',
              version: 'v1.5.0',
              downloads: '12K+ monthly',
              npm: 'composer require pdfsaas/php-sdk',
              github: 'https://github.com/pdfsaas/php-sdk'
            }
          ].map((sdk, index) => (
            <div key={sdk.name} className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-800">{sdk.name}</h4>
                <span className="text-xs text-slate-500">{sdk.version}</span>
              </div>
              <p className="text-sm text-slate-600 mb-3">{sdk.downloads}</p>

              <div className="bg-slate-900 rounded p-2 mb-3">
                <code className="text-green-400 text-xs">{sdk.npm}</code>
              </div>

              <a
                href={sdk.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="text-xs">GitHub</span>
              </a>
            </div>
          ))}
        </div>
      </GlassmorphicCard>
    </div>
  )
}