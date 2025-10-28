# TypeScript Compilation Error Fix Plan

## Summary
Found **62 TypeScript compilation errors** during comprehensive audit. This document outlines the systematic fix plan.

## Error Categories

### 1. Missing Type Definitions (HIGH PRIORITY)
- **QualityMetrics** - Already imported from pdf-conversion.types.ts ✅
- **ValidationResult** - Needs to be defined in service.types.ts
- **GoogleVisionOCR** - Missing export
- **AWSTextractOCR** - Missing export

### 2. Image Format Type Mismatch (HIGH PRIORITY)
```typescript
// Error: Type 'ImageOutputFormat' ('png' | 'jpg' | 'jpeg' | 'tiff')
// is not assignable to type '"png" | "tiff" | "jpg"'
// Location: improved-pdf.service.ts:207, visual-fidelity-pdf.service.ts:97
```
**Fix**: Change ImageMagick type to accept ImageOutputFormat

### 3. Missing convertPDFToOffice Method (CRITICAL)
Multiple services missing the required `convertPDFToOffice` method from PDFConversionService interface:
- PDFServiceAdapter
- Service Container registrations

### 4. Deprecated Redis Options (MEDIUM PRIORITY)
```typescript
// Error: 'retryDelayOnFailover' does not exist in type 'RedisOptions'
// Location: stripe-webhook-processor.service.ts:45, usage-tracking.service.ts:31
```
**Fix**: Remove deprecated Redis option

### 5. Duplicate Declarations (HIGH PRIORITY)
```typescript
// Error: Cannot redeclare exported variable 'CostMonitoringService'
// Location: cost-monitoring.service.ts:70, :502
```
**Fix**: Remove duplicate export

### 6. Type Assignment Errors (MEDIUM PRIORITY)
- cost-optimization-engine.service.ts:187 - DocumentAnalysis type mismatch
- cost-optimization-engine.service.ts:511 - Empty object not assignable to Record<OCREngineType, number>
- intelligent-engine-selector.service.ts - Multiple property access errors

## Systematic Fix Order

1. ✅ Add QualityMetrics import to service.types.ts
2. ⏳ Add ValidationResult interface to service.types.ts
3. ⏳ Fix ImageOutputFormat type mismatches
4. ⏳ Add missing exports (GoogleVisionOCR, AWSTextractOCR)
5. ⏳ Fix Redis deprecated options
6. ⏳ Fix duplicate CostMonitoringService declaration
7. ⏳ Add ValidationResult export where needed
8. ⏳ Fix all convertPDFToPPT → convertPDFToOffice migrations
9. ⏳ Fix type assignment errors
10. ⏳ Run full compilation test

## Current Status
- **Errors Fixed**: 1/62
- **Errors Remaining**: 61
- **Server Status**: Running with runtime errors suppressed

## Next Steps
Continue with item #2: Add ValidationResult interface
