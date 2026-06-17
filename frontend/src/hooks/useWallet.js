"use client";
import { useState, useCallback } from "react";
import { connectWallet } from "../lib/wallet";

export function useWallet() {
  const [wallet,  setWallet]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Connects via window.ethereum (MetaMask / Coinbase / any injected wallet)
  const connect = useCallback(async (rawProvider) => {
    setLoading(true); setError(null);
    try {
      const w = await connectWallet(rawProvider);
      setWallet(w);
      return w;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => setWallet(null), []);

  return { wallet, connect, disconnect, loading, error };
}
