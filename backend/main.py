
import os
import re
import secrets
from datetime import datetime, timedelta, timezone

import random
import smtplib
from email.message import EmailMessage
from twilio.rest import Client

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pwdlib import PasswordHash
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

import smtplib
from email.message import EmailMessage

load_dotenv()
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "local-testing-secret-change-me")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
COMPANY_DOMAIN = "@skkhetaninfra.in"
ALGORITHM = "HS256"
TOKEN_HOURS = 8

# Database
DATABASE_URL = "sqlite:///./users.db"
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)
Base = declarative_base()
password_hash = PasswordHash.recommended()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)


Base.metadata.create_all(bind=engine)

app = FastAPI(title="S.K. Khetan Login API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# def valid_company_email(email: str) -> bool:
#     email = email.strip().lower()
#     return bool(
#         re.fullmatch(
#             r"[a-z0-9._%+-]+@skkhetaninfra\.in",
#             email
#         )
#     )

def valid_company_email(email: str) -> bool:
    email = email.strip().lower()
    return bool(
        re.fullmatch(
            r"[a-z0-9._%+-]+@skkhetaninfra\.in",
            email
        )
    )

def create_access_token(email: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS)
    payload = {"sub": email, "exp": expires}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    authorization: str = Header(default="")
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not logged in")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleRequest(BaseModel):
    code: str


class ForgotRequest(BaseModel):
    method: str
    identifier: EmailStr


class VerifyRequest(BaseModel):
    method: str
    identifier: EmailStr
    otp: str
    newPassword: str


# DEMO ONLY: OTPs are stored in memory and printed in the terminal.
# Replace this with a real email/SMS provider before production.
demo_otps = {}


@app.get("/")
def home():
    return {"message": "Login API is running"}


@app.post("/api/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = str(data.email).strip().lower()

    if not valid_company_email(email):
        raise HTTPException(
            status_code=403,
            detail="Use your company email address."
        )

    user = db.query(User).filter(User.email == email).first()

    # if not user or not user.hashed_password:
    #     raise HTTPException(
    #         status_code=401,
    #         detail="Invalid email or password."
    #     )

    # if not password_hash.verify(data.password, user.hashed_password):
    #     raise HTTPException(
    #         status_code=401,
    #         detail="Invalid email or password."
    #     )

    if not user:
     raise HTTPException(
        status_code=401,
        detail="Invalid email address."
    )

    if not user.hashed_password:
     raise HTTPException(
        status_code=401,
        detail="Password login is not available for this account."
    )

    if not password_hash.verify(data.password, user.hashed_password):
     raise HTTPException(
        status_code=401,
        detail="Invalid password."
    )

    return {
        "access_token": create_access_token(email),
        "token_type": "bearer",
        "email": email
    }


# Forgot password request and verification

class ForgotPasswordRequest(BaseModel):
    method: str  # "email" or "mobile"
    identifier: str


class ResetPasswordRequest(BaseModel):
    method: str
    identifier: str
    otp: str
    newPassword: str


# Local in-memory OTP storage. OTPs expire after 5 minutes.
otp_storage = {}


# def send_email_otp(email: str, otp: str):
#     if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD]):
#         raise HTTPException(
#             status_code=500,
#             detail="Email service is not configured."
#         )

#     message = EmailMessage()
#     message["Subject"] = "Password Reset OTP"
#     message["From"] = SMTP_USER
#     message["To"] = email
#     message.set_content(
#         f"Your password reset OTP is {otp}. "
#         "It expires in 5 minutes. Do not share it."
#     )

#     with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
#         server.starttls()
#         server.login(SMTP_USER, SMTP_PASSWORD)
#         server.send_message(message)
def send_email_otp(email: str, otp: str):
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        raise HTTPException(
            status_code=500,
            detail="Email service is not configured."
        )

    message = EmailMessage()
    message["Subject"] = "Password Reset OTP"
    message["From"] = SMTP_USER
    message["To"] = email
    message.set_content(
        f"Your password reset OTP is {otp}.\n"
        "It expires in 5 minutes."
    )

    try:
        with smtplib.SMTP(SMTP_HOST, int(SMTP_PORT)) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
    except Exception as e:
        print("Email sending failed:", e)
        raise HTTPException(
            status_code=500,
            detail="Unable to send email OTP."
        )


# def send_mobile_otp(phone: str, otp: str):
#     if not all([
#         TWILIO_ACCOUNT_SID,
#         TWILIO_AUTH_TOKEN,
#         TWILIO_PHONE_NUMBER
#     ]):
#         raise HTTPException(
#             status_code=500,
#             detail="SMS service is not configured."
#         )

#     client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
#     client.messages.create(
#         body=f"Your password reset OTP is {otp}. It expires in 5 minutes.",
#         from_=TWILIO_PHONE_NUMBER,
#         to=phone
#     )
def send_mobile_otp(phone: str, otp: str):
    print(f"OTP for {phone}: {otp}")


@app.post("/api/auth/forgot-password/request")
def request_password_reset(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    method = data.method.strip().lower()
    identifier = data.identifier.strip()

    if method == "email":
        identifier = identifier.lower()

        if not valid_company_email(identifier):
            raise HTTPException(
                status_code=400,
                detail="Enter a valid company email address."
            )

        user = db.query(User).filter(
            User.email == identifier
        ).first()

    elif method == "mobile":
        # Store phone numbers in international format, e.g. +919876543210.
        if not re.fullmatch(r"\+[1-9]\d{7,14}", identifier):
            raise HTTPException(
                status_code=400,
                detail="Enter a valid mobile number with country code."
            )

        user = db.query(User).filter(
            User.phone == identifier
        ).first()

    else:
        raise HTTPException(
            status_code=400,
            detail="Method must be email or mobile."
        )

    # Do not generate or send an OTP for an unknown account.
    if not user:
        raise HTTPException(
            status_code=404,
            detail="This email address or mobile number is not registered."
        )

    otp = f"{random.SystemRandom().randrange(100000, 1000000)}"

    # Send first. Save the OTP only if delivery succeeds.
    if method == "email":
        send_email_otp(identifier, otp)
    else:
        send_mobile_otp(identifier, otp)

    otp_storage[(method, identifier)] = {
        "otp": otp,
        "expires": datetime.now(timezone.utc) + timedelta(minutes=5),
        "user_id": user.id,
        "attempts": 0
    }

    return {"message": "OTP sent successfully."}


@app.post("/api/auth/forgot-password/verify")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    method = data.method.strip().lower()
    identifier = data.identifier.strip()

    if method == "email":
        identifier = identifier.lower()
        user = db.query(User).filter(
            User.email == identifier
        ).first()
    elif method == "mobile":
        user = db.query(User).filter(
            User.phone == identifier
        ).first()
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid reset method."
        )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Account not found."
        )

    key = (method, identifier)
    saved = otp_storage.get(key)

    if not saved or saved["user_id"] != user.id:
        raise HTTPException(
            status_code=400,
            detail="Please request a new OTP."
        )

    if datetime.now(timezone.utc) >= saved["expires"]:
        otp_storage.pop(key, None)
        raise HTTPException(
            status_code=400,
            detail="OTP has expired. Please request a new one."
        )

    if saved["attempts"] >= 5:
        otp_storage.pop(key, None)
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect attempts. Request a new OTP."
        )

    if not secrets.compare_digest(data.otp, saved["otp"]):
        saved["attempts"] += 1
        raise HTTPException(
            status_code=400,
            detail="Incorrect OTP."
        )

    if len(data.newPassword) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long."
        )

    user.hashed_password = password_hash.hash(data.newPassword)
    db.commit()
    otp_storage.pop(key, None)

    return {"message": "Password reset successfully."}



