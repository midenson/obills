"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  Mail,
  LogOut,
  ShieldCheck,
  AtSign,
  Wallet,
  RotateCw,
  Fingerprint,
  Lock,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();

  // NUCLEAR FIX: Initialize state directly from localStorage if possible to prevent flash
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Biometric States
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  // User Profile State
  const [userData, setUserData] = useState({
    full_name: "Loading...",
    username: "...",
    phone: "...",
    balance: "...",
    level: "Member",
    joined: "...",
    email: "", // Cached for authorization targets
  });

  // Modal Control States
  const [activeModal, setActiveModal] = useState<"password" | "pin" | null>(null);
  const [modalStage, setModalStage] = useState<"request" | "verify">("request");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form Field States
  const [formEmail, setFormEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  
  // Feedback States
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const syncDataFromStorage = useCallback(() => {
    const raw = localStorage.getItem("user_session");
    if (raw) {
      const session = JSON.parse(raw);
      const data = session.user_data;
      setUserData({
        full_name: data.full_name || "N/A",
        username: data.full_name?.toLowerCase().replace(/\s+/g, "_") || "user_unknown",
        phone: data.phone || "No phone linked",
        balance: data.balance || "0.00",
        level: data.level || "Member",
        joined: data.created_at || "Member",
        email: data.email || "", 
      });
      if (data.email) {
        setFormEmail(data.email);
      }
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const raw = localStorage.getItem("user_session");
      if (!raw) return;
      const session = JSON.parse(raw);
      const phone = session.user_data?.phone || localStorage.getItem("phone");

      if (!phone) throw new Error("No phone found for refresh");

      const response = await fetch(
        "https://obills.com.ng/app/api/user/app-refresh/index.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) {}

        const user = result.user_data;
        if (user) {
          localStorage.setItem("balance", user.balance);
          localStorage.setItem("cashback", user.cashback);
          localStorage.setItem("full_name", user.full_name);
          localStorage.setItem("level", user.level);
          if (result.token) localStorage.setItem("token", result.token);

          const updatedSession = {
            ...session,
            token: result.token || session.token,
            user_data: {
              ...session.user_data,
              ...user,
            },
          };
          localStorage.setItem("user_session", JSON.stringify(updatedSession));
        }

        syncDataFromStorage();
      }
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [syncDataFromStorage]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme");
    const dark = savedTheme !== "light";
    setIsDarkMode(dark);

    syncDataFromStorage();

    // Native WebAuthn availability check
    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => {
          setIsBiometricAvailable(available);
          if (available) {
            const isEnrolled = localStorage.getItem("biometrics_enabled") === "true";
            setBiometricsEnabled(isEnrolled);
          }
        })
        .catch(console.error);
    } else {
      setIsBiometricAvailable(false);
    }

    setLoading(false);
  }, [syncDataFromStorage]);

