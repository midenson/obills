"use client";
import React, { useState, useEffect } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { NetworkModal } from "./NetworkModal";
import { useRouter } from "next/navigation";

const DATA_PLANS: Record<string, any[]> = {
  mtn: [
    {
      id: "403",
      volume: "500MB",
      amount: "100",
      duration: "30 Days",
      tag: "CORPORATE",
    },
    {
      id: "117",
      volume: "1GB",
      amount: "150",
      duration: "30 Days",
      tag: "SME",
    },
    {
      id: "119",
      volume: "1.5GB",
      amount: "210",
      duration: "30 Days",
      tag: "SME",
    },
    {
      id: "118",
      volume: "2GB",
      amount: "290",
      duration: "30 Days",
      tag: "SME",
    },
    {
      id: "122",
      volume: "3GB",
      amount: "500",
      duration: "30 Days",
      tag: "SME",
    },
    {
      id: "124",
      volume: "4GB",
      amount: "600",
      duration: "30 Days",
      tag: "SME",
    },
    {
      id: "120",
      volume: "5GB",
      amount: "730",
      duration: "30 Days",
      tag: "SME",
    },
    {
      id: "125",
      volume: "7GB",
      amount: "1000",
      duration: "30 Days",
      tag: "SME",
    },
    {
      id: "121",
      volume: "10GB",
      amount: "1380",
      duration: "30 Days",
      tag: "SME",
    },
  ],
  airtel: [
    {
      id: "378",
      volume: "150MB",
      amount: "85",
      duration: "1 Day",
      tag: "COUPON",
    },
    {
      id: "374",
      volume: "1GB",
      amount: "810",
      duration: "7 Days",
      tag: "GIFTING",
    },
    {
      id: "375",
      volume: "2GB",
      amount: "1500",
      duration: "30 Days",
      tag: "GIFTING",
    },
  ],
  glo: [
    {
      id: "379",
      volume: "2GB",
      amount: "1100",
      duration: "2 Days",
      tag: "SME",
    },
  ],
  "9mobile": [],
};

const NETWORK_DATA = [
  {
    id: "1",
    name: "MTN",
    prefixes: [
      "0803",
      "0806",
      "0703",
      "0706",
      "0813",
      "0816",
      "0903",
      "0906",
      "0913",
      "0916",
    ],
    icon: "/mtn-logo.svg",
    color: "bg-yellow-400",
  },
  {
    id: "2",
    name: "GLO",
    prefixes: ["0805", "0807", "0705", "0815", "0811", "0905", "0915"],
    icon: "/glo-logo.svg",
    color: "bg-green-500",
  },
  {
    id: "4",
    name: "AIRTEL",
    prefixes: [
      "0802",
      "0808",
      "0708",
      "0812",
      "0701",
      "0902",
      "0901",
      "0907",
      "0912",
      "0917",
    ],
    icon: "/airtel-logo.svg",
    color: "bg-red-500",
  },
  {
    id: "3",
    name: "9MOBILE",
    prefixes: ["0809", "0817", "0818", "0909", "0908"],
    icon: "/9mobile-logo.svg",
    color: "bg-green-900",
  },
];