@app.post("/api/auth/google")
def google_login(data: GoogleRequest, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured on the backend."
        )

    # Exchange the authorization code for Google's tokens.
    token_response = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": data.code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": "postmessage",
            "grant_type": "authorization_code",
        },
        timeout=15
    )

    if not token_response.ok:
        raise HTTPException(
            status_code=401,
            detail="Google authorization failed."
        )

    token_data = token_response.json()
    google_id_token = token_data.get("id_token")

    if not google_id_token:
        raise HTTPException(
            status_code=401,
            detail="Google did not return an ID token."
        )

    try:
        info = id_token.verify_oauth2_token(
            google_id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Google identity could not be verified."
        )

    email = (info.get("email") or "").strip().lower()

    if info.get("email_verified") is not True:
        raise HTTPException(
            status_code=403,
            detail="Your Google email is not verified."
        )

    if not valid_company_email(email):
        raise HTTPException(
            status_code=403,
            detail="Please use your @skkhetaninfra.in Google account."
        )

    # Only allow Google users who have been added to the database.
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=403,
            detail="This company account is not registered."
        )

    return {
        "access_token": create_access_token(email),
        "token_type": "bearer",
        "email": email
    }




# @app.post("/api/auth/forgot-password/request")
# def request_otp(data: ForgotRequest, db: Session = Depends(get_db)):
#     email = str(data.identifier).strip().lower()

