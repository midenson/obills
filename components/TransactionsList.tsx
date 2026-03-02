"use client";
import React from 'react';
import { ChevronLeft, FileText, Wifi, ArrowDownLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const transactions = [
  { id: 1, type: 'Data Purchase', date: 'Feb 17, 08:08:28 AM', amount: '299.00', status: 'Success', icon: <Wifi className="text-blue-400" /> },
  { id: 2, type: 'NGN Wallet Deposit', date: 'Feb 17, 08:07:51 AM', amount: '300.00', status: 'Success', icon: <ArrowDownLeft className="text-lime-400" /> },
  // ... repeat for other items in screenshot
];

export default function TransactionList() {
  return (
    <div className="min-h-screen bg-black text-white px-5 pt-12 pb-safe">
      <header className="flex justify-between items-center mb-8">
        <Button variant="ghost" size="icon" className="bg-zinc-900/50 rounded-full">
          <ChevronLeft size={24} />
        </Button>
        <Button variant="secondary" className="bg-zinc-900 text-gray-300 rounded-2xl h-11 px-6 gap-2">
          <FileText size={18} /> Statement
        </Button>
      </header>

      <h1 className="text-3xl font-bold mb-2">Transactions</h1>
      <p className="text-gray-500 mb-6">View and manage your transactions</p>

      {/* Filters */}
      <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
        {['All Category', 'All Status', 'Date'].map((filter) => (
          <Button key={filter} variant="outline" className="border-zinc-800 bg-zinc-900/30 rounded-xl whitespace-nowrap">
            {filter} <span className="ml-2 text-[10px]">▼</span>
          </Button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-6">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex justify-between items-center active:opacity-70 transition-opacity cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
                {tx.icon}
              </div>
              <div>
                <p className="font-bold text-[15px]">{tx.type}</p>
                <p className="text-xs text-gray-500">{tx.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold">{tx.amount} NGN</p>
              <div className="flex items-center justify-end gap-1.5 mt-1">
                <span className="text-[11px] text-gray-500">{tx.status}</span>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

