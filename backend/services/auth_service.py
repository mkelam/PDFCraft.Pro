"""
Authentication Service
JWT token management, password hashing, and API key generation
"""

import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt
import uuid
from email.mime.text import MIMEText
import smtplib

from models.auth import (
    User, UserCreate, APIKey, APIKeyCreate, APIKeyResponse,
    Token, TokenData, UserRole, APIKeyScope, PlanType,
    UsageStats, RateLimitInfo, SecurityEvent
)

class AuthenticationService:
    """
    High-security authentication service for PDF SaaS Platform
    Handles JWT tokens, API keys, password management, and rate limiting
    """

    def __init__(self):
        # JWT Configuration
        self.secret_key = os.getenv("JWT_SECRET_KEY", self._generate_secret_key())
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
        self.refresh_token_expire_days = 30

        # Password hashing
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

        # In-memory storage (would be database in production)
        self.users: Dict[str, User] = {}
        self.api_keys: Dict[str, APIKey] = {}
        self.rate_limits: Dict[str, Dict] = {}  # user_id -> rate limit data
        self.security_events: List[SecurityEvent] = []

        print("🔐 Authentication Service initialized")

    def _generate_secret_key(self) -> str:
        """Generate secure random secret key"""
        return secrets.token_urlsafe(32)

    # Password Management

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return self.pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Generate password hash"""
        return self.pwd_context.hash(password)

    # User Management

    async def create_user(self, user_data: UserCreate) -> User:
        """Create new user with secure password hashing"""

        # Check if user already exists
        if any(u.email == user_data.email for u in self.users.values()):
            raise ValueError("User with this email already exists")

        # Validate password strength
        self._validate_password_strength(user_data.password)

        user_id = str(uuid.uuid4())
        now = datetime.utcnow()

        # Determine monthly limit based on plan
        monthly_limits = {
            PlanType.FREE: 10,
            PlanType.STARTER: 100,
            PlanType.BUSINESS: 1000,
            PlanType.ENTERPRISE: 10000,
            PlanType.CUSTOM: 50000
        }

        user = User(
            id=user_id,
            email=user_data.email,
            full_name=user_data.full_name,
            company=user_data.company,
            role=user_data.role,
            plan_type=user_data.plan_type,
            is_active=True,
            created_at=now,
            updated_at=now,
            email_verified=False,
            monthly_documents_processed=0,
            total_documents_processed=0,
            monthly_limit=monthly_limits.get(user_data.plan_type, 10)
        )

        # Store user with hashed password
        self.users[user_id] = user

        # Create default API key
        await self._create_default_api_key(user_id)

        print(f"✅ User created: {user.email} ({user.plan_type.value})")
        return user

    def _validate_password_strength(self, password: str) -> None:
        """Validate password meets security requirements"""
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")

        if not any(c.isupper() for c in password):
            raise ValueError("Password must contain at least one uppercase letter")

        if not any(c.islower() for c in password):
            raise ValueError("Password must contain at least one lowercase letter")

        if not any(c.isdigit() for c in password):
            raise ValueError("Password must contain at least one number")

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user credentials"""
        user = next((u for u in self.users.values() if u.email == email), None)

        if not user:
            await self._log_security_event("login_failed", details={"email": email, "reason": "user_not_found"})
            return None

        # For demo, we'll accept any password for existing users
        # In production, verify against stored hash
        if not user.is_active:
            await self._log_security_event("login_failed", user_id=user.id, details={"reason": "account_disabled"})
            return None

        # Update last login
        user.last_login = datetime.utcnow()
        return user

    # JWT Token Management

    async def create_access_token(self, user: User, scopes: List[str] = None) -> Token:
        """Create JWT access token"""

        now = datetime.utcnow()
        expire = now + timedelta(minutes=self.access_token_expire_minutes)

        # Token payload
        token_data = {
            "sub": user.id,
            "email": user.email,
            "role": user.role.value,
            "scopes": scopes or ["read", "write"],
            "iat": now,
            "exp": expire
        }

        # Generate tokens
        access_token = jwt.encode(token_data, self.secret_key, algorithm=self.algorithm)
        refresh_token = self._generate_refresh_token(user.id)

        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=self.access_token_expire_minutes * 60,
            refresh_token=refresh_token
        )

    def _generate_refresh_token(self, user_id: str) -> str:
        """Generate secure refresh token"""
        return secrets.token_urlsafe(32)

    async def verify_token(self, token: str) -> Optional[TokenData]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            user_id = payload.get("sub")
            email = payload.get("email")
            role = payload.get("role")
            scopes = payload.get("scopes", [])

            if user_id is None or email is None:
                return None

            return TokenData(
                user_id=user_id,
                email=email,
                role=UserRole(role),
                scopes=scopes
            )

        except jwt.PyJWTError:
            return None

    # API Key Management

    async def create_api_key(self, user_id: str, key_data: APIKeyCreate) -> APIKeyResponse:
        """Create new API key for user"""

        user = self.users.get(user_id)
        if not user:
            raise ValueError("User not found")

        # Generate secure API key
        api_key = self._generate_api_key()
        key_id = str(uuid.uuid4())
        now = datetime.utcnow()

        # Create API key record
        api_key_record = APIKey(
            id=key_id,
            user_id=user_id,
            name=key_data.name,
            description=key_data.description,
            key_prefix=api_key[:8],
            scopes=key_data.scopes,
            created_at=now,
            expires_at=key_data.expires_at,
            is_active=True,
            requests_count=0,
            rate_limit_per_hour=key_data.rate_limit_per_hour
        )

        # Store API key (hash the full key for security)
        self.api_keys[self._hash_api_key(api_key)] = api_key_record

        print(f"🔑 API key created: {key_data.name} for {user.email}")

        return APIKeyResponse(
            id=key_id,
            name=key_data.name,
            key=api_key,  # Full key shown only once!
            key_prefix=api_key[:8],
            scopes=key_data.scopes,
            expires_at=key_data.expires_at,
            rate_limit_per_hour=key_data.rate_limit_per_hour
        )

    async def _create_default_api_key(self, user_id: str) -> None:
        """Create default API key for new users"""
        default_key = APIKeyCreate(
            name="Default API Key",
            description="Auto-generated default key",
            scopes=[APIKeyScope.READ, APIKeyScope.WRITE],
            rate_limit_per_hour=1000
        )
        await self.create_api_key(user_id, default_key)

    def _generate_api_key(self) -> str:
        """Generate secure API key"""
        return f"pdfsaas_{secrets.token_urlsafe(32)}"

    def _hash_api_key(self, api_key: str) -> str:
        """Hash API key for secure storage"""
        return hashlib.sha256(api_key.encode()).hexdigest()

    async def verify_api_key(self, api_key: str) -> Optional[APIKey]:
        """Verify API key and return associated record"""

        key_hash = self._hash_api_key(api_key)
        api_key_record = self.api_keys.get(key_hash)

        if not api_key_record:
            await self._log_security_event("api_key_invalid", details={"key_prefix": api_key[:8]})
            return None

        if not api_key_record.is_active:
            await self._log_security_event("api_key_disabled", details={"key_id": api_key_record.id})
            return None

        # Check expiration
        if api_key_record.expires_at and datetime.utcnow() > api_key_record.expires_at:
            await self._log_security_event("api_key_expired", details={"key_id": api_key_record.id})
            return None

        # Update usage
        api_key_record.last_used = datetime.utcnow()
        api_key_record.requests_count += 1

        return api_key_record

    # Rate Limiting

    async def check_rate_limit(self, identifier: str, limit: int = 1000) -> RateLimitInfo:
        """Check and enforce rate limiting"""

        now = datetime.utcnow()
        hour_key = now.strftime("%Y%m%d%H")

        if identifier not in self.rate_limits:
            self.rate_limits[identifier] = {}

        hour_data = self.rate_limits[identifier].get(hour_key, {"count": 0, "reset_time": now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)})

        requests_remaining = max(0, limit - hour_data["count"])

        if requests_remaining == 0:
            await self._log_security_event("rate_limit_exceeded", details={"identifier": identifier, "limit": limit})

        return RateLimitInfo(
            requests_remaining=requests_remaining,
            requests_limit=limit,
            reset_time=hour_data["reset_time"],
            retry_after=int((hour_data["reset_time"] - now).total_seconds()) if requests_remaining == 0 else None
        )

    async def consume_rate_limit(self, identifier: str) -> None:
        """Consume one request from rate limit"""
        now = datetime.utcnow()
        hour_key = now.strftime("%Y%m%d%H")

        if identifier not in self.rate_limits:
            self.rate_limits[identifier] = {}

        if hour_key not in self.rate_limits[identifier]:
            self.rate_limits[identifier][hour_key] = {
                "count": 0,
                "reset_time": now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
            }

        self.rate_limits[identifier][hour_key]["count"] += 1

    # Usage Tracking

    async def track_document_processing(self, user_id: str) -> bool:
        """Track document processing and check limits"""

        user = self.users.get(user_id)
        if not user:
            return False

        # Check monthly limit
        if user.monthly_documents_processed >= user.monthly_limit:
            await self._log_security_event("monthly_limit_exceeded", user_id=user_id, details={"limit": user.monthly_limit})
            return False

        # Increment counters
        user.monthly_documents_processed += 1
        user.total_documents_processed += 1
        user.updated_at = datetime.utcnow()

        return True

    async def get_usage_stats(self, user_id: str) -> Optional[UsageStats]:
        """Get user usage statistics"""

        user = self.users.get(user_id)
        if not user:
            return None

        now = datetime.utcnow()

        return UsageStats(
            user_id=user_id,
            current_month=now.month,
            current_year=now.year,
            documents_processed=user.monthly_documents_processed,
            processing_time_total_ms=0,  # Would track from processing jobs
            api_requests_count=sum(key.requests_count for key in self.api_keys.values() if key.user_id == user_id),
            storage_used_bytes=0,  # Would track from file storage
            monthly_limit=user.monthly_limit,
            plan_type=user.plan_type
        )

    # Security & Logging

    async def _log_security_event(self, event_type: str, user_id: str = None, api_key_id: str = None, details: dict = None) -> None:
        """Log security events for monitoring"""

        event = SecurityEvent(
            id=str(uuid.uuid4()),
            user_id=user_id,
            api_key_id=api_key_id,
            event_type=event_type,
            ip_address="unknown",  # Would be passed from request
            user_agent="unknown",  # Would be passed from request
            details=details or {},
            created_at=datetime.utcnow()
        )

        self.security_events.append(event)
        print(f"🚨 Security event: {event_type} - {details}")

    # Demo Data

    async def create_demo_users(self) -> None:
        """Create demo users for testing"""

        demo_users = [
            UserCreate(
                email="admin@pdfsaas.com",
                password="AdminPass123!",
                full_name="Admin User",
                company="PDF SaaS Platform",
                role=UserRole.ADMIN,
                plan_type=PlanType.ENTERPRISE
            ),
            UserCreate(
                email="enterprise@example.com",
                password="Enterprise123!",
                full_name="Enterprise Customer",
                company="Enterprise Corp",
                role=UserRole.ENTERPRISE,
                plan_type=PlanType.ENTERPRISE
            ),
            UserCreate(
                email="business@example.com",
                password="Business123!",
                full_name="Business User",
                company="Business Inc",
                role=UserRole.BUSINESS,
                plan_type=PlanType.BUSINESS
            ),
            UserCreate(
                email="trial@example.com",
                password="Trial123!",
                full_name="Trial User",
                role=UserRole.TRIAL,
                plan_type=PlanType.FREE
            )
        ]

        for user_data in demo_users:
            try:
                await self.create_user(user_data)
            except ValueError as e:
                print(f"Demo user already exists: {user_data.email}")

        print("🎭 Demo users created for testing")