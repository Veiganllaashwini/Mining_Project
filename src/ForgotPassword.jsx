
import React, { useState } from "react";
import { ArrowLeft, Mail, Smartphone, LockKeyhole } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export default function ForgotPassword({ onClose }) {
  const [method, setMethod] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function validateIdentifier() {
    if (method === "email") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());
    }
    return /^\+?[1-9]\d{7,14}$/.test(identifier.replace(/[\s()-]/g, ""));
  }

  async function sendOtp() {
    setError("");
    setMessage("");

    if (!method) {
      setError("Please choose an OTP method.");
      return;
    }

    if (!identifier.trim()) {
      setError(
        method === "email"
          ? "Please enter your email address."
          : "Please enter your mobile number."
      );
      return;
    }

    if (!validateIdentifier()) {
      setError(
        method === "email"
          ? "Please enter a valid email address."
          : "Please enter a valid mobile number with country code."
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/forgot-password/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            method,
            identifier: identifier.trim()
          })
        }
      );

      if (!response.ok) {
        throw new Error("Unable to send OTP. Please try again.");
      }

      setStep(2);
      setMessage("If the account exists, an OTP has been sent.");
    } catch (err) {
      setError(err.message || "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(newPassword) ||
        !/[a-z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword) ||
        !/[^A-Za-z0-9]/.test(newPassword)) {
      setError(
        "Use uppercase, lowercase, a number, and a special character."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/forgot-password/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            method,
            identifier: identifier.trim(),
            otp,
            newPassword
          })
        }
      );

      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          throw new Error("Invalid or expired OTP. Please try again.");
        }
        throw new Error("Unable to reset password. Please try again.");
      }

      setMessage("Password reset successfully. You can now sign in.");
      setStep(3);
    } catch (err) {
      setError(err.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="forgot-overlay">
      <section
        className="forgot-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-title"
      >
        <button
          type="button"
          className="forgot-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {step !== 3 && (
          <button
            type="button"
            className="back-button"
            onClick={() => {
              setError("");
              setMessage("");
              if (step === 2) setStep(1);
              else onClose();
            }}
          >
            <ArrowLeft size={17} /> Back
          </button>
        )}

        <h2 id="forgot-title">
          {step === 3 ? "Password Reset" : "Forgot Password?"}
        </h2>
        <p className="forgot-description">
          {step === 1 && "Choose how you want to receive your OTP."}
          {step === 2 && "Enter the OTP and create your new password."}
          {step === 3 && "Your password has been changed successfully."}
        </p>

        {step === 1 && (
          <>
            <div className="otp-options">
              <button
                type="button"
                className={`otp-option ${method === "mobile" ? "selected" : ""}`}
                onClick={() => {
                  setMethod("mobile");
                  setError("");
                }}
              >
                <Smartphone size={24} />
                <strong>Mobile OTP</strong>
                <span>Receive OTP on your phone</span>
              </button>

              <button
                type="button"
                className={`otp-option ${method === "email" ? "selected" : ""}`}
                onClick={() => {
                  setMethod("email");
                  setError("");
                }}
              >
                <Mail size={24} />
                <strong>Email OTP</strong>
                <span>Receive OTP in your inbox</span>
              </button>
            </div>

            {method && (
              <div className="forgot-field">
                <label htmlFor="recovery-identifier">
                  {method === "email" ? "Registered email" : "Registered mobile number"}
                </label>
                <input
                  id="recovery-identifier"
                  type={method === "email" ? "email" : "tel"}
                  autoComplete={method === "email" ? "email" : "tel"}
                  placeholder={
                    method === "email"
                      ? "Enter your email address"
                      : "e.g. +919876543210"
                  }
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            )}

            <button
              className="forgot-submit"
              type="button"
              onClick={sendOtp}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        )}

        {step === 2 && (
          <form onSubmit={resetPassword}>
            <div className="forgot-field">
              <label htmlFor="recovery-otp">6-digit OTP</label>
              <input
                id="recovery-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
              />
            </div>

            <div className="forgot-field">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="forgot-field">
              <label htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button className="forgot-submit" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP & Reset Password"}
            </button>

            <button
              type="button"
              className="resend-button"
              onClick={sendOtp}
              disabled={loading}
            >
              Resend OTP
            </button>
          </form>
        )}

        {step === 3 && (
          <button className="forgot-submit" type="button" onClick={onClose}>
            Back to Login
          </button>
        )}

        {error && <p className="forgot-error" role="alert">{error}</p>}
        {message && <p className="forgot-message" role="status">{message}</p>}
      </section>
    </div>
  );
}