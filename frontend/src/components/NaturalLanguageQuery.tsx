import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, BarChart3, Users, MapPin, TrendingUp } from "lucide-react";
import type { CensusData } from "@/lib/api";

interface QueryResult {
  type: "count" | "average" | "list" | "percentage" | "trend";
  title: string;
  value: string | number;
  details?: string;
  data?: [string, number][] | { date: string; count: number }[];
}

function processNaturalQuery(query: string, records: CensusData[]): QueryResult | null {
  const lowerQuery = query.toLowerCase();

  // Count queries
  if (lowerQuery.includes("how many") || lowerQuery.includes("count") || lowerQuery.includes("total")) {
    if (lowerQuery.includes("male") || lowerQuery.includes("men")) {
      const count = records.filter(r => r.gender === "M").length;
      return { type: "count", title: "Male Records", value: count };
    }
    if (lowerQuery.includes("female") || lowerQuery.includes("women")) {
      const count = records.filter(r => r.gender === "F").length;
      return { type: "count", title: "Female Records", value: count };
    }
    if (lowerQuery.includes("geotagged") || lowerQuery.includes("coordinates")) {
      const count = records.filter(r => r.gps_latitude && r.gps_longitude).length;
      return { type: "count", title: "Geotagged Records", value: count };
    }
    if (lowerQuery.includes("online")) {
      const count = records.filter(r => r.submission_type === "online").length;
      return { type: "count", title: "Online Submissions", value: count };
    }
    if (lowerQuery.includes("offline")) {
      const count = records.filter(r => r.submission_type !== "online").length;
      return { type: "count", title: "Offline Submissions", value: count };
    }
    return { type: "count", title: "Total Records", value: records.length };
  }

  // Average queries
  if (lowerQuery.includes("average") || lowerQuery.includes("avg") || lowerQuery.includes("mean")) {
    if (lowerQuery.includes("age")) {
      const avg = Math.round(records.reduce((sum, r) => sum + Number(r.age), 0) / records.length);
      return { type: "average", title: "Average Age", value: avg, details: "years" };
    }
  }

  // Location queries
  if (lowerQuery.includes("location") || lowerQuery.includes("area") || lowerQuery.includes("region")) {
    const locations = records.reduce<Record<string, number>>((acc, r) => {
      const loc = r.location_address.split(",")[0]?.trim() || "Unknown";
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {});
    const topLocation = Object.entries(locations).sort((a, b) => b[1] - a[1])[0];
    return {
      type: "list",
      title: "Top Location",
      value: topLocation ? `${topLocation[0]} (${topLocation[1]} records)` : "No data",
      data: Object.entries(locations).slice(0, 5)
    };
  }

  // Age distribution queries
  if (lowerQuery.includes("age") && (lowerQuery.includes("distribution") || lowerQuery.includes("breakdown"))) {
    const ageGroups = records.reduce<Record<string, number>>((acc, r) => {
      const age = Number(r.age);
      const group = age <= 17 ? "0-17" : age <= 35 ? "18-35" : age <= 59 ? "36-59" : "60+";
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});
    return {
      type: "list",
      title: "Age Distribution",
      value: "Breakdown by age groups",
      data: Object.entries(ageGroups)
    };
  }

  // Percentage queries
  if (lowerQuery.includes("percentage") || lowerQuery.includes("percent") || lowerQuery.includes("%")) {
    if (lowerQuery.includes("geotagged")) {
      const percentage = Math.round((records.filter(r => r.gps_latitude && r.gps_longitude).length / records.length) * 100);
      return { type: "percentage", title: "Geotagged Records", value: `${percentage}%` };
    }
    if (lowerQuery.includes("online")) {
      const percentage = Math.round((records.filter(r => r.submission_type === "online").length / records.length) * 100);
      return { type: "percentage", title: "Online Submissions", value: `${percentage}%` };
    }
  }

  // Trend queries
  if (lowerQuery.includes("trend") || lowerQuery.includes("recent") || lowerQuery.includes("last")) {
    const recent = records.slice(-5).map(r => ({
      date: new Date(r.timestamp).toLocaleDateString(),
      count: 1
    }));
    return {
      type: "trend",
      title: "Recent Submissions",
      value: `${recent.length} records in last submissions`,
      data: recent
    };
  }

  return null;
}

export default function NaturalLanguageQuery({ records }: { records: CensusData[] }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleQuery = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    // Simulate processing time
    setTimeout(() => {
      const processedResult = processNaturalQuery(query, records);
      setResult(processedResult);
      setIsSearching(false);
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleQuery();
    }
  };

  const getIcon = (type: QueryResult["type"]) => {
    switch (type) {
      case "count": return Users;
      case "average": return TrendingUp;
      case "percentage": return BarChart3;
      case "list": return MapPin;
      case "trend": return TrendingUp;
      default: return Search;
    }
  };

  return (
    <Card className="glass-card-hover border-border/80 bg-card/90">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Search className="h-5 w-5 text-primary" />
          Natural Language Query
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask questions like: 'How many males?' or 'Average age?' or 'Top locations?'"
            className="flex-1"
          />
          <Button onClick={handleQuery} disabled={isSearching || !query.trim()}>
            {isSearching ? "Searching..." : "Ask"}
          </Button>
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-border bg-background p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              {React.createElement(getIcon(result.type), { className: "h-5 w-5 text-primary" })}
              <h4 className="font-semibold text-foreground">{result.title}</h4>
            </div>

            <div className="text-2xl font-bold text-primary mb-2">{result.value}</div>

            {result.details && (
              <p className="text-sm text-muted-foreground mb-3">{result.details}</p>
            )}

            {result.data && result.type === "list" && (
              <div className="space-y-2">
                {(result.data as [string, number][]).map(([key, value], index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {result.data && result.type === "trend" && (
              <div className="space-y-2">
                {(result.data as { date: string; count: number }[]).map((item, index: number) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{item.date}</span>
                    <span className="font-medium">{item.count} submissions</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Try asking:</p>
          <ul className="space-y-1">
            <li>• "How many males are there?"</li>
            <li>• "What's the average age?"</li>
            <li>• "Show me the top locations"</li>
            <li>• "What's the age distribution?"</li>
            <li>• "How many records are geotagged?"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}