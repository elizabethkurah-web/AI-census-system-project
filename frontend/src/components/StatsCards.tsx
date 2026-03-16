import { motion } from "framer-motion";
import { BarChart3, CheckCircle2, Target } from "lucide-react";

const stats = [
  { label: "Today's Entries", value: "12", icon: BarChart3 },
  { label: "This Week", value: "47", icon: CheckCircle2 },
  { label: "Accuracy Rate", value: "98.5%", icon: Target },
];

export default function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.35 }}
          className="glass-card-hover flex items-center gap-4 p-5"
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary">
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className="text-xl font-bold tracking-tight text-foreground">{stat.value}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
