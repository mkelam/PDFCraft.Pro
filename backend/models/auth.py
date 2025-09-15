"""
Authentication and Authorization Models
JWT tokens, API keys, and user management for PDF SaaS Platform
"""

from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from enum import Enum
import uuid

class UserRole(str, Enum):
    """User roles with different access levels"""
    ADMIN = "admin"
    ENTERPRISE = "enterprise"
    BUSINESS = "business"
    INDIVIDUAL = "individual"
    TRIAL = "trial"

class PlanType(str, Enum):
    """Subscription plan types"""
    FREE = "free"
    STARTER = "starter"     # $10/month - 100 docs
    BUSINESS = "business"   # $30/month - 1000 docs
    ENTERPRISE = "enterprise"  # $100/month - unlimited
    CUSTOM = "custom"

class APIKeyScope(str, Enum):
    """API key permission scopes"""
    READ = "read"           # Get job status, download files
    WRITE = "write"         # Upload and process files
    ADMIN = "admin"         # Manage API keys, users
    WEBHOOK = "webhook"     # Receive webhook notifications

# Pydantic Models

class UserBase(BaseModel):
    """Base user information"""
    email: EmailStr
    full_name: str
    company: Optional[str] = None
    role: UserRole = UserRole.INDIVIDUAL
    plan_type: PlanType = PlanType.FREE
    is_active: bool = True

class UserCreate(UserBase):
    """User creation model"""
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    """User update model"""
    full_name: Optional[str] = None
    company: Optional[str] = None
    plan_type: Optional[PlanType] = None
    is_active: Optional[bool] = None

class User(UserBase):
    """Full user model"""
    id: str
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    email_verified: bool = False

    # Usage tracking
    monthly_documents_processed: int = 0
    total_documents_processed: int = 0
    monthly_limit: int = 100  # Based on plan

    class Config:
        from_attributes = True

class APIKeyCreate(BaseModel):
    """API key creation model"""
    name: str = Field(..., description="Human-readable name for the API key")
    description: Optional[str] = None
    scopes: List[APIKeyScope] = [APIKeyScope.READ, APIKeyScope.WRITE]
    expires_at: Optional[datetime] = None
    rate_limit_per_hour: int = 1000  # Default rate limit

class APIKey(BaseModel):
    """API key model"""
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    key_prefix: str  # First 8 chars for identification
    scopes: List[APIKeyScope]
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_used: Optional[datetime] = None
    is_active: bool = True

    # Usage tracking
    requests_count: int = 0
    rate_limit_per_hour: int = 1000

    class Config:
        from_attributes = True

class APIKeyResponse(BaseModel):
    """API key response (includes full key only once)"""
    id: str
    name: str
    key: str  # Full key - only shown once!
    key_prefix: str
    scopes: List[APIKeyScope]
    expires_at: Optional[datetime] = None
    rate_limit_per_hour: int

class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    refresh_token: Optional[str] = None

class TokenData(BaseModel):
    """Token payload data"""
    user_id: str
    email: str
    role: UserRole
    scopes: List[str] = []

class LoginRequest(BaseModel):
    """Login request model"""
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str

class PasswordResetRequest(BaseModel):
    """Password reset request"""
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str
    new_password: str = Field(..., min_length=8)

class UsageStats(BaseModel):
    """User usage statistics"""
    user_id: str
    current_month: int
    current_year: int
    documents_processed: int
    processing_time_total_ms: int
    api_requests_count: int
    storage_used_bytes: int
    monthly_limit: int
    plan_type: PlanType

class BillingInfo(BaseModel):
    """Billing information"""
    user_id: str
    plan_type: PlanType
    monthly_limit: int
    current_usage: int
    billing_cycle_start: datetime
    billing_cycle_end: datetime
    amount_due: float
    currency: str = "USD"
    is_overuse: bool = False

# Enterprise features

class OrganizationCreate(BaseModel):
    """Organization creation for enterprise customers"""
    name: str
    domain: str  # Email domain for automatic user association
    plan_type: PlanType = PlanType.ENTERPRISE
    monthly_limit: int = 10000

class Organization(BaseModel):
    """Organization model"""
    id: str
    name: str
    domain: str
    plan_type: PlanType
    monthly_limit: int
    created_at: datetime
    owner_id: str

    # Enterprise features
    sso_enabled: bool = False
    custom_branding: bool = False
    dedicated_support: bool = False

    class Config:
        from_attributes = True

class WebhookEndpoint(BaseModel):
    """Webhook endpoint configuration"""
    id: str
    user_id: str
    url: str
    secret: str  # For webhook signature verification
    events: List[str]  # job.completed, job.failed, etc.
    is_active: bool = True
    created_at: datetime
    last_triggered: Optional[datetime] = None

# Rate limiting and security

class RateLimitInfo(BaseModel):
    """Rate limit information"""
    requests_remaining: int
    requests_limit: int
    reset_time: datetime
    retry_after: Optional[int] = None  # seconds to wait

class SecurityEvent(BaseModel):
    """Security event logging"""
    id: str
    user_id: Optional[str] = None
    api_key_id: Optional[str] = None
    event_type: str  # login_failed, api_key_compromised, rate_limit_exceeded
    ip_address: str
    user_agent: str
    details: dict
    created_at: datetime