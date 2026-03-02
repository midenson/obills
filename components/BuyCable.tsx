"use client";
import React, { useState, useEffect } from "react";
import { ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { useRouter } from "next/navigation";
import { ProviderModal } from "./CableProvider";

const CABLE_PLANS: Record<string, any[]> = {
  "2": [
    {
      id: "dstv-padi",
      title: "DStv Padi",
      price: "4,400",
      duration: "1 Month",
    },
    {
      id: "dstv-yanga",
      title: "DStv Yanga",
      price: "6,000",
      duration: "1 Month",
    },
    {
      id: "dstv-confam",
      title: "DStv Confam",
      price: "11,000",
      duration: "1 Month",
    },
    {
      id: "dstv-compact",
      title: "DStv Compact",
      price: "19,000",
      duration: "1 Month",
    },
    {
      id: "dstv-compact-plus",
      title: "DStv Compact Plus",
      price: "29,500",
      duration: "1 Month",
    },
    {
      id: "dstv-premium",
      title: "DStv Premium",
      price: "44,000",
      duration: "1 Month",
    },
  ],
  "1": [
    { id: "72", title: "GOtv Smallie", price: "1,900", duration: "1 Month" },
    { id: "73", title: "GOtv Jinja", price: "3,300", duration: "1 Month" },
    { id: "74", title: "GOtv Jolli", price: "4,850", duration: "1 Month" },
    { id: "75", title: "GOtv Max", price: "7,200", duration: "1 Month" },
    { id: "76", title: "GOtv Supa", price: "9,600", duration: "1 Month" },
    {
      id: "gotv-supa-plus",
      title: "GOtv Supa Plus",
      price: "15,700",
      duration: "1 Month",
    },
  ],
  "3": [
    {
      id: "nova",
      title: "StarTimes Nova",
      price: "1,500",
      duration: "1 Month",
    },
    {
      id: "basic",
      title: "StarTimes Basic",
      price: "3,300",
      duration: "1 Month",
    },
    {
      id: "smart",
      title: "StarTimes Smart",
      price: "4,500",
      duration: "1 Month",
    },
    {
      id: "classic",
      title: "StarTimes Classic",
      price: "5,000",
      duration: "1 Month",
    },
    {
      id: "super",
      title: "StarTimes Super",
      price: "8,500",
      duration: "1 Month",
    },
  ],
};

export default function BuyCablePage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [smartcard, setSmartcard] = useState("");
  const [balance, setBalance] = useState("0.00");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const [selectedProvider, setSelectedProvider] = useState({
    name: "DStv",
    id: "2",
    logo: "/dstv-logo.png",
  });

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const availablePlans = CABLE_PLANS[selectedProvider.id] || [];

  // FIXED: Forces date to Africa/Lagos (UTC+1) to match backend
  const getHandshake = () => {
    const lagosTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    // Intl returns DD/MM/YYYY, we need YYYYMMDD
    const [d, m, y] = lagosTime.split("/");
    return `Token ${y}${m}${d}`;
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme");
    setIsDarkMode(savedTheme !== "light");

    const raw = localStorage.getItem("user_session");
    if (raw) {
      const session = JSON.parse(raw);
      setBalance(session.user_data?.balance || "0.00");
    }
  }, []);

  const handleVerify = async () => {
    if (!smartcard || smartcard.length < 5) {
      setMessage({ type: "error", text: "Enter a valid IUC number" });
      return;
    }
    setIsVerifying(true);
    setMessage(null);
    try {
      const response = await fetch(
        "https://obills.com.ng/app/api/cabletv/verify/index.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: getHandshake(),
          },
          body: JSON.stringify({
            cablename: selectedProvider.id,
            iucnumber: smartcard.trim(),
          }),
        }
      );

      const result = await response.json();
      if (result.status === "success") {
        setIsVerified(true);
        setCustomerName(result.name || "Verified Customer");
        await Haptics.notification({ type: NotificationType.Success });
      } else {
        setIsVerified(false);
        setMessage({
          type: "error",
          text: result.msg || "Verification failed",
        });
        await Haptics.notification({ type: NotificationType.Error });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: "Connection error. Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePurchase = async () => {
    if (!isVerified || !selectedPlan || isLoading) return;
    setIsLoading(true);
    setMessage(null);
    await Haptics.impact({ style: ImpactStyle.Heavy });
    try {
      const raw = localStorage.getItem("user_session");
      if (!raw) throw new Error("No session");
      const session = JSON.parse(raw);

      const response = await fetch(
        "https://obills.com.ng/app/api/cabletv/index.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: getHandshake(),
          },
          body: JSON.stringify({
            cablename: selectedProvider.id,
            cableplan: selectedPlan.id,
            iucnumber: smartcard,
            user_phone: session.user_data?.phone || "",
            amount: selectedPlan.price.replace(/,/g, ""),
            ref: `CAB_${Date.now()}`,
          }),
        }
      );

      const result = await response.json();
      if (result.status === "success") {
        const planPrice = parseFloat(selectedPlan.price.replace(/,/g, ""));
        const newBal = (parseFloat(balance) - planPrice).toFixed(2);
        setBalance(newBal);

        session.user_data.balance = newBal;
        localStorage.setItem("user_session", JSON.stringify(session));

        setMessage({ type: "success", text: "Subscription Successful!" });
        await Haptics.notification({ type: NotificationType.Success });
      } else {
        setMessage({ type: "error", text: result.msg || "Transaction Failed" });
        await Haptics.notification({ type: NotificationType.Error });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen pt-safe pb-10 font-sans ${
        isDarkMode ? "bg-[#0f0a14] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      <header className="px-5 flex justify-between items-center py-6">
        <div className="flex items-center gap-4">
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
          <h1 className="text-base font-bold tracking-tight">Cable TV</h1>
        </div>
        <div
          className={`px-4 py-2 rounded-full flex items-center gap-2 border transition-all ${
            isDarkMode
              ? "bg-[#1c1425] border-white/5 shadow-lg"
              : "bg-white border-slate-100 shadow-sm"
          }`}
        >
          <span
            className={`${
              isDarkMode ? "text-zinc-500" : "text-slate-400"
            } text-[10px] font-bold uppercase tracking-wider`}
          >
            Balance
          </span>
          <span className="font-black text-sm text-emerald-500">
            ₦
            {parseFloat(balance).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </header>

      <div className="px-5 mb-4">
        <ProviderModal
          isDark={isDarkMode}
          selected={selectedProvider}
          onSelect={(p: any) => {
            setSelectedProvider(p);
            setIsVerified(false);
            setSelectedPlan(null);
            setMessage(null);
          }}
        />
      </div>

      <div className="px-5 mb-8">
        <div
          className={`rounded-[2rem] p-7 transition-all border ${
            isDarkMode
              ? "bg-[#1c1425] border-white/5"
              : "bg-white border-slate-100 shadow-sm"
          }`}
        >
          <label
            className={`text-[10px] font-bold uppercase tracking-widest block mb-3 ${
              isDarkMode ? "text-zinc-500" : "text-slate-400"
            }`}
          >
            IUC / Smartcard Number
          </label>
          <div
            className={`flex items-center gap-3 border-b pb-2 ${
              isDarkMode ? "border-zinc-800" : "border-slate-100"
            }`}
          >
            <Input
              type="tel"
              value={smartcard}
              onChange={(e) => {
                setSmartcard(e.target.value.replace(/\D/g, ""));
                setIsVerified(false);
              }}
              placeholder="0000000000"
              className="border-none bg-transparent p-0 text-xl font-black focus-visible:ring-0 placeholder:text-zinc-800"
            />
            {isVerified ? (
              <CheckCircle2 size={22} className="text-emerald-500" />
            ) : (
              <Button
                onClick={handleVerify}
                disabled={isVerifying || !smartcard}
                size="sm"
                className="rounded-full px-4 h-8 font-bold text-[10px] uppercase tracking-wider bg-emerald-500 text-white hover:bg-emerald-600"
              >
                {isVerifying ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  "Verify"
                )}
              </Button>
            )}
          </div>
          {isVerified && (
            <div className="mt-4 flex flex-col gap-1 text-emerald-500 bg-emerald-500/5 p-4 rounded-xl animate-in fade-in zoom-in duration-300">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
                Customer Name
              </span>
              <span className="text-sm font-black">{customerName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 mb-4 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest opacity-50">
          Choose Plan
        </h3>
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-500/10 px-2 py-1 rounded-md">
          {availablePlans.length} Plans
        </span>
      </div>

      <div className="px-5 grid grid-cols-2 gap-4 mb-8">
        {availablePlans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => setSelectedPlan(plan)}
            className={`p-5 rounded-[2rem] border transition-all h-36 flex flex-col justify-between cursor-pointer active:scale-95 duration-300 ${
              selectedPlan?.id === plan.id
                ? "border-emerald-500 bg-emerald-500/5 ring-4 ring-emerald-500/10"
                : isDarkMode
                ? "bg-[#1c1425] border-white/5"
                : "bg-white border-slate-100"
            }`}
          >
            <div>
              <h4
                className={`font-bold text-xs line-clamp-2 leading-tight ${
                  isDarkMode ? "text-zinc-100" : "text-slate-800"
                }`}
              >
                {plan.title}
              </h4>
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">
                {plan.duration}
              </span>
            </div>
            <p className="font-black text-xl tracking-tighter">₦{plan.price}</p>
          </div>
        ))}
      </div>

      <div className="px-5 mt-auto">
        {message && (
          <div
            className={`mb-4 p-5 rounded-2xl text-[12px] font-bold text-center border ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20"
            }`}
          >
            {message.text}
          </div>
        )}
        <Button
          onClick={handlePurchase}
          disabled={isLoading || !isVerified || !selectedPlan}
          className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 disabled:opacity-30 transition-all"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" />
          ) : !isVerified ? (
            "Verify to Continue"
          ) : !selectedPlan ? (
            "Select a Plan"
          ) : (
            `Pay ₦${selectedPlan.price}`
          )}
        </Button>
      </div>
    </div>
  );
}
