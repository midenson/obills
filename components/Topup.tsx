"use client";

import React, { useState, useEffect } from "react";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import {
  ChevronLeft,
  CreditCard,
  Banknote,
  Landmark,
  History,
  RefreshCw,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export default function FundAccountPage() {
  const router = useRouter();
  const [balance, setBalance] = useState("0.00");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Sync Theme and Balance
  const fetchBalance = () => {
    setIsRefreshing(true);
    const raw = localStorage.getItem("user_session");
    if (raw) {
      const session = JSON.parse(raw);
      setBalance(parseFloat(session.user_data?.balance || "0").toFixed(2));
    }
    setTimeout(() => setIsRefreshing(false), 800);
  };

  useEffect(() => {
    // 1. Theme Logic
    const savedTheme = localStorage.getItem("app_theme");
    setIsDarkMode(savedTheme !== "light"); // Default to dark unless "light" is explicitly set

    // 2. Data Logic
    fetchBalance();
  }, []);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    await Haptics.notification({ type: NotificationType.Success });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleMethodClick = async (method: string) => {
    await Haptics.impact({ style: ImpactStyle.Medium });
    if (method === "bank") {
      setShowBankModal(true);
    } else {
      console.log(`Navigating to ${method}`);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-500 w-full px-5 pt-safe pb-10 font-sans overflow-x-hidden ${
        isDarkMode ? "bg-[#0f0a14] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Header */}
      <header className="flex justify-between items-center py-6">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="icon"
          className={`rounded-full h-9 w-9 ${
            isDarkMode
              ? "bg-zinc-900 text-white"
              : "bg-white shadow-sm text-slate-600"
          }`}
        >
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-base font-bold tracking-tight">Fund Wallet</h1>
        <Button
          variant="ghost"
          size="icon"
          className={`rounded-full h-9 w-9 ${
            isDarkMode
              ? "bg-zinc-900 text-white"
              : "bg-white shadow-sm text-slate-600"
          }`}
        >
          <History size={18} />
        </Button>
      </header>

      {/* Balance Display */}
      <Card
        className={`border-none rounded-[1.8rem] overflow-hidden mb-8 shadow-xl transition-all duration-500 ${
          isDarkMode ? "bg-[#1c1425]" : "bg-white border border-slate-100"
        }`}
      >
        <CardContent className="p-7 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-1">
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${
                isDarkMode ? "text-zinc-500" : "text-slate-400"
              }`}
            >
              Available Balance
            </p>
            <RefreshCw
              size={12}
              className={`cursor-pointer ${
                isRefreshing ? "animate-spin" : ""
              } ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}
              onClick={fetchBalance}
            />
          </div>
          <h2
            className={`text-4xl font-black tracking-tight ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}
          >
            <span className="text-xl font-medium text-emerald-500 mr-1">₦</span>
            {parseFloat(balance).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </h2>
        </CardContent>
      </Card>

      {/* Funding Methods */}
      <div className="space-y-3">
        <p
          className={`text-[10px] font-bold uppercase tracking-widest ml-1 mb-1 ${
            isDarkMode ? "text-zinc-500" : "text-slate-400"
          }`}
        >
          Select Method
        </p>
        <FundingMethod
          isDark={isDarkMode}
          title="Bank Transfer"
          desc="Automated virtual account"
          icon={<Landmark className="text-blue-500" />}
          onClick={() => handleMethodClick("bank")}
        />
        <FundingMethod
          isDark={isDarkMode}
          title="Debit Card"
          desc="Instant top-up via Paystack"
          icon={<CreditCard className="text-orange-500" />}
          onClick={() => handleMethodClick("card")}
        />
        <FundingMethod
          isDark={isDarkMode}
          title="Manual Funding"
          desc="Send receipt to admin"
          icon={<Banknote className="text-green-500" />}
          onClick={() => handleMethodClick("manual")}
        />
      </div>

      {/* BANK TRANSFER MODAL */}
      <Dialog open={showBankModal} onOpenChange={setShowBankModal}>
        <DialogContent
          className={`border-none p-0 overflow-hidden fixed bottom-0 top-auto translate-y-0 translate-x-[-50%] 
                     rounded-t-[2.5rem] rounded-b-none w-full max-w-full sm:max-w-[400px] sm:rounded-b-[2.5rem] sm:mb-4
                     ${
                       isDarkMode
                         ? "bg-zinc-950 text-white"
                         : "bg-white text-slate-900"
                     }`}
        >
          {/* Bottom Sheet Handle */}
          <div
            className={`w-12 h-1.5 rounded-full mx-auto mt-4 mb-2 ${
              isDarkMode ? "bg-zinc-800" : "bg-slate-200"
            }`}
          />

          <DialogHeader className="px-6 py-4">
            <DialogTitle className="text-left text-xl font-black">
              Transfer to Account
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-10 space-y-5">
            <div
              className={`p-5 rounded-[2rem] border space-y-5 ${
                isDarkMode
                  ? "bg-zinc-900/50 border-zinc-800"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
              {/* Bank Name */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  Bank Name
                </span>
                <span className="text-sm font-bold text-blue-500">PalmPay</span>
              </div>

              {/* Account Number */}
              <div
                className="flex justify-between items-center cursor-pointer active:opacity-50 transition-all"
                onClick={() => copyToClipboard("9012344576", "account")}
              >
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  Account Number
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-2xl font-black tracking-tighter ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    8035917659
                  </span>
                  <div
                    className={`p-2 rounded-full ${
                      isDarkMode ? "bg-zinc-800" : "bg-white shadow-sm"
                    }`}
                  >
                    {copiedField === "account" ? (
                      <CheckCircle2 className="text-green-500" size={16} />
                    ) : (
                      <Copy className="text-zinc-400" size={16} />
                    )}
                  </div>
                </div>
              </div>

              {/* Account Name */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  Account Name
                </span>
                <span
                  className={`text-sm font-black ${
                    isDarkMode ? "text-zinc-200" : "text-slate-700"
                  }`}
                >
                  ThankGod Osolo
                </span>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                isDarkMode
                  ? "bg-blue-500/5 border-blue-500/10"
                  : "bg-blue-50 border-blue-100"
              }`}
            >
              <p
                className={`text-[10px] text-center leading-relaxed font-medium ${
                  isDarkMode ? "text-zinc-400" : "text-slate-500"
                }`}
              >
                Funds reflect in{" "}
                <span className="text-blue-500 font-bold">2-5 minutes</span>.
                Service provider charge of ₦50 applies to all virtual transfers.
              </p>
            </div>

            <Button
              onClick={() => setShowBankModal(false)}
              className={`w-full h-14 rounded-full font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all ${
                isDarkMode
                  ? "bg-white text-black hover:bg-zinc-200"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              I have made the transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer Support */}
      <div className="mt-12 text-center">
        <button
          className={`font-bold text-[10px] uppercase tracking-[0.2em] hover:text-emerald-500 transition-colors ${
            isDarkMode ? "text-zinc-700" : "text-slate-300"
          }`}
        >
          Support Center
        </button>
      </div>
    </div>
  );
}

function FundingMethod({ title, desc, icon, onClick, isDark }: any) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 p-4 border rounded-[1.8rem] cursor-pointer active:scale-[0.96] transition-all group ${
        isDark
          ? "bg-[#1c1425]/40 border-white/5 hover:bg-zinc-900/60"
          : "bg-white border-slate-100 shadow-sm hover:border-slate-200"
      }`}
    >
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform ${
          isDark ? "bg-zinc-900" : "bg-slate-50"
        }`}
      >
        {React.cloneElement(icon, { size: 22 })}
      </div>
      <div className="flex-1">
        <h3
          className={`font-bold text-[15px] leading-tight ${
            isDark ? "text-zinc-100" : "text-slate-800"
          }`}
        >
          {title}
        </h3>
        <p
          className={`text-[11px] mt-0.5 leading-tight font-medium ${
            isDark ? "text-zinc-500" : "text-slate-400"
          }`}
        >
          {desc}
        </p>
      </div>
      <ChevronLeft
        className={`rotate-180 transition-colors ${
          isDark
            ? "text-zinc-800 group-hover:text-zinc-600"
            : "text-slate-200 group-hover:text-slate-400"
        }`}
        size={18}
      />
    </div>
  );
}
