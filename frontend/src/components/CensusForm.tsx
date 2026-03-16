import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw, Send, Trash2, Loader2 } from "lucide-react";
import { api, CensusData } from "@/lib/api";

interface CensusFormProps {
  isOnline: boolean;
  token: string | null;
}

export default function CensusForm({ isOnline, token }: CensusFormProps) {
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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState<unknown[]>(
    JSON.parse(localStorage.getItem("pendingSubmissions") || "[]")
  );
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState("");

  const submitMutation = useMutation({
    mutationFn: (data: CensusData) => api.submitCensus(data, token || ''),
    onSuccess: () => {
      alert("Census record submitted successfully!");
      resetForm();
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const getAddressFromCoords = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      const address = data.display_name || `${lat}, ${lon}`;
      setLocationName(address);
      setFormData({ ...formData, location_address: address, gps_latitude: lat, gps_longitude: lon });
    } catch {
      const fallback = `${lat}, ${lon}`;
      setLocationName(fallback);
      setFormData({ ...formData, location_address: fallback, gps_latitude: lat, gps_longitude: lon });
    }
  };

  const generateHouseholdId = () => {
    const id = `HH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setFormData({ ...formData, household_id: id });
  };

  const getLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCurrentLocation(loc);
        await getAddressFromCoords(loc.latitude, loc.longitude);
      },
      () => alert("Unable to get location."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const resetForm = () => {
    setFormData({
      household_id: "", first_name: "", last_name: "", age: "",
      gender: "", phone: "", location_address: "", gps_latitude: null, gps_longitude: null,
    });
    setCurrentLocation(null);
    setLocationName("");
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

  const update = (field: string, value: string) => setFormData({ ...formData, [field]: value });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass-card overflow-hidden"
    >
      {/* Header */}
      <div className="bg-primary px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary-foreground">Household Census Data Collection</h2>
        {pendingSubmissions.length > 0 && (
          <span className="text-xs font-medium text-primary-foreground/80 bg-primary-foreground/15 px-2.5 py-1 rounded-full">
            📱 {pendingSubmissions.length} pending sync
          </span>
        )}
      </div>

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
              {locationName && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-md"
                >
                  {locationName}
                </motion.span>
              )}
            </div>
          </div>
        </Section>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
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