const handleToggleBiometrics = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) {}

    if (biometricsEnabled) {
      // Disabling Biometrics
      localStorage.setItem("biometrics_enabled", "false");
      localStorage.removeItem("bio_phone");
      localStorage.removeItem("bio_pass");
      setBiometricsEnabled(false);
    } else {
      // Enabling Biometrics via WebAuthn
      const raw = localStorage.getItem("user_session");
      if (!raw) return;

      if (!window.PublicKeyCredential) {
        alert("Biometrics not supported on this device/browser.");
        return;
      }

      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const userID = new Uint8Array(16);
        window.crypto.getRandomValues(userID);

        // Triggers the Android/iOS Fingerprint or FaceID enrollment scanner
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: challenge,
            rp: {
              name: "obills",
            },
            user: {
              id: userID,
              name: userData.phone || "user",
              displayName: userData.full_name || "User",
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 },   // ES256
              { type: "public-key", alg: -257 }, // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform", // Forces hardware biometrics
              userVerification: "required",
              residentKey: "discouraged",          // FIX: Prevents forcing iCloud/Google Passkey UI
              requireResidentKey: false,           // FIX: Demotes to local device-bound biometric key
            },
            timeout: 60000,
          },
        });

        if (credential) {
          const credIdString = typeof credential.id === 'string' ? credential.id : window.btoa(String.fromCharCode(...new Uint8Array(credential.id)));
          localStorage.setItem("bio_credentials", credIdString);
          
          // --- SEND TO BACKEND ENDPOINT ---
          const response = await fetch("https://obills.com.ng/app/api/user/register-biometric/index.php", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              phone: userData.phone,
              credential_id: credential.id
            })
          });
          
          const result = await response.json();

          if (result.status === "success") {
            localStorage.setItem("biometrics_enabled", "true");
            localStorage.setItem("bio_phone", userData.phone);
            setBiometricsEnabled(true);
            
            try { await Haptics.notification({ type: NotificationType.Success }); } catch (e) {}
            alert("Biometric authentication successfully enabled and saved!");
          } else {
            try { await Haptics.notification({ type: NotificationType.Error }); } catch (e) {}
            alert(result.msg || "Biometrics scanned, but failed to save to database.");
          }
        }
      } catch (err) {
        console.error("Biometric enrollment error:", err);
        try { await Haptics.notification({ type: NotificationType.Error }); } catch (e) {}
        alert("Could not register biometrics. Please ensure your fingerprint or Face ID is set up in your phone settings.");
      }
    }
  };

  const handleLogout = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) {}
    localStorage.removeItem("user_session");
    localStorage.removeItem("balance");
    localStorage.removeItem("token");
    localStorage.removeItem("userToken");
    localStorage.removeItem("cashback");
    localStorage.removeItem("full_name");
    localStorage.removeItem("app_theme");
    sessionStorage.clear();
    // localStorage.clear();
    try { await Haptics.notification({ type: NotificationType.Success }); } catch (e) {}
    router.push("/");
  };

  const resetFormState = () => {
    setModalStage("request");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setNewPin("");
    setFormError("");
    setFormSuccess("");
    setActionLoading(false);
  };

  const openSecurityModal = async (type: "password" | "pin") => {
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) {}
    setActiveModal(type);
    resetFormState();
    if (userData.email) {
      setFormEmail(userData.email);
    }
  };

  const validatePasswordRequirements = (pass: string) => {
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const isValidLength = pass.length >= 8;
    return { hasUpper, hasNumber, hasSpecial, isValidLength };
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formEmail) {
      setFormError("Please enter your registered email address.");
      return;
    }

    setActionLoading(true);
    const endpoint = activeModal === "password" 
      ? "https://obills.com.ng/app/api/user/forgot-password/index.php"
      : "https://obills.com.ng/app/api/user/forgot-pin/index.php";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formEmail.trim(), action: "request" })
      });

      const data = await response.json();

      if (data.status === "success") {
        try { await Haptics.notification({ type: NotificationType.Success }); } catch (e) {}
        setFormSuccess("Verification code sent! Checks valid for 1 minute.");
        setModalStage("verify");
      } else {
        try { await Haptics.notification({ type: NotificationType.Error }); } catch (e) {}
        setFormError(data.msg || "Failed to deliver OTP request.");
      }
    } catch (err) {
      setFormError("Network communication error. Please check your connection.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!otp || otp.trim().length !== 5) {
      setFormError("Please present a valid 5-digit verification code.");
      return;
    }

    const payload: any = {
      email: formEmail.trim(),
      otp: otp.trim(),
      action: "update"
    };

    if (activeModal === "password") {
      const validation = validatePasswordRequirements(newPassword);
      if (!validation.isValidLength || !validation.hasUpper || !validation.hasNumber || !validation.hasSpecial) {
        setFormError("Password security metrics not met.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setFormError("Password confirmation verification failed.");
        return;
      }
      payload.new_password = newPassword;
    } else {
      if (!/^\d{5}$/.test(newPin)) {
        setFormError("Transaction PIN must be strictly 5 digits long.");
        return;
      }
      payload.new_pin = newPin;
    }

    setActionLoading(true);
    const endpoint = activeModal === "password" 
      ? "https://obills.com.ng/app/api/user/forgot-password/index.php"
      : "https://obills.com.ng/app/api/user/forgot-pin/index.php";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.status === "success") {
        try { await Haptics.notification({ type: NotificationType.Success }); } catch (e) {}
        setFormSuccess(data.msg || "Security criteria updated successfully.");
        setTimeout(() => {
          setActiveModal(null);
          resetFormState();
        }, 2000);
      } else {
        try { await Haptics.notification({ type: NotificationType.Error }); } catch (e) {}
        setFormError(data.msg || "Verification or processing error encountered.");
      }
    } catch (err) {
      setFormError("Security update transaction could not be finished.");
    } finally {
      setActionLoading(false);
    }
  };

  const ProfileItem = ({
    icon: Icon,
    label,
    value,
    highlight = false,
  }: {
    icon: any;
    label: string;
    value: string;
    highlight?: boolean;
  }) => (
    <div
      className={`p-5 rounded-[1.5rem] border transition-all flex items-center gap-4 ${
        isDarkMode
          ? "bg-[#1c1425] border-white/5 text-white"
          : "bg-white border-slate-200/60 shadow-sm text-slate-900"
      }`}
    >
      <div
        className={`h-11 w-11 rounded-xl flex items-center justify-center ${
          isDarkMode ? "bg-white/5 text-zinc-400" : "bg-slate-50 text-slate-400"
        } ${highlight ? "text-emerald-500" : ""}`}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5`}
        >
          {label}
        </p>
        <p
          className={`text-sm font-black tracking-tight truncate ${
            highlight ? "text-emerald-500" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center ${
          isDarkMode ? "bg-[#0f0a14]" : "bg-slate-50"
        }`}
      >
        <div
          className={`animate-pulse font-black text-[10px] tracking-[0.3em] ${
            isDarkMode ? "text-white" : "text-slate-900"
          }`}
        >
          VERIFYING IDENTITY...
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full font-sans transition-colors duration-300 ${
        isDarkMode ? "bg-[#0f0a14] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Header */}
      <header className="px-5 flex justify-between items-center py-8">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="icon"
          className={`rounded-full h-10 w-10 ${
            isDarkMode
              ? "bg-white/5 hover:bg-white/10"
              : "bg-white shadow-sm border border-slate-200"
          }`}
        >
          <ChevronLeft size={22} />
        </Button>
        <h2
          className={`text-[10px] font-black uppercase tracking-[0.4em] ${
            isDarkMode ? "text-zinc-500" : "text-slate-400"
          }`}
        >
          Identity Vault
        </h2>
        <div className="w-10" />
      </header>

      {/* Hero Section */}
      <div className="px-5 mb-10 text-center">
        <div className="relative inline-block mb-6">
          <div
            className={`h-24 w-24 rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-2xl ${
              isDarkMode
                ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white"
                : "bg-slate-900 text-white"
            }`}
          >
            {userData.full_name.charAt(0)}
          </div>
          <div
            className={`absolute -bottom-1 -right-1 h-7 w-7 rounded-full border-4 flex items-center justify-center ${
              isDarkMode
                ? "bg-emerald-500 border-[#0f0a14]"
                : "bg-emerald-500 border-slate-50"
            }`}
          >
            <ShieldCheck size={12} className="text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-black tracking-tighter italic">
          {userData.full_name}
        </h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <p
            className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
              isDarkMode ? "text-zinc-600" : "text-slate-400"
            }`}
          >
            @{userData.username}
          </p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-1 rounded-full transition-all active:scale-95 ${
              isRefreshing
                ? "animate-spin opacity-50"
                : "opacity-30 hover:opacity-100"
            }`}
          >
            <RotateCw size={12} />
          </button>
        </div>
      </div>

      {/* Information Grid */}
      <main className="px-5 space-y-3 max-w-md mx-auto">
        <ProfileItem
          icon={ShieldCheck}
          label="Account Status"
          value={userData.level}
          highlight={true}
        />
        <ProfileItem
          icon={AtSign}
          label="Username"
          value={`@${userData.username}`}
        />
        <ProfileItem icon={Mail} label="Contact" value={userData.phone} />
        <ProfileItem
          icon={Wallet}
          label="Balance"
          value={`₦${parseFloat(userData.balance).toLocaleString()}`}
        />

        {/* Security & Access Section */}
        <div
          className={`mt-8 p-6 rounded-[2rem] border transition-all ${
            isDarkMode
              ? "bg-[#1c1425] border-white/5"
              : "bg-white border-slate-200/60 shadow-sm"
          }`}
        >
          <h4 className={`text-[9px] font-black uppercase tracking-widest mb-4 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
            Security & Access
          </h4>
          
          {/* Biometrics Toggle Component */}
          {isBiometricAvailable && (
            <div
              onClick={handleToggleBiometrics}
              className="w-full h-14 rounded-2xl flex items-center justify-between px-3 hover:bg-white/5 cursor-pointer text-left transition-all font-black border border-transparent mb-2"
            >
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'} ${biometricsEnabled ? 'text-emerald-500' : 'text-zinc-400'}`}>
                  <Fingerprint size={18} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Biometric Login</span>
                  <span className="text-[9px] uppercase font-bold tracking-wider opacity-40 -mt-0.5">
                    {biometricsEnabled ? "Fingerprint / Face ID Active" : "Disabled"}
                  </span>
                </div>
              </div>
              
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-out ${biometricsEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${biometricsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>
          )}

          {/* Change Password Trigger */}
          <button
            onClick={() => openSecurityModal("password")}
            className="w-full h-14 rounded-2xl flex items-center justify-between px-3 hover:bg-white/5 text-left transition-all font-black border border-transparent mb-2"
          >
            <div className="flex items-center gap-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'} ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                <Lock size={18} />
              </div>
              <div className="flex flex-col">
                <span className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Change Password</span>
                <span className="text-[9px] uppercase font-bold tracking-wider opacity-40 -mt-0.5">Update Account Access</span>
              </div>
            </div>
            <ChevronLeft size={16} className="rotate-180 opacity-30" />
          </button>

          {/* Change PIN Trigger */}
          <button
            onClick={() => openSecurityModal("pin")}
            className="w-full h-14 rounded-2xl flex items-center justify-between px-3 hover:bg-white/5 text-left transition-all font-black border border-transparent mb-2"
          >
            <div className="flex items-center gap-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'} ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                <Key size={18} />
              </div>
              <div className="flex flex-col">
                <span className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Change Transaction PIN</span>
                <span className="text-[9px] uppercase font-bold tracking-wider opacity-40 -mt-0.5">Secure Wallet Balance</span>
              </div>
            </div>
            <ChevronLeft size={16} className="rotate-180 opacity-30" />
          </button>

          {/* Logout Trigger */}
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full h-14 rounded-2xl flex items-center justify-between px-3 hover:bg-red-500/10 text-red-600 transition-all font-black"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-red-500/5 text-red-500">
                <LogOut size={18} />
              </div>
              <span className="text-sm">Secure Sign Out</span>
            </div>
            <ChevronLeft size={16} className="rotate-180 opacity-30" />
          </Button>
        </div>

        <p
          className={`text-center text-[8px] font-bold uppercase tracking-[0.3em] py-8 ${
            isDarkMode ? "text-zinc-800" : "text-slate-300"
          }`}
        >
          Internal ID: {userData.username.toUpperCase()}
        </p>
      </main>

      {/* --- PREMIUM COMPREHENSIVE MODAL SYSTEM --- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl transition-all duration-300 animate-fade-in">
          <div 
            className={`w-full max-w-md rounded-[2.5rem] border p-6 relative shadow-2xl transition-all scale-100 ${
              isDarkMode ? "bg-[#130b1c] border-white/5 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Close Toggle Button */}
            <button 
              onClick={() => setActiveModal(null)}
              className={`absolute top-6 right-6 p-2 rounded-full transition-all ${
                isDarkMode ? "bg-white/5 hover:bg-white/10 text-zinc-400" : "bg-slate-100 hover:bg-slate-200 text-slate-500"
              }`}
            >
              <X size={16} />
            </button>

            {/* Modal Typography Header */}
            <div className="mb-6">
              <span className="text-[9px] font-black tracking-[0.25em] text-emerald-500 uppercase block mb-1">
                Security Engine
              </span>
              <h3 className="text-xl font-black tracking-tight">
                {activeModal === "password" ? "Modify Login Password" : "Modify Transaction PIN"}
              </h3>
              <p className={`text-xs opacity-50 mt-1`}>
                {modalStage === "request" 
                  ? "Verify identity metrics with a quick 60-second execution code." 
                  : "Verification payload matching clear. Enter new security hashes below."}
              </p>
            </div>

            {/* Dynamic Status Badges */}
            {formError && (
              <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold tracking-tight">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold tracking-tight flex items-center gap-2">
                <CheckCircle2 size={14} />
                {formSuccess}
              </div>
            )}

            {/* STAGE 1: OTP GENERATION LAYER */}
            {modalStage === "request" ? (
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider opacity-40">Registered Email</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-4 opacity-30" size={16} />
                    <input 
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className={`w-full h-14 pl-12 pr-4 rounded-2xl border text-sm font-bold tracking-tight transition-all outline-none ${
                        isDarkMode 
                          ? "bg-white/5 border-white/5 focus:border-emerald-500/50 text-white" 
                          : "bg-slate-50 border-slate-200 focus:border-slate-400 text-slate-900"
                      }`}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={actionLoading}
                  className="w-full h-14 rounded-2xl font-black text-sm tracking-tight bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-lg shadow-emerald-500/10 mt-2"
                >
                  {actionLoading ? "GENERATING TOKEN..." : "DISPATCH OTP ROUTINE"}
                </Button>
              </form>
            ) : (
              /* STAGE 2: PROCESSING & UPDATE LAYER */
              <form onSubmit={handleUpdateSecurity} className="space-y-4">
                {/* Secure Verification Input */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider opacity-40">5-Digit OTP</label>
                  <input 
                    type="text"
                    pattern="\d*"
                    maxLength={5}
                    required
                    placeholder="00000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className={`w-full h-14 text-center text-xl font-black tracking-[0.5em] rounded-2xl border transition-all outline-none ${
                      isDarkMode 
                        ? "bg-white/5 border-white/5 focus:border-emerald-500/50 text-white" 
                        : "bg-slate-50 border-slate-200 focus:border-slate-400 text-slate-900"
                    }`}
                  />
                </div>

                {/* CONDITION 1: PASSWORD MODIFIER */}
                {activeModal === "password" ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider opacity-40">New Password</label>
                      <div className="relative flex items-center">
                        <input 
                          type={showPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full h-14 pl-4 pr-12 rounded-2xl border text-sm font-bold tracking-tight transition-all outline-none ${
                            isDarkMode 
                              ? "bg-white/5 border-white/5 focus:border-emerald-500/50 text-white" 
                              : "bg-slate-50 border-slate-200 focus:border-slate-400 text-slate-900"
                          }`}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 opacity-30 hover:opacity-100 transition-all"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider opacity-40">Confirm Password</label>
                      <div className="relative flex items-center">
                        <input 
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full h-14 pl-4 pr-12 rounded-2xl border text-sm font-bold tracking-tight transition-all outline-none ${
                            isDarkMode 
                              ? "bg-white/5 border-white/5 focus:border-emerald-500/50 text-white" 
                              : "bg-slate-50 border-slate-200 focus:border-slate-400 text-slate-900"
                          }`}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 opacity-30 hover:opacity-100 transition-all"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Techy Live Requirements Indicator Grid */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 text-[10px] font-bold">
                      <span className="text-[8px] uppercase tracking-wider opacity-40 block mb-1">Pass Metric Checks</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`flex items-center gap-1.5 ${validatePasswordRequirements(newPassword).isValidLength ? 'text-emerald-500' : 'opacity-30'}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${validatePasswordRequirements(newPassword).isValidLength ? 'bg-emerald-500' : 'bg-current'}`} />
                          8+ Characters
                        </div>
                        <div className={`flex items-center gap-1.5 ${validatePasswordRequirements(newPassword).hasUpper ? 'text-emerald-500' : 'opacity-30'}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${validatePasswordRequirements(newPassword).hasUpper ? 'bg-emerald-500' : 'bg-current'}`} />
                          1 Capital Letter
                        </div>
                        <div className={`flex items-center gap-1.5 ${validatePasswordRequirements(newPassword).hasNumber ? 'text-emerald-500' : 'opacity-30'}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${validatePasswordRequirements(newPassword).hasNumber ? 'bg-emerald-500' : 'bg-current'}`} />
                          1 Number
                        </div>
                        <div className={`flex items-center gap-1.5 ${validatePasswordRequirements(newPassword).hasSpecial ? 'text-emerald-500' : 'opacity-30'}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${validatePasswordRequirements(newPassword).hasSpecial ? 'bg-emerald-500' : 'bg-current'}`} />
                          1 Special Character
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* CONDITION 2: PIN MODIFIER */
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider opacity-40">New 5-Digit PIN</label>
                    <input 
                      type="text"
                      pattern="\d*"
                      maxLength={5}
                      required
                      placeholder="•••••"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                      className={`w-full h-14 text-center text-xl font-black tracking-[0.5em] rounded-2xl border transition-all outline-none ${
                        isDarkMode 
                          ? "bg-white/5 border-white/5 focus:border-emerald-500/50 text-white" 
                          : "bg-slate-50 border-slate-200 focus:border-slate-400 text-slate-900"
                      }`}
                    />
                    <div className="flex justify-between items-center px-1 text-[9px] font-bold opacity-40">
                      <span>Strict metric constraint</span>
                      <span>{newPin.length}/5 Digits</span>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={actionLoading}
                  className="w-full h-14 rounded-2xl font-black text-sm tracking-tight bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-lg shadow-emerald-500/10 mt-2"
                >
                  {actionLoading ? "COMMITTING SECURE ENTRIES..." : "EXECUTE MUTATION"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}