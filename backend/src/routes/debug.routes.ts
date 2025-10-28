import express from 'express';
import DebugController, { uploadPDF } from '../controllers/debug.controller';

const router = express.Router();

// Image processing debug endpoints
router.get('/status', DebugController.getImageProcessingStatus);
router.post('/test-image-detection', uploadPDF, DebugController.testImageDetection);
router.post('/test-quick-image-fix', uploadPDF, DebugController.testQuickImageFix);
router.get('/download/:filename', DebugController.downloadTestFile);

export default router;