#     if not valid_company_email(email):
#         raise HTTPException(
#             status_code=400,
#             detail="Enter a valid company email address."
#         )

#     if data.method not in ("email", "mobile"):
#         raise HTTPException(status_code=400, detail="Invalid OTP method.")

#     user = db.query(User).filter(User.email == email).first()
#     if not user:
#         # Don't reveal whether an account exists.
#         return {"message": "If the account exists, an OTP has been generated."}

#     otp = f"{secrets.randbelow(1000000):06d}"
#     demo_otps[email] = {
#         "otp": otp,
#         "expires": datetime.now(timezone.utc) + timedelta(minutes=5)
#     }

#     print(f"DEMO OTP for {email}: {otp}")

#     return {
#         "message": "Demo OTP generated. Check the backend terminal."
#     }


# @app.post("/api/auth/forgot-password/verify")
# def verify_otp(data: VerifyRequest, db: Session = Depends(get_db)):
#     email = str(data.identifier).strip().lower()

#     if not valid_company_email(email):
#         raise HTTPException(status_code=400, detail="Invalid company email.")

#     if len(data.newPassword) < 8:
#         raise HTTPException(
#             status_code=400,
#             detail="Password must contain at least 8 characters."
#         )

#     saved = demo_otps.get(email)
#     if not saved:
#         raise HTTPException(status_code=400, detail="Request a new OTP.")

#     if datetime.now(timezone.utc) > saved["expires"]:
#         demo_otps.pop(email, None)
#         raise HTTPException(status_code=400, detail="OTP expired.")

#     if not secrets.compare_digest(data.otp, saved["otp"]):
#         raise HTTPException(status_code=400, detail="Incorrect OTP.")

#     user = db.query(User).filter(User.email == email).first()
#     if not user:
#         raise HTTPException(status_code=404, detail="Account not found.")

#     user.hashed_password = password_hash.hash(data.newPassword)
#     db.commit()
#     demo_otps.pop(email, None)

#     return {"message": "Password reset successfully."}


@app.get("/api/dashboard")
def dashboard(email: str = Depends(get_current_user)):
    return {"message": "Welcome to the dashboard", "email": email}


@app.post("/api/auth/logout")
def logout():
    # JWT logout is handled by deleting the token in the frontend.
    return {"message": "Logged out successfully."}


# @app.post("/api/dev/create-test-user")
# def create_test_user(db: Session = Depends(get_db)):
#     # Local testing only. Remove or protect this endpoint before deployment.
#     email = "kunusotu.eshwar@skkhetaninfra.in"
#     password = "Camel@1234"

#     user = db.query(User).filter(User.email == email).first()
#     if user:
#         user.hashed_password = password_hash.hash(password)
#         db.commit()
#         return {"message": "Test account password reset."}

#     user = User(
#         email=email,
#         hashed_password=password_hash.hash(password)
#     )
#     db.add(user)
#     db.commit()

#     return {"message": "Test account created."}

@app.post("/api/dev/create-test-user")
def create_test_user(db: Session = Depends(get_db)):
    # Local testing only
    email = "kunusotu.eshwar@skkhetaninfra.in"
    password = "Camel@1234"
    phone = "+917793992130"   # Replace with your test mobile number

    user = db.query(User).filter(User.email == email).first()

    if user:
        user.hashed_password = password_hash.hash(password)
        user.phone = phone
        db.commit()

        return {
            "message": "Test account updated.",
            "email": email,
            "phone": phone
        }

    user = User(
        email=email,
        phone=phone,
        hashed_password=password_hash.hash(password)
    )

    db.add(user)
    db.commit()

    return {
        "message": "Test account created.",
        "email": email,
        "phone": phone
    }