export default function BuyDataPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("09032139771");
  const [balance, setBalance] = useState("0.00");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORK_DATA[0]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme");
    setIsDarkMode(savedTheme !== "light");
    const raw = localStorage.getItem("user_session");
    if (raw) {
      const session = JSON.parse(raw);
      setBalance(session.user_data?.balance || "0.00");
    }
  }, []);

  useEffect(() => {
    if (phoneNumber.length >= 4) {
      const prefix = phoneNumber.substring(0, 4);
      const detected = NETWORK_DATA.find((net) =>
        net.prefixes.includes(prefix)
      );
      if (detected && detected.id !== selectedNetwork.id) {
        setSelectedNetwork(detected);
        Haptics.impact({ style: ImpactStyle.Light });
      }
    }
  }, [phoneNumber]);

  const handlePurchase = async (e: React.MouseEvent, plan: any) => {
    e.stopPropagation();
    if (phoneNumber.length < 11) {
      setMessage({ type: "error", text: "Enter valid 11-digit phone number" });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    await Haptics.impact({ style: ImpactStyle.Heavy });

    try {
      const raw = localStorage.getItem("user_session");
      if (!raw) throw new Error("No session found");
      const session = JSON.parse(raw);

      // FIX: Prioritize phone number since the 'token' field contains a date bug
      const authToken = session.token;

      const response = await fetch(
        "https://obills.com.ng/app/api/data/index.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Token: authToken,
          },
          body: JSON.stringify({
            token: authToken,
            network: selectedNetwork.id,
            phone: phoneNumber,
            plan: plan.id,
            ref: `DATA_${Date.now()}`,
          }),
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        const updatedBalance = (
          parseFloat(balance) - parseFloat(plan.amount)
        ).toFixed(2);
        const sessionData = JSON.parse(raw);
        if (sessionData.user_data) {
          sessionData.user_data.balance = updatedBalance;
          localStorage.setItem("user_session", JSON.stringify(sessionData));
        }
        setBalance(updatedBalance);
        setMessage({
          type: "success",
          text: result.msg || "Data Purchased Successfully!",
        });
        await Haptics.notification({ type: NotificationType.Success });
      } else {
        setMessage({ type: "error", text: result.msg || "Transaction Failed" });
        await Haptics.notification({ type: NotificationType.Error });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Connection error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  const currentPlans = DATA_PLANS[selectedNetwork.name.toLowerCase()] || [];

  return (
    <div
      className={`min-h-screen pt-safe pb-10 font-sans ${
        isDarkMode ? "bg-[#0f0a14] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      <header className="px-5 flex justify-between items-center py-6">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="icon"
          className={`rounded-full h-10 w-10 ${
            isDarkMode
              ? "bg-zinc-900/50"
              : "bg-white shadow-sm border border-slate-100"
          }`}
        >
          <ChevronLeft size={24} />
        </Button>
        <div
          className={`px-4 py-2 rounded-full flex items-center gap-2 border ${
            isDarkMode
              ? "bg-[#1c1425] border-white/5 shadow-lg"
              : "bg-white border-slate-100 shadow-sm"
          }`}
        >
          <span
            className={`${
              isDarkMode ? "text-zinc-500" : "text-slate-400"
            } text-[10px] font-black uppercase tracking-widest`}
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

      <div className="px-5 mb-8">
        <h1 className="text-4xl font-black tracking-tighter">Cheap Data</h1>
        <p
          className={`text-sm font-medium mt-1 ${
            isDarkMode ? "text-zinc-500" : "text-slate-400"
          }`}
        >
          Feeding your connectivity for{" "}
          <span className="text-emerald-500 uppercase font-black">
            {selectedNetwork.name}
          </span>
        </p>
      </div>

      <div
        className={`mx-5 mb-8 p-4 rounded-[2rem] border flex items-center gap-4 ${
          isDarkMode
            ? "bg-[#1c1425] border-white/5"
            : "bg-white border-slate-100 shadow-sm"
        }`}
      >
        <NetworkModal
          isDark={isDarkMode}
          selected={selectedNetwork}
          onSelect={setSelectedNetwork}
        />
        <div className="flex-1">
          <label
            className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 block ${
              isDarkMode ? "text-zinc-600" : "text-slate-300"
            }`}
          >
            Receiver Phone
          </label>
          <Input
            type="tel"
            maxLength={11}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
            className="h-8 bg-transparent border-none text-xl font-black focus-visible:ring-0 p-0 placeholder:text-zinc-800"
            placeholder="08030000000"
          />
        </div>
      </div>

      {message && (
        <div
          className={`mx-5 mb-6 p-4 rounded-2xl text-[12px] font-black text-center border animate-in slide-in-from-top-2 ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : "bg-red-500/10 text-red-500 border-red-500/20"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="px-5 space-y-4 pb-10">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-50">
            Available Bundles
          </h3>
          <div className="h-[1px] flex-1 bg-current opacity-5 ml-4" />
        </div>

        {currentPlans.length > 0 ? (
          currentPlans.map((plan) => (
            <div
              key={plan.id}
              onClick={(e) => !isLoading && handlePurchase(e, plan)}
              className={`group rounded-[2rem] p-5 flex justify-between items-center border transition-all cursor-pointer active:scale-95 duration-300 ${
                isDarkMode
                  ? "bg-[#1c1425] border-white/5 hover:border-emerald-500/30"
                  : "bg-white border-slate-100 hover:border-emerald-200 shadow-sm"
              }`}
            >
              <div className="space-y-3">
                <p className="text-2xl font-black tracking-tighter group-hover:text-emerald-500 transition-colors">
                  {plan.volume}
                </p>
                <div className="flex gap-2">
                  <span
                    className={`text-[9px] px-3 py-1 rounded-lg font-black uppercase tracking-tighter ${
                      isDarkMode
                        ? "bg-zinc-800 text-zinc-400"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {plan.duration}
                  </span>
                  <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-3 py-1 rounded-lg font-black uppercase tracking-tighter">
                    {plan.tag}
                  </span>
                </div>
              </div>
              <Button
                disabled={isLoading}
                className={`rounded-2xl font-black px-6 h-12 shadow-lg transition-all ${
                  isDarkMode
                    ? "bg-white text-black hover:bg-emerald-400"
                    : "bg-slate-900 text-white hover:bg-emerald-500"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  `₦${plan.amount}`
                )}
              </Button>
            </div>
          ))
        ) : (
          <div className="py-20 text-center opacity-20 font-black uppercase tracking-widest italic">
            No Plans Found
          </div>
        )}
      </div>
    </div>
  );
}
