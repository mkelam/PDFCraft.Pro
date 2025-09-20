# BMAD Team Operating Procedures
## Business Model Accelerated Development Framework

**Last Updated**: 2025-09-20
**Version**: 2.1
**Critical Updates**: Upload Integrity Validation Requirements Added

---

## BMAD Architecture Agent Operating Procedures

### Core Responsibilities
1. **System Design & Architecture Review**
2. **Code Quality & Standards Enforcement**
3. **Performance & Scalability Planning**
4. **Security Architecture Validation**

### MANDATORY UPLOAD VALIDATION OVERSIGHT ⚠️
**CRITICAL REQUIREMENT** - All file upload endpoints MUST include:

#### Upload Integrity Validation Checklist
1. ✅ **Checksum Verification**: MD5/SHA256 hash comparison before/after write
2. ✅ **Size Validation**: Byte-perfect size matching verification
3. ✅ **Content Structure**: File format header validation (PDF: `%PDF-`, etc.)
4. ✅ **Integrity Metadata**: Track verification status in job records
5. ✅ **Error Handling**: Proper cleanup on validation failures

#### Implementation Requirements
```python
# MANDATORY: Upload integrity validation pattern
upload_hash = hashlib.md5(content).hexdigest()
with open(temp_file_path, "wb") as f:
    f.write(content)
with open(temp_file_path, "rb") as f:
    written_content = f.read()
    written_hash = hashlib.md5(written_content).hexdigest()

if upload_hash != written_hash:
    os.unlink(temp_file_path)
    raise HTTPException(500, "Upload integrity check failed")
```

#### Architecture Review Requirements
- **EVERY** file upload endpoint must undergo integrity validation review
- **NO** upload functionality deployed without checksum verification
- **ALL** file processing systems require before/after validation
- **MANDATORY** integrity metadata in API responses

### Lessons Learned Database
**2025-09-20**: Upload integrity validation oversight - Architecture failed to identify critical data integrity gaps in file upload system. **RESOLUTION**: Mandatory upload validation checklist added to all future reviews.

---

## BMAD Development Agent Operating Procedures

### Core Responsibilities
1. **Code Implementation & Testing**
2. **API Development & Integration**
3. **Performance Optimization**
4. **Bug Resolution & Debugging**

### Upload Integrity Implementation Standards
#### Required Implementation Pattern
```python
import hashlib

async def upload_with_integrity_validation(file: UploadFile):
    content = await file.read()
    upload_hash = hashlib.md5(content).hexdigest()
    upload_size = len(content)

    # Validate file format
    if not content.startswith(expected_header):
        raise HTTPException(400, "Invalid file format")

    # Write file
    with open(temp_path, "wb") as f:
        f.write(content)

    # Verify integrity
    with open(temp_path, "rb") as f:
        written_content = f.read()
        written_hash = hashlib.md5(written_content).hexdigest()
        written_size = len(written_content)

    if upload_hash != written_hash or upload_size != written_size:
        os.unlink(temp_path)
        raise HTTPException(500, "Upload integrity check failed")

    return {
        "integrity_verified": True,
        "upload_hash": upload_hash,
        "verified_size": written_size
    }
```

### Performance Standards
- **Upload validation overhead**: <50ms for files up to 25MB
- **Checksum calculation**: Use MD5 for speed, SHA256 for security-critical
- **Memory efficiency**: Stream large files, avoid loading entire content

---

## BMAD QA Agent Operating Procedures

### Core Responsibilities
1. **Comprehensive Testing & Validation**
2. **Quality Assurance & Bug Detection**
3. **Performance Benchmarking**
4. **Security Testing**

### Upload Integrity Testing Requirements
#### Mandatory Test Cases
1. **Valid Upload Test**: Verify successful integrity validation
2. **Corruption Test**: Simulate file corruption during upload
3. **Size Mismatch Test**: Test partial upload scenarios
4. **Format Validation Test**: Test invalid file headers
5. **Performance Test**: Measure validation overhead
6. **Concurrent Upload Test**: Test multiple simultaneous uploads

#### Test Implementation Example
```python
async def test_upload_integrity():
    # Test valid upload
    response = await upload_pdf(valid_pdf_content)
    assert response["integrity_verified"] == True

    # Test corruption detection
    corrupted_content = valid_pdf_content[:-100]  # Truncate
    with pytest.raises(HTTPException) as exc:
        await upload_pdf(corrupted_content)
    assert "integrity check failed" in str(exc.value)
```

### Quality Gates
- **100%** upload integrity validation coverage required
- **<1%** false positive rate for integrity checks
- **<50ms** validation overhead for 25MB files
- **Zero** data corruption incidents in production

---

## BMAD Orchestrator Operating Procedures

### Strategic Oversight
1. **Cross-team coordination & communication**
2. **Quality standards enforcement**
3. **Performance monitoring & optimization**
4. **Risk assessment & mitigation**

### Upload Integrity Governance
#### Quality Standards
- **ALL** file processing systems must implement integrity validation
- **ZERO TOLERANCE** for data integrity gaps in production
- **MANDATORY** architecture review for upload functionality
- **AUTOMATED** integrity testing in CI/CD pipeline

#### Risk Mitigation
- **Data Loss Prevention**: Checksum validation prevents corruption
- **Security Enhancement**: File format validation prevents malicious uploads
- **User Experience**: Fast validation maintains performance targets
- **Compliance**: Integrity tracking for audit requirements

---

## Critical Incidents & Resolutions

### Incident 2025-09-20: Upload Integrity Validation Gap
**Issue**: System lacked comprehensive upload integrity validation
**Impact**: Potential data corruption during file uploads
**Root Cause**: Architecture oversight in initial system design
**Resolution**: Implemented mandatory integrity validation with checksums
**Prevention**: Added upload validation to BMAD operating procedures

**Lessons Learned**:
- File upload systems are critical data integrity boundaries
- Checksum validation must be mandatory, not optional
- Architecture reviews must include data integrity assessment
- All agents must prioritize data validation in their procedures

---

## Version History
- **v2.1** (2025-09-20): Added upload integrity validation requirements
- **v2.0** (2025-09-19): Thread pool executor implementation procedures
- **v1.5** (2025-09-18): False positive detection and prevention
- **v1.0** (2025-09-15): Initial BMAD framework procedures

**Next Review Date**: 2025-10-20