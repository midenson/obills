"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, ArrowUpRight, Fingerprint } from "lucide-react";
import Link from "next/link";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";

const Login = () => {
  const [formData, setFormData] = useState({ phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  // A unique identifier for your app's secure vault
  const SECURE_SERVER_KEY = "obills_secure_vault"; 

  useEffect(() => {
    const checkSession = () => {
      const savedSession = localStorage.getItem("user_session");
      const savedToken = localStorage.getItem("userToken");

      if (savedSession && savedToken) {
        router.replace("/dashboard");
      } else {
        setIsChecking(false);
      }
    };

    checkSession();

    const checkNativeBiometrics = async () => {
      try {
        const result = await NativeBiometric.isAvailable();
        if (result.isAvailable) {
          setIsBiometricSupported(true);
        }
      } catch (err) {
        console.log("Biometrics not available.");
        setIsBiometricSupported(false);
      }
    };

    checkNativeBiometrics();
  }, [router]);

  // -------------------------------------------------------------
  // 1. BIOMETRIC LOGIN: Retrieve Secure Credentials & Auto-Login
  // -------------------------------------------------------------
  const handleBiometricLogin = async () => {
    setLoading(true);
    setError("");

    try {
      // First, trigger the visual UI prompt for the user
      await NativeBiometric.verifyIdentity({
        reason: "Log in securely to your account",
        title: "Biometric Sign-In",
        subtitle: "Verify your identity",
        description: "Touch the fingerprint sensor to continue",
      });

      // If verified, retrieve the password from the hardware Keychain
      const credentials = await NativeBiometric.getCredentials({
        server: SECURE_SERVER_KEY,
      });

      // Execute standard login using the retrieved hardware credentials
      await executeServerLogin(credentials.username, credentials.password);

    } catch (err: any) {
      console.error("Biometric Error:", err);
      // If the error is ItemNotFound, it means they haven't logged in with a password yet
      if (err.message && err.message.includes("ItemNotFound")) {
        setError("No fingerprint data saved. Please log in with your password first to enable biometrics.");
      } else {
        setError("Biometric authentication failed or was cancelled.");
      }
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. STANDARD LOGIN: Attempt Login & Save Secure Credentials
  // -------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const success = await executeServerLogin(formData.phone, formData.password);

    if (success && isBiometricSupported) {
      try {
        // If login was successful, save the credentials securely in the hardware
        // so they can use their fingerprint next time.
        await NativeBiometric.setCredentials({
          username: formData.phone,
          password: formData.password,
          server: SECURE_SERVER_KEY,
        });
      } catch (err) {
        console.error("Failed to save biometric credentials:", err);
      }
    }
    
    setLoading(false);
  };

  // -------------------------------------------------------------
  // 3. REUSABLE API LOGIN FUNCTION
  // -------------------------------------------------------------
  const executeServerLogin = async (phoneToUse: string, passwordToUse: string) => {
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

      const response = await fetch(
        "https://obills.com.ng/app/api/account/login/index.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${today}`,
          },
          body: JSON.stringify({
            phone: phoneToUse,
            accesspass: passwordToUse,
          }),
        }
      );

      const rawText = await response.text();
      const cleanText = rawText.trim().replace(/^\uFEFF/, "");

      let result;
      try {
        result = JSON.parse(cleanText);
      } catch (jsonErr) {
        setError("Server communication error. Please try again.");
        return false;
      }

      if (result.status === "success") {
        if (!result.token || result.token.includes("FIX_DATABASE")) {
          setError("Account Error: Your API Key is missing in the database. Please contact admin.");
          return false;
        }

        const sessionData = {
          token: result.token,
          user_data: result.user_data || {},
        };

        localStorage.setItem("user_session", JSON.stringify(sessionData));
        localStorage.setItem("userToken", sessionData.token);
        localStorage.setItem("phone", phoneToUse);

        router.push("/dashboard");
        return true;
      } else {
        setError(result.msg || "Invalid login credentials");
        return false;
      }
    } catch (err) {
      setError("Connection failed. Check your internet.");
      return false;
    }
  };

  // ... (UI Rendering code remains exactly the same as the previous response) ...
  if (isChecking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="animate-pulse flex flex-col items-center">
          <img src="./obills_bg.png" alt="logo" width={100} height={100} className="mb-4" />
          <p className="text-xs text-gray-400 font-medium">Securing session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12 font-sans text-black">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div className="mb-10">
          <img src={"./obills_bg.png"} alt="logo" width={130} height={130} />
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2 text-center w-full">
          Welcome back, User <span className="text-2xl ml-1">😎</span>
        </h1>
        
        <button
          type="button"
          onClick={() => router.push("/signup")}
          className="text-xs text-black underline decoration-gray-400 underline-offset-4 mb-10 hover:text-gray-600 transition-colors"
        >
          Don't have an account? Sign up
        </button>

        <form className="w-full space-y-5" onSubmit={handleLogin}>
          <div className="space-y-1.5">
            <label className="block text-xs text-gray-500 font-medium ml-1">
              Your phone
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="08012345678"
              className="w-full px-4 py-3.5 border border-gray-200 rounded-md text-sm placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-gray-500 font-medium ml-1">
              Your password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required={!loading}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="..............."
                className="w-full pl-4 pr-12 py-3.5 border border-gray-200 rounded-md text-sm placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors bg-white tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Eye size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 p-3 rounded-md border border-red-100">
              <p className="text-red-600 text-xs font-medium text-center">
                {error}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center bg-[#bdf522] hover:bg-[#b0eb14] text-black font-semibold py-4 px-4 rounded-md text-sm transition-all relative disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && (
                <ArrowUpRight className="absolute right-4 w-5 h-5" strokeWidth={2.5} />
              )}
            </button>

            {isBiometricSupported && (
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={loading}
                className="flex items-center justify-center bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-4 rounded-md transition-all hover:border-gray-300 disabled:opacity-70"
                title="Sign in with Biometrics"
              >
                <Fingerprint className="w-5 h-5" strokeWidth={2.5} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="w-4 h-4 rounded-sm border border-gray-300 flex items-center justify-center group-hover:border-gray-400 transition-colors">
                <input type="checkbox" className="hidden peer" />
                <svg className="w-3 h-3 text-black hidden peer-checked:block" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xs text-gray-600">Remember me</span>
            </label>
            <button
              type="button"
              className="text-xs text-gray-600 underline decoration-gray-400 underline-offset-4 hover:text-black transition-colors"
            >
              <Link href={"/forgot"}>Forgot your password?</Link>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;