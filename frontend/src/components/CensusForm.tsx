import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw, Send, Trash2, Sparkles, Check } from "lucide-react";
import { api, type CensusData } from "@/lib/api";
import { computeAnomalyScore, getValidationHints, guessGenderFromFirstName } from "@/lib/ai";

interface CensusFormProps {
  isOnline: boolean;
}

export default function CensusForm({ isOnline }: CensusFormProps) {
  const [formData, setFormData] = useState({
    household_id: "",
    first_name: "",
    last_name: "",
    age: "",
    gender: "",
    phone: "",
    location_address: "",
    gps_latitude: null as number | null,
    gps_longitude: null as number | null,
    employment_status: "",
    education_level: "",
    health_status: "",
    has_disability: false,
    disability_type: "",
  });
  const [aiHints, setAiHints] = useState<string[]>([]);
  const [genderSuggestion, setGenderSuggestion] = useState<string | null>(null);
  const [anomalyScore, setAnomalyScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState<unknown[]>(
    JSON.parse(localStorage.getItem("pendingSubmissions") || "[]")
  );
  const [suggestions, setSuggestions] = useState({
    household_id: "",
    location_address: "",
    phone: "",
  });
  const [adaptiveFields, setAdaptiveFields] = useState({
    showEmployment: false,
    showEducation: false,
    showHealth: false,
    showDisability: false,
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const submitMutation = useMutation({
    mutationFn: api.submitCensus,
    onSuccess: () => {
      alert("Submission accepted by AI-assisted data gateway.");
      resetForm();
    },
    onError: (error: Error) => {
      alert(error.message || "Submission failed.");
    },
  });

  useEffect(() => {
    setAiHints(getValidationHints(formData));
    setGenderSuggestion(guessGenderFromFirstName(formData.first_name));
    setAnomalyScore(computeAnomalyScore(formData));

    // Adaptive survey logic
    const age = Number(formData.age);
    setAdaptiveFields({
      showEmployment: age >= 15, // Employment questions for working age
      showEducation: age >= 5 && age <= 25, // Education for school age
      showHealth: age >= 60 || age <= 5, // Health questions for elderly and children
      showDisability: true, // Always show disability questions
    });
  }, [formData]);

  const generateSuggestions = () => {
    const existingRecords = JSON.parse(localStorage.getItem("pendingSubmissions") || "[]");
    if (existingRecords.length === 0) return;

    const recentRecord = existingRecords[existingRecords.length - 1];
    const locationPattern = recentRecord.location_address?.split(",")[1]?.trim() || "";
    const phonePrefix = recentRecord.phone?.substring(0, 7) || "";

    setSuggestions({
      household_id: `HH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      location_address: locationPattern ? `${locationPattern}` : "",
      phone: phonePrefix ? `${phonePrefix}` : "",
    });
    setShowSuggestions(true);
  };

  const generateHouseholdId = () => {
    const id = `HH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setFormData({ ...formData, household_id: id });
  };

  const getLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCurrentLocation(loc);
        setFormData({ ...formData, gps_latitude: loc.latitude, gps_longitude: loc.longitude });
      },
      () => alert("Unable to get location."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const resetForm = () => {
    setFormData({
      household_id: "", first_name: "", last_name: "", age: "",
      gender: "", phone: "", location_address: "", gps_latitude: null, gps_longitude: null,
      employment_status: "", education_level: "", health_status: "",
      has_disability: false, disability_type: "",
    });
    setCurrentLocation(null);
    setShowSuggestions(false);
  };

  const validateForm = () => {
    if (!formData.household_id.trim()) return "Household ID is required";
    if (!formData.first_name.trim() || !formData.last_name.trim()) return "Full name is required";
    if (!formData.age || isNaN(Number(formData.age)) || Number(formData.age) < 0) return "Valid age is required";
    if (!formData.gender) return "Gender is required";
    if (!formData.location_address.trim()) return "Location is required";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      alert(error);
      return;
    }
    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    const data: CensusData = { ...formData, submission_type: isOnline ? "online" : "offline", timestamp: new Date().toISOString() };

    if (isOnline && token) {
      submitMutation.mutate(data);
    } else if (isOnline && !token) {
      alert("Please login to submit online.");
    } else {
      const updated = [...pendingSubmissions, data];
      setPendingSubmissions(updated);
      localStorage.setItem("pendingSubmissions", JSON.stringify(updated));
      alert("Stored for offline sync.");
      resetForm();
    }
    setIsSubmitting(false);
  };

  const update = (field: string, value: string | boolean) => setFormData({ ...formData, [field]: value });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass-card overflow-hidden"
    >
      {/* Header */}
      <div className="bg-primary px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary-foreground">Household Census Data Collection</h2>
          <p className="mt-1 text-xs text-primary-foreground/80">AI-powered validation and live situational suggestions keep submissions accurate.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={generateSuggestions}
            className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/20"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Smart Fill
          </Button>
          {pendingSubmissions.length > 0 && (
            <span className="text-xs font-medium text-primary-foreground/80 bg-primary-foreground/15 px-2.5 py-1 rounded-full">
              📱 {pendingSubmissions.length} pending sync
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 border-b border-border/80 bg-muted/40 px-6 py-4">
        <p className="text-sm text-muted-foreground">AI-assisted quality checks are active for every submission.</p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-foreground">
            Anomaly score: {anomalyScore}%
          </span>
          {genderSuggestion && !formData.gender ? (
            <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-foreground">
              Suggested gender: {genderSuggestion}
            </span>
          ) : null}
        </div>
        {aiHints.length > 0 ? (
          <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            {aiHints.map((hint, index) => (
              <li key={index} className="rounded-xl bg-border/10 px-3 py-2">
                • {hint}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-foreground/70">All checks passed, data is looking good.</p>
        )}
      </div>

      {showSuggestions && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-6 py-4 mx-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-primary">AI Smart Suggestions</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  household_id: suggestions.household_id || prev.household_id,
                  location_address: suggestions.location_address || prev.location_address,
                  phone: suggestions.phone || prev.phone,
                }));
                setShowSuggestions(false);
              }}
              className="text-xs"
            >
              <Check className="w-3 h-3 mr-1" />
              Apply All
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {suggestions.household_id && (
              <div className="flex items-center justify-between p-2 bg-background rounded border">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono">{suggestions.household_id}</span>
              </div>
            )}
            {suggestions.location_address && (
              <div className="flex items-center justify-between p-2 bg-background rounded border">
                <span className="text-muted-foreground">Location:</span>
                <span>{suggestions.location_address}</span>
              </div>
            )}
            {suggestions.phone && (
              <div className="flex items-center justify-between p-2 bg-background rounded border">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-mono">{suggestions.phone}****</span>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Household */}
        <Section title="Household Information">
          <div className="space-y-1.5">
            <Label>Household ID</Label>
            <div className="flex gap-2">
              <Input
                value={formData.household_id}
                onChange={(e) => update("household_id", e.target.value)}
                placeholder="Auto-generate or enter manually"
                required
              />
              <Button type="button" variant="secondary" onClick={generateHouseholdId} className="shrink-0">
                <RefreshCw className="w-4 h-4 mr-1.5" /> Generate
              </Button>
            </div>
          </div>
        </Section>

        {/* Personal */}
        <Section title="Personal Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name">
              <Input value={formData.first_name} onChange={(e) => update("first_name", e.target.value)} required />
            </Field>
            <Field label="Last Name">
              <Input value={formData.last_name} onChange={(e) => update("last_name", e.target.value)} required />
            </Field>
            <Field label="Age">
              <Input type="number" min={0} max={150} value={formData.age} onChange={(e) => update("age", e.target.value)} required />
            </Field>
            <Field label="Gender">
              <select
                value={formData.gender}
                onChange={(e) => update("gender", e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Phone Number" className="sm:col-span-2">
              <Input type="tel" value={formData.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+234xxxxxxxxxx" />
            </Field>
          </div>
        </Section>

        {/* Location */}
        <Section title="Location Information">
          <div className="space-y-4">
            <Field label="Address">
              <Input
                value={formData.location_address}
                onChange={(e) => update("location_address", e.target.value)}
                placeholder="Street address, city, state"
                required
              />
            </Field>
            <div className="flex items-center gap-3 flex-wrap">
              <Button type="button" variant="secondary" onClick={getLocation}>
                <MapPin className="w-4 h-4 mr-1.5" /> Get Current Location
              </Button>
              {currentLocation && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-md"
                >
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </motion.span>
              )}
            </div>
          </div>
        </Section>

        {/* Adaptive Employment Section */}
        {adaptiveFields.showEmployment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Section title="Employment Information">
              <Field label="Employment Status">
                <select
                  value={formData.employment_status || ""}
                  onChange={(e) => update("employment_status", e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select Status</option>
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="student">Student</option>
                  <option value="retired">Retired</option>
                  <option value="homemaker">Homemaker</option>
                </select>
              </Field>
            </Section>
          </motion.div>
        )}

        {/* Adaptive Education Section */}
        {adaptiveFields.showEducation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Section title="Education Information">
              <Field label="Education Level">
                <select
                  value={formData.education_level || ""}
                  onChange={(e) => update("education_level", e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select Level</option>
                  <option value="none">No formal education</option>
                  <option value="primary">Primary school</option>
                  <option value="secondary">Secondary school</option>
                  <option value="tertiary">Tertiary education</option>
                  <option value="vocational">Vocational training</option>
                </select>
              </Field>
            </Section>
          </motion.div>
        )}

        {/* Adaptive Health Section */}
        {adaptiveFields.showHealth && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Section title="Health Information">
              <Field label="Health Status">
                <select
                  value={formData.health_status || ""}
                  onChange={(e) => update("health_status", e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select Status</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="chronic">Chronic condition</option>
                </select>
              </Field>
            </Section>
          </motion.div>
        )}

        {/* Disability Section - Always shown */}
        <Section title="Disability & Accessibility">
          <Field label="Disability Status">
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_disability || false}
                  onChange={(e) => update("has_disability", e.target.checked.toString())}
                  className="rounded border-input"
                />
                <span className="text-sm">Has disability or special needs</span>
              </label>
              {formData.has_disability === "true" && (
                <Input
                  placeholder="Specify disability type (optional)"
                  value={formData.disability_type || ""}
                  onChange={(e) => update("disability_type", e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
          </Field>
        </Section>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? "Submitting..." : isOnline ? "Submit Online" : "Store for Later"}
          </Button>
          <Button type="button" variant="outline" onClick={resetForm}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Clear
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-primary border-b-2 border-primary pb-2">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className || ""}`}>
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
