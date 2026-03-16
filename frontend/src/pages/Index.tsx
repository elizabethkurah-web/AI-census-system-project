import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import LoginForm from "@/components/LoginForm";
import AppHeader from "@/components/AppHeader";
import StatsCards from "@/components/StatsCards";
import CensusForm from "@/components/CensusForm";
import { api, LoginData, RegisterData } from "@/lib/api";

interface User {
  username: string;
  role: string;
}

export default function Index() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("collect");

  useEffect(() => {
    const on = () => {
      setIsOnline(true);
      syncPendingSubmissions();
    };
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const syncPendingSubmissions = async () => {
    const token = localStorage.getItem('token');
    if (!token || !navigator.onLine) return;

    const pending = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
    if (pending.length === 0) return;

    const synced = [];
    for (const submission of pending) {
      try {
        await api.submitCensus(submission, token);
        synced.push(submission);
      } catch (error) {
        console.error('Failed to sync submission:', error);
        break;
      }
    }

    const remaining = pending.filter((s: any) => !synced.some((syncedItem) => JSON.stringify(syncedItem) === JSON.stringify(s)));
    localStorage.setItem('pendingSubmissions', JSON.stringify(remaining));

    if (synced.length > 0) {
      alert(`Synced ${synced.length} pending submissions.`);
    }
  };

  const loginMutation = useMutation({
    mutationFn: api.login,
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      setUser({ username: data.user.username, role: data.user.role });
      syncPendingSubmissions(); // Sync after login
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const registerMutation = useMutation({
    mutationFn: api.register,
    onSuccess: () => {
      alert("Registration successful! Please login.");
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const handleLogin = (email: string, password: string) => {
    loginMutation.mutate({ email, password });
  };

  const handleRegister = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader
        username={user.username}
        role={user.role}
        isOnline={isOnline}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user.username}!
          </h2>
          <p className="text-muted-foreground mt-1">Ready to collect some census data today?</p>
        </motion.div>

        <StatsCards />

        {activeTab === "collect" && <CensusForm isOnline={isOnline} token={localStorage.getItem('token')} />}

        {activeTab === "analytics" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center">
            <p className="text-muted-foreground">Analytics dashboard coming soon.</p>
          </motion.div>
        )}

        {activeTab === "mapping" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center">
            <p className="text-muted-foreground">Mapping view coming soon.</p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
