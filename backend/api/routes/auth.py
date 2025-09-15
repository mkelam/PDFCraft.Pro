"""
Authentication API Routes
User registration, login, API key management, and security features
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
import time
from datetime import datetime

from models.auth import (
    UserCreate, User, LoginRequest, Token, APIKeyCreate, APIKeyResponse,
    APIKey, UsageStats, PasswordResetRequest, UserRole, APIKeyScope
)
from services.auth_service import AuthenticationService

router = APIRouter()
security = HTTPBearer()

# Initialize authentication service
auth_service = AuthenticationService()

# Dependency to get current user from JWT token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from JWT token"""
    token_data = await auth_service.verify_token(credentials.credentials)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = auth_service.users.get(token_data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is disabled")

    return user

# Dependency to get current user from API key
async def get_current_user_from_api_key(
    request: Request,
    x_api_key: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None)
) -> User:
    """Get current user from API key (X-API-Key header or Bearer token)"""

    api_key = None

    # Check X-API-Key header
    if x_api_key:
        api_key = x_api_key
    # Check Authorization header with API key
    elif authorization and authorization.startswith("Bearer pdfsaas_"):
        api_key = authorization.replace("Bearer ", "")

    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="API key required. Use X-API-Key header or Authorization: Bearer <api_key>"
        )

    # Verify API key
    api_key_record = await auth_service.verify_api_key(api_key)
    if not api_key_record:
        raise HTTPException(status_code=401, detail="Invalid or expired API key")

    # Get user associated with API key
    user = auth_service.users.get(api_key_record.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is disabled")

    # Check rate limits
    rate_limit = await auth_service.check_rate_limit(
        f"api_key:{api_key_record.id}",
        api_key_record.rate_limit_per_hour
    )

    if rate_limit.requests_remaining <= 0:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers={
                "X-RateLimit-Remaining": str(rate_limit.requests_remaining),
                "X-RateLimit-Limit": str(rate_limit.requests_limit),
                "X-RateLimit-Reset": str(int(rate_limit.reset_time.timestamp())),
                "Retry-After": str(rate_limit.retry_after or 3600)
            }
        )

    # Consume rate limit
    await auth_service.consume_rate_limit(f"api_key:{api_key_record.id}")

    # Add rate limit headers to response
    # Note: This would be handled by middleware in production
    return user

# Authentication Routes

@router.post("/register", response_model=User)
async def register_user(user_data: UserCreate):
    """
    Register new user account
    Creates user with secure password hashing and default API key
    """
    try:
        user = await auth_service.create_user(user_data)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest):
    """
    User login with email and password
    Returns JWT access token and refresh token
    """
    user = await auth_service.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Create access token
    token = await auth_service.create_access_token(user)
    return token

@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str):
    """
    Refresh access token using refresh token
    """
    # In production, verify refresh token and create new access token
    raise HTTPException(status_code=501, detail="Refresh token not implemented yet")

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information
    Requires valid JWT token
    """
    return current_user

@router.get("/usage", response_model=UsageStats)
async def get_usage_stats(current_user: User = Depends(get_current_user)):
    """
    Get current user usage statistics
    """
    stats = await auth_service.get_usage_stats(current_user.id)
    if not stats:
        raise HTTPException(status_code=404, detail="Usage stats not found")
    return stats

# API Key Management

@router.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(
    key_data: APIKeyCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create new API key for current user
    Returns full API key (shown only once!)
    """
    try:
        api_key = await auth_service.create_api_key(current_user.id, key_data)
        return api_key
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api-keys", response_model=List[APIKey])
async def list_api_keys(current_user: User = Depends(get_current_user)):
    """
    List all API keys for current user
    Does not include full key values for security
    """
    user_keys = [
        key for key in auth_service.api_keys.values()
        if key.user_id == current_user.id
    ]
    return user_keys

@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete/deactivate API key
    """
    # Find API key belonging to current user
    api_key = None
    for key in auth_service.api_keys.values():
        if key.id == key_id and key.user_id == current_user.id:
            api_key = key
            break

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Deactivate the key
    api_key.is_active = False
    return {"message": "API key deactivated successfully"}

# Admin Routes (require admin role)

@router.get("/admin/users", response_model=List[User])
async def list_all_users(current_user: User = Depends(get_current_user)):
    """
    List all users (admin only)
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")

    return list(auth_service.users.values())

@router.get("/admin/api-keys", response_model=List[APIKey])
async def list_all_api_keys(current_user: User = Depends(get_current_user)):
    """
    List all API keys across all users (admin only)
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")

    return list(auth_service.api_keys.values())

# Demo endpoints for testing

@router.post("/demo/create-users")
async def create_demo_users():
    """
    Create demo users for testing
    In production, this would be removed or require admin access
    """
    await auth_service.create_demo_users()
    return {"message": "Demo users created successfully"}

@router.get("/demo/test-api-key")
async def test_api_key_access(current_user: User = Depends(get_current_user_from_api_key)):
    """
    Test API key authentication
    Use this endpoint to verify API key is working
    """
    return {
        "message": "API key authentication successful",
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "role": current_user.role,
            "plan_type": current_user.plan_type
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# Security endpoints

@router.post("/security/reset-password")
async def request_password_reset(reset_data: PasswordResetRequest):
    """
    Request password reset
    Sends reset email in production
    """
    # In production, generate secure reset token and send email
    return {"message": "Password reset email sent (if account exists)"}

@router.get("/security/events")
async def get_security_events(current_user: User = Depends(get_current_user)):
    """
    Get security events for current user
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.ENTERPRISE]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    user_events = [
        event for event in auth_service.security_events
        if event.user_id == current_user.id or current_user.role == UserRole.ADMIN
    ]

    return user_events[-50:]  # Return last 50 events

# Rate limiting info

@router.get("/rate-limit")
async def get_rate_limit_info(current_user: User = Depends(get_current_user_from_api_key)):
    """
    Get current rate limit status
    """
    # This endpoint demonstrates rate limiting in action
    rate_limit = await auth_service.check_rate_limit(
        f"user:{current_user.id}",
        1000  # Default limit
    )

    return {
        "user_id": current_user.id,
        "requests_remaining": rate_limit.requests_remaining,
        "requests_limit": rate_limit.requests_limit,
        "reset_time": rate_limit.reset_time.isoformat(),
        "plan_type": current_user.plan_type,
        "monthly_documents_remaining": current_user.monthly_limit - current_user.monthly_documents_processed
    }