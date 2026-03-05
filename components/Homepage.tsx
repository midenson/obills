"use client";
import React, { useState, useEffect } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MoreHorizontal,
  MessageSquare,
  Home,
  Wallet,
  CreditCard,
  User,
  Clock,
  Sun,
  Moon,
} from "lucide-react";
import Link from "next/link";

// Service Item with dynamic theme support
const ServiceItem = ({
  label,
  icon,
  color,
  isDark,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  isDark: boolean;
}) => {
  const handlePress = async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
  };

  return (
    <div
      onClick={handlePress}
      className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer"
    >
      <div
        className={`${color} w-16 h-16 rounded-full flex items-center justify-center shadow-inner text-2xl`}
      >
        {icon}
      </div>
      <span
        className={`text-[11px] font-medium text-center leading-tight ${
          isDark ? "text-gray-300" : "text-slate-600"
        }`}
      >
        {label}
      </span>
    </div>
  );
};

export default function FintechDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userData, setUserData] = useState({
    full_name: "User",
    balance: "0.00",
    cashback: "0.00",
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme");
    setIsDarkMode(savedTheme !== "light");

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const rawSession = localStorage.getItem("user_session");
    if (rawSession) {
      try {
        const session = JSON.parse(rawSession);
        // Mapping from the user's provided local storage structure
        const profile = session.user_data || {};
        
        setUserData({
          full_name: profile.full_name || "User",
          balance: parseFloat(profile.balance || 0).toLocaleString(
            undefined,
            { minimumFractionDigits: 2 }
          ),
          cashback: parseFloat(profile.cashback || 0).toLocaleString(
            undefined,
            { minimumFractionDigits: 2 }
          ),
        });
      } catch (e) {
        console.error("Failed to parse session", e);
      }
    }

    return () => clearInterval(timer);
  }, []);

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("app_theme", newMode ? "dark" : "light");
    await Haptics.impact({ style: ImpactStyle.Medium });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-500 pb-24 pt-safe px-6 ${
        isDarkMode ? "bg-[#0f0a14] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Header Section */}
      <header className="flex justify-between items-center py-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-emerald-500">
            <AvatarImage src="/avatar.png" />
            <AvatarFallback className="bg-emerald-500 text-white font-bold">
              {userData.full_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <button
            onClick={toggleTheme}
            className={`relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1 ${
              isDarkMode ? "bg-emerald-500/20" : "bg-slate-200"
            }`}
          >
            <div
              className={`absolute w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 transform ${
                isDarkMode
                  ? "translate-x-7 bg-emerald-500"
                  : "translate-x-0 bg-white shadow-sm"
              }`}
            >
              {isDarkMode ? (
                <Moon size={12} className="text-white" />
              ) : (
                <Sun size={12} className="text-amber-500" />
              )}
            </div>
          </button>
        </div>

        <div
          className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${
            isDarkMode
              ? "bg-gray-800/50 text-emerald-400"
              : "bg-white shadow-sm text-emerald-600"
          }`}
        >
          <Clock className="w-5 h-5" />
        </div>
      </header>

      {/* Greeting Section */}
      <div className="space-y-1 mb-8">
        <p
          className={`text-sm flex items-center gap-2 ${
            isDarkMode ? "text-gray-400" : "text-slate-500"
          }`}
        >
          {isDarkMode ? "🌙" : "☀️"}{" "}
          {currentTime.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()},
          <br />
          <span className="text-emerald-500">{userData.full_name}!</span>
        </h1>
      </div>

      {/* Main Wallet Card */}
      <Card
        className={`border-none rounded-[2.5rem] overflow-hidden mb-8 shadow-2xl transition-all duration-500 ${
          isDarkMode ? "bg-[#1c1425]" : "bg-white border border-slate-200"
        }`}
      >
        <CardContent className="p-7">
          <div className="flex justify-between items-center mb-6">
            <div
              className={`flex items-center gap-2 text-xs font-bold tracking-widest uppercase ${
                isDarkMode ? "text-gray-400" : "text-slate-400"
              }`}
            >
              <span className="text-orange-300 text-lg">✦</span> Main Wallet
            </div>
            <div className="flex gap-2">
              <Link href="/fund">
                <Button
                  size="sm"
                  className={`rounded-full px-5 font-bold active:scale-90 transition-transform ${
                    isDarkMode
                      ? "bg-white text-black hover:bg-gray-200"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  Add Money
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full h-9 w-9 ${
                  isDarkMode
                    ? "bg-gray-800/50 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <h2
              className={`text-5xl tracking-tighter font-bold ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              <span className="text-2xl mr-1 text-emerald-500 font-medium">
                ₦
              </span>
              {userData.balance}
            </h2>
            <p className="text-xs flex items-center gap-2 mt-2">
              <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold">
                ₦{userData.cashback}
              </span>
              <span
                className={`font-medium ${
                  isDarkMode ? "text-gray-500" : "text-slate-400"
                }`}
              >
                Available Cashback
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div
        className={`rounded-[2.5rem] p-8 grid grid-cols-3 gap-y-10 gap-x-4 relative border transition-all duration-500 shadow-xl ${
          isDarkMode
            ? "bg-[#1c1425]/40 border-white/5"
            : "bg-white border-slate-100"
        }`}
      >
        <Link href={"./data"}>
          <ServiceItem
            isDark={isDarkMode}
            label="Cheap Data"
            color="bg-[#d1c4f9]"
            icon="📡"
          />
        </Link>
        <Link href={"./airtime"}>
          <ServiceItem
            isDark={isDarkMode}
            label="Airtime"
            color="bg-[#b4f0d5]"
            icon="📞"
          />
        </Link>
        <Link href={"./cable"}>
          <ServiceItem
            isDark={isDarkMode}
            label="Cable TV"
            color="bg-[#f9c4eb]"
            icon="📺"
          />
        </Link>
        <Link href={"./fund"}>
          <ServiceItem
            isDark={isDarkMode}
            label="Fund Wallet"
            color="bg-[#fce5b4]"
            icon="💳"
          />
        </Link>
        <Link href={"./electricity"}>
          <ServiceItem
            isDark={isDarkMode}
            label="Electricity"
            color="bg-[#b4e6f0]"
            icon="⭐"
          />
        </Link>
        <Link href={"./exam"}>
          <ServiceItem
            isDark={isDarkMode}
            label="Exam"
            color="bg-[#b4c7f0]"
            icon={<span className="text-sm font-black italic">Exam</span>}
          />
        </Link>

        <Link href={"./smile"}>
          <ServiceItem
            isDark={isDarkMode}
            label="Smile"
            color="bg-[#ffd8be]"
            icon="😊"
          />
        </Link>
        <Link href={"./ratel"}>
          <ServiceItem
            isDark={isDarkMode}
            label="Ratel"
            color="bg-[#e2f0b4]"
            icon="🚀"
          />
        </Link>
        <Link href={"./kirani"}>
          <ServiceItem
            isDark={isDarkMode}
            label="Kirani"
            color="bg-[#f9d1d1]"
            icon="🔥"
          />
        </Link>

        <div className="col-span-3 flex flex-col items-center mt-6 gap-4">
          <p
            className={`text-[11px] uppercase tracking-widest font-bold ${
              isDarkMode ? "text-gray-500" : "text-slate-400"
            }`}
          >
            Need more services?
          </p>
          <Button
            variant="outline"
            className={`rounded-full bg-transparent px-8 active:scale-95 transition-all ${
              isDarkMode
                ? "border-gray-700 text-gray-300 hover:bg-white/5"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            Suggest a Product
          </Button>
        </div>

        <div className="absolute right-4 -bottom-6 bg-emerald-500 p-4 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-90 transition-transform cursor-pointer">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav
        className={`fixed bottom-0 left-0 right-0 border-t px-8 py-4 flex justify-between items-end pb-8 backdrop-blur-xl transition-all duration-500 ${
          isDarkMode
            ? "bg-black/80 border-white/5"
            : "bg-white/90 border-slate-100"
        }`}
      >
        <NavItem active label="Home" icon={<Home />} isDark={isDarkMode} />
        <Link href="/nin">
          <NavItem label="Nin" icon={<Wallet />} isDark={isDarkMode} />
        </Link>
        <Link href={"/bvn"}>
          <NavItem label="Bvn" icon={<CreditCard />} isDark={isDarkMode} />
        </Link>
        <Link href={"/profile"}>
          <NavItem label="Me" icon={<User />} isDark={isDarkMode} />
        </Link>
      </nav>
    </div>
  );
}

const NavItem = ({ label, icon, active = false, isDark }: any) => (
  <div
    className={`flex flex-col items-center gap-1.5 transition-colors ${
      active ? "text-emerald-400" : isDark ? "text-gray-600" : "text-slate-400"
    }`}
  >
    <div className={`${active ? "bg-emerald-400/10 p-2 rounded-xl" : "p-2"}`}>
      {React.cloneElement(icon, { size: 22 })}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-tight">
      {label}
    </span>
  </div>
);