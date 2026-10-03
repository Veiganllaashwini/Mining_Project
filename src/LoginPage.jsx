// import { useState } from "react";
import React, { useState } from "react";
import { Eye, EyeOff, LockKeyhole, UserRound, ArrowRight, LoaderCircle } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import ForgotPassword from "./ForgotPassword.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export default function LoginPage() {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // async function handleSubmit(event) {
  //   event.preventDefault();
  //   setError("");

  //   const cleanUsername = username.trim();
  //   if (!cleanUsername || !password) {
  //     setError("Enter your username and password to continue.");
  //     return;
  //   }

  //   setIsSubmitting(true);
  //   try {
  //     // The server must validate credentials, apply rate limits, and set a
  //     // secure HttpOnly session cookie. Never authenticate in the browser.
  //     const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json", "Accept": "application/json" },
  //       credentials: "include",
  //       body: JSON.stringify({ username: cleanUsername, password }),
  //     });

  //     if (!response.ok) {
  //       if (response.status === 401) throw new Error("Incorrect username or password.");
  //       if (response.status === 429) throw new Error("Too many attempts. Please try again later.");
  //       throw new Error("We couldn't sign you in. Please try again.");
  //     }

  //     // Replace this with your app's post-login route if your router is used.
  //     window.location.assign("/dashboard");
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // }

//   const googleLogin = useGoogleLogin({
//   flow: "auth-code",

//   onSuccess: async (response) => {
//     setError("");
//     setIsSubmitting(true);

//     try {
//       const result = await fetch(
//         `${API_BASE_URL}/api/auth/google`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//           },
//           credentials: "include",
//           body: JSON.stringify({
//             code: response.code,
//           }),
//         }
//       );

//       if (!result.ok) {
//         throw new Error(
//           "Google sign-in failed. Please try again."
//         );
//       }

//       window.location.assign("/dashboard");
//     } catch (err) {
//       setError(
//         err instanceof Error
//           ? err.message
//           : "Unable to sign in with Google."
//       );
//     } finally {
//       setIsSubmitting(false);
//     }
//   },

//   onError: () => {
//     setError("Google sign-in was cancelled or failed.");
//   },
// });

const googleLogin = useGoogleLogin({
  flow: "auth-code",

  onSuccess: async (response) => {
    setError("");
    setIsSubmitting(true);

    try {
      const result = await fetch(
        `${API_BASE_URL}/api/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            code: response.code,
          }),
        }
      );

      const data = await result.json();

      if (!result.ok) {
        throw new Error(
          data.message || "Google sign-in failed."
        );
      }

      // Check the verified company email returned by backend
      const email = data.email?.toLowerCase();

      if (
        !email ||
        !/^[a-z0-9._%+-]+@skkhetaninfra\.in$/.test(email)
      ) {
        setError(
          "Please sign in using your company email address (@skkhetaninfra.in)."
        );
        return;
      }

      // Allow only company email users to proceed
      window.location.assign("/dashboard");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in with Google."
      );
    } finally {
      setIsSubmitting(false);
    }
  },

  onError: () => {
    setError("Google sign-in failed. Please try again.");
  },
});

  async function handleSubmit(event) {
  event.preventDefault();
  setError("");

  const cleanEmail = username.trim();

  // Validate email format
  // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@skkhetaninfra\.in$/;

  if (!cleanEmail) {
    setError("Please enter your email address.");
    return;
  }

  // if (!emailRegex.test(cleanEmail)) {
  //   setError("Please enter a valid email address.");
  //   return;
  // }
  if (!emailRegex.test(cleanEmail)) {
  setError(
    "Please enter a valid company email address"
  );
  return;
}

  // Validate password
  if (!password) {
    setError("Please enter your password.");
    return;
  }

  if (password.length < 8) {
    setError("Password must be at least 8 characters long.");
    return;
  }

  if (!/[A-Z]/.test(password)) {
    setError("Password must contain at least one uppercase letter.");
    return;
  }

  if (!/[a-z]/.test(password)) {
    setError("Password must contain at least one lowercase letter.");
    return;
  }

  if (!/[0-9]/.test(password)) {
    setError("Password must contain at least one number.");
    return;
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    setError("Password must contain at least one special character.");
    return;
  }

  // Submit only after all validations pass
  setIsSubmitting(true);

  // try {
  //   const response = await fetch(
  //     `${API_BASE_URL}/api/auth/login`,
  //     {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         "Accept": "application/json"
  //       },
  //       credentials: "include",
  //       body: JSON.stringify({
  //         username: cleanEmail,
  //         password: password
  //       })
  //     }
  //   );

  //   if (!response.ok) {
  //     if (response.status === 401) {
  //       throw new Error("Invalid email or password.");
  //     }
  //     if (response.status === 429) {
  //       throw new Error(
  //         "Too many attempts. Please try again later."
  //       );
  //     }
  //     throw new Error("Login failed. Please try again.");
  //   }

  //   window.location.assign("/dashboard");

  // } catch (err) {
  //   setError(
  //     err instanceof Error
  //       ? err.message
  //       : "Something went wrong. Please try again."
  //   );
  // } finally {
  //   setIsSubmitting(false);
  // }


  
try {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        email: cleanEmail,
        password: password
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Login failed. Please try again."
    );
  }

  localStorage.setItem("access_token", data.access_token);
  window.location.assign("/dashboard");

} catch (err) {
  setError(
    err instanceof Error
      ? err.message
      : "Something went wrong. Please try again."
  );
} finally {
  setIsSubmitting(false);
}
}

  // function handleGoogleSignIn() {
  //   // Configure this URL on your server. The server should initiate OAuth,
  //   // validate state/nonce, and handle the callback securely.
  //   const googleAuthUrl = import.meta.env.VITE_GOOGLE_AUTH_URL;
  //   if (!googleAuthUrl) {
  //     setError("Google sign-in is not configured yet. Please use your username and password.");
  //     return;
  //   }
  //   window.location.assign(googleAuthUrl);
  // }

  return (
    <main className="login-shell">
      <section className="visual-panel" aria-label="Mining operations">
        <div className="visual-shade" />
        <div className="visual-brand" aria-label="S.K. Khetan Group Mining">
          <span className="brand-name">S.K. KHETAN GROUP</span>
          <span className="brand-rule" />
          <span className="brand-sector">MINING</span>
        </div>
        <div className="visual-copy">
          <p>Powering Progress<br />Through Responsible Mining</p>
          <span className="copy-accent" />
        </div>
        <p className="visual-footnote">S.K. KHETAN GROUP <span>·</span> MINING</p>
      </section>

      <section className="form-panel">
        <div className="form-content">
          <div className="mobile-brand" aria-label="S.K. Khetan Group Mining">
            <span className="brand-name">S.K. KHETAN GROUP</span>
            <span className="brand-rule" />
            <span className="brand-sector">MINING</span>
          </div>

          <header className="welcome">
            <h1>Welcome Back</h1>
            <p>Sign in to access your account</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="username">Username</label>
              <div className="input-wrap">
                <UserRound className="field-icon" size={19} aria-hidden="true" />
                 {/* <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoCapitalize="none"
                  spellCheck="false"
                  required
                  disabled={isSubmitting}
                />  */}

                <input
  id="username"
  name="username"
  type="email"
  autoComplete="username"
  inputMode="email"
  placeholder="Enter your email address"
  value={username}
  onChange={(event) => setUsername(event.target.value)}
  autoCapitalize="none"
  spellCheck="false"
  required
  disabled={isSubmitting}
/>
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <LockKeyhole className="field-icon" size={19} aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <button
                  className="visibility-button"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <div className="forgot-row">
              {/* <a href="/forgot-password">Forgot password?</a> */}
              <button
  type="button"
  className="forgot-link"
  onClick={() => setShowForgotPassword(true)}
>
  Forgot password?
</button>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="login-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><LoaderCircle className="spinner" size={19} aria-hidden="true" /> Signing in…</>
              ) : (
                <>Login <ArrowRight size={19} aria-hidden="true" /></>
              )}
            </button>
          </form>

          <div className="separator" aria-hidden="true"><span /> <b>OR</b> <span /></div>

          {/* <button className="google-button" type="button" onClick={handleGoogleSignIn} disabled={isSubmitting}>
            <GoogleMark />
            <span>Sign in with Google</span>
          </button> */}
          <button
  className="google-button"
  type="button"
  onClick={() => {
    setError("");
    googleLogin();
  }}
  disabled={isSubmitting}
>
  <GoogleMark />
  <span>
    {isSubmitting ? "Signing in..." : "Sign in with Google"}
  </span>
</button>

          <p className="security-note">Secure access for authorized users only.</p>
        </div>
      </section>
      {showForgotPassword && (
  <ForgotPassword
    onClose={() => setShowForgotPassword(false)}
  />
)}
    </main>
  );
}

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 48 48" role="img" aria-label="Google">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.9 1.3-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.8 27.8a12 12 0 0 1 0-7.6V15H5.9a20 20 0 0 0 0 18l6.9-5.2Z" />
      <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 6 29.5 4 24 4A20 20 0 0 0 5.9 15l6.9 5.2c1.6-4.7 6-8.1 11.2-8.1Z" />
    </svg>
  );
}