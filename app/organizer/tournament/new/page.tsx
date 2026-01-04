"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { getCoordinatesFromState, geocodeAddress, INDIAN_STATES } from "../../../../lib/geocoding";

type Organizer = {
  id: string;
  email: string;
  name: string;
  organization: string | null;
  phone: string | null;
  auth_user_id: string;
};

type FormData = {
  // Step 1 - Basic Info
  name: string;
  category: string;
  date: string;
  time_control: string;
  format: string;
  rounds: number;
  fide_rated: boolean;
  description: string;
  // Step 2 - Venue & Fees
  venue_name: string;
  venue_address: string;
  location: string;
  state: string;
  entry_fee: string;
  prize_pool: string;
  prize_distribution: string;
  amenities: string;
  // Step 3 - Organizer & Additional
  organizer_name: string;
  organizer_phone: string;
  organizer_email: string;
  whatsapp_group: string;
  registration_link: string;
  rules: string;
  schedule: string;
};

const CATEGORIES = ["Classical", "Blitz", "Rapid", "Under 1800", "Age Group"];
const FORMATS = ["Swiss", "Round Robin", "Knockout"];

export default function NewTournamentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [showPrizeTemplate, setShowPrizeTemplate] = useState(false);
  const [showScheduleTemplate, setShowScheduleTemplate] = useState(false);
  

  const [formData, setFormData] = useState<FormData>({
    name: "",
    category: "Classical",
    date: "",
    time_control: "",
    format: "Swiss",
    rounds: 5,
    fide_rated: false,
    description: "",
    venue_name: "",
    venue_address: "",
    location: "",
    state: "Maharashtra",
    entry_fee: "",
    prize_pool: "",
    prize_distribution: '{"1st Place": "₹20,000", "2nd Place": "₹15,000", "3rd Place": "₹10,000"}',
    amenities: "Parking; Food; AC Hall",
    organizer_name: "",
    organizer_phone: "",
    organizer_email: "",
    whatsapp_group: "",
    registration_link: "",
    rules: "Valid ID required; No electronic devices; FIDE rules apply",
    schedule: '[{"round": "Round 1", "time": "9:00 AM"}, {"round": "Round 2", "time": "11:00 AM"}]',
  });

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    async function checkAuthAndFetchOrganizer() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push("/organizer/login");
          return;
        }

        const { data: organizerData, error: organizerError } = await supabase
          .from("organizers")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();

        if (organizerError || !organizerData) {
          router.push("/organizer/login");
          return;
        }

        setOrganizer(organizerData as Organizer);
        setFormData((prev) => ({
          ...prev,
          organizer_name: organizerData.name,
          organizer_email: organizerData.email,
          organizer_phone: organizerData.phone || "",
        }));
      } catch (error) {
        console.error("Auth error:", error);
        router.push("/organizer/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndFetchOrganizer();
  }, [router]);

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Template copied! Paste it in ChatGPT/Claude along with your PDF.");
  };

  const validateJSON = (jsonString: string, fieldName: string): boolean => {
    if (!jsonString.trim()) return true; // Allow empty
    try {
      JSON.parse(jsonString);
      return true;
    } catch (e) {
      alert(`Invalid JSON in ${fieldName}. Please check the format.`);
      return false;
    }
  };

  function validateStep1(): boolean {
    if (!formData.name.trim()) {
      setError("Tournament name is required");
      return false;
    }
    if (!formData.date) {
      setError("Date is required");
      return false;
    }
    if (!formData.time_control.trim()) {
      setError("Time control is required");
      return false;
    }
    if (formData.rounds < 1) {
      setError("Number of rounds must be at least 1");
      return false;
    }
    if (!formData.description.trim()) {
      setError("Description is required");
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    if (!formData.venue_name.trim()) {
      setError("Venue name is required");
      return false;
    }
    if (!formData.venue_address.trim()) {
      setError("Venue address is required");
      return false;
    }
    if (!formData.location.trim()) {
      setError("City/Location is required");
      return false;
    }
    if (!formData.entry_fee.trim()) {
      setError("Entry fee is required");
      return false;
    }
    if (!formData.prize_pool.trim()) {
      setError("Prize pool is required");
      return false;
    }
    return true;
  }

  function validateStep3(): boolean {
    if (!pdfFile) {
      setError("Tournament PDF is required");
      return false;
    }
    if (pdfFile.size > 10 * 1024 * 1024) {
      setError("PDF file must be less than 10MB");
      return false;
    }
    if (!pdfFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are allowed");
      return false;
    }
    return true;
  }

  function handleNext() {
    setError(null);

    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;

    setCurrentStep((prev) => Math.min(prev + 1, 3));
  }

  function handlePrevious() {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("PDF file must be less than 10MB");
        return;
      }
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are allowed");
        return;
      }
      setError(null);
      setPdfFile(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate JSON fields
    if (!validateJSON(formData.prize_distribution, "Prize Distribution")) {
      return;
    }
    if (!validateJSON(formData.schedule, "Schedule")) {
      return;
    }

    if (!validateStep3()) return;
    if (!organizer || !pdfFile) return;

    setSubmitting(true);

    try {
      // 1. Upload PDF to Supabase Storage
      const fileName = `${Date.now()}-${pdfFile.name.replace(/\s+/g, "-")}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("tournament-pdfs")
        .upload(fileName, pdfFile);

      if (uploadError) throw new Error(`PDF upload failed: ${uploadError.message}`);

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from("tournament-pdfs")
        .getPublicUrl(fileName);

      const pdfUrl = urlData.publicUrl;

      // 3. Get exact venue coordinates using Google Maps Geocoding API
      let coords = { lat: 0, lng: 0 };

      // Build full address for best geocoding results
      const fullAddress = `${formData.venue_name}, ${formData.venue_address}, ${formData.location}, ${formData.state}, India`;
      console.log("🗺️ Geocoding venue address:", fullAddress);

      // Try to get exact coordinates from Google Maps
      const geocodedCoords = await geocodeAddress(fullAddress);

      if (geocodedCoords) {
        // Success - use exact venue coordinates
        coords = geocodedCoords;
        console.log("✅ Using precise venue coordinates:", coords);
      } else {
        // Fallback - use state center if geocoding fails
        coords = getCoordinatesFromState(formData.state);
        console.warn("⚠️ Geocoding failed, using state center coordinates as fallback");
        
        // Show warning but don't block submission
        setError("Warning: Could not get exact venue location. Using approximate coordinates. Make sure your Google Maps API key is set up correctly.");
        
        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
      }

      // 4. Parse JSON fields with validation
      let prizeDistribution: any = {};
      try {
        const prizeStr = formData.prize_distribution.trim();
        if (prizeStr) {
          prizeDistribution = JSON.parse(prizeStr);
          console.log("Prize Distribution being sent to Supabase:");
          console.log(JSON.stringify(prizeDistribution, null, 2));
        }
      } catch (e) {
        console.error("Prize distribution parse error:", e);
        setError("Invalid prize distribution JSON format");
        setSubmitting(false);
        return;
      }

      let schedule: any[] = [];
      try {
        const schedStr = formData.schedule.trim();
        if (schedStr) {
          schedule = JSON.parse(schedStr);
          console.log("Parsed schedule:", schedule);
        }
      } catch (e) {
        console.error("Schedule parse error:", e);
        setError("Invalid schedule JSON format");
        setSubmitting(false);
        return;
      }

      const rules = formData.rules
        .split(";")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      const amenities = formData.amenities
        .split(";")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      // 5. Insert into tournaments table
      const { error: insertError } = await supabase.from("tournaments").insert({
        name: formData.name,
        category: formData.category,
        date: formData.date,
        time_control: formData.time_control,
        format: formData.format,
        rounds: formData.rounds,
        fide_rated: formData.fide_rated,
        description: formData.description,
        venue_name: formData.venue_name,
        venue_address: formData.venue_address,
        location: formData.location,
        state: formData.state,
        entry_fee: formData.entry_fee,
        prize_pool: formData.prize_pool,
        prize_distribution: prizeDistribution,
        amenities: amenities,
        organizer_name: formData.organizer_name,
        organizer_phone: formData.organizer_phone || null,
        organizer_email: formData.organizer_email,
        whatsapp_group: formData.whatsapp_group || null,
        registration_link: formData.registration_link || null,
        rules: rules,
        schedule: schedule,
        pdf: pdfUrl,
        lat: coords.lat,
        lng: coords.lng,
        status: "published",
        organizer_id: organizer.id,
      });

      if (insertError) throw new Error(`Failed to create tournament: ${insertError.message}`);

      setSuccess(true);
      setTimeout(() => {
        router.push("/organizer/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to create tournament");
    } finally {
      setSubmitting(false);
    }
  }

  const prizeTemplate = `Please extract the COMPLETE prize distribution from this tournament PDF including:
- ALL prize categories (Open, Female, Veteran Male, Veteran Female, Differently Abled, etc.)
- ALL rating categories (Unrated, 1400-1499, 1500-1599, 1600-1699, 1700-1799, 1800-1899, etc.)
- ALL age categories (U07, U09, U11, U13, U15, etc.)
- Exact prize amounts for each position
- Any trophies mentioned
- Age eligibility criteria for each category

Format it EXACTLY like this structure (include ALL categories from the PDF):

{
  "Open_Prizes": {
    "1st": "₹20,000 + Trophy",
    "2nd": "₹15,000 + Trophy",
    "3rd": "₹10,000 + Trophy",
    "4th": "₹9,000 + Trophy",
    "5th": "₹8,000 + Trophy",
    "6th": "₹7,000",
    "7th": "₹6,000",
    "8th_to_30th": "₹5,000 each"
  },
  "Female_Prizes": {
    "description": "Born before 01.01.2010",
    "1st_to_5th": "₹4,250 each"
  },
  "Veteran_Male": {
    "description": "Born before 01.01.1970",
    "1st_to_5th": "₹4,250 each"
  },
  "Veteran_Female": {
    "description": "Born before 01.01.1975",
    "1st_to_5th": "₹4,250 each"
  },
  "Differently_Abled": {
    "1st_to_8th": "₹4,250 each"
  },
  "Rating_Category_Prizes": {
    "Unrated": { "1st_to_5th": "₹4,250 each" },
    "1400_to_1499": { "1st_to_5th": "₹4,250 each" },
    "1500_to_1599": { "1st_to_5th": "₹4,250 each" },
    "1600_to_1699": { "1st_to_5th": "₹4,250 each" },
    "1700_to_1799": { "1st_to_3rd": "₹4,250 each" },
    "1800_to_1899": { "1st_to_3rd": "₹4,250 each" }
  },
  "Age_Category_Trophies": {
    "U07": "Girls 5 + Boys 5 (Born after 01.01.2018)",
    "U09": "Girls 5 + Boys 5 (Born after 01.01.2016)",
    "U11": "Girls 5 + Boys 5 (Born after 01.01.2014)",
    "U13": "Girls 5 + Boys 5 (Born after 01.01.2012)",
    "U15": "Girls 5 + Boys 5 (Born after 01.01.2010)"
  }
}

IMPORTANT: Return ONLY the complete JSON with all categories filled in. No explanation, no markdown, just the JSON.`;

  const scheduleTemplate = `Please extract the COMPLETE tournament schedule from this PDF including:
- ALL rounds (1, 2, 3... through the final round)
- Prize distribution ceremony
- Exact times and dates for each round
- Any breaks or special events

Format it as a JSON array like this:

[
  { "round": 1, "time": "09:30 AM, 23-Dec-2025" },
  { "round": 2, "time": "02:00 PM, 23-Dec-2025" },
  { "round": 3, "time": "09:30 AM, 24-Dec-2025" },
  { "round": 4, "time": "02:00 PM, 24-Dec-2025" },
  { "round": 5, "time": "09:30 AM, 25-Dec-2025" },
  { "round": 6, "time": "02:00 PM, 25-Dec-2025" },
  { "round": 7, "time": "09:30 AM, 26-Dec-2025" },
  { "round": 8, "time": "02:00 PM, 26-Dec-2025" },
  { "round": 9, "time": "09:30 AM, 27-Dec-2025" },
  { "round": 10, "time": "02:00 PM, 27-Dec-2025" },
  { "round": 11, "time": "09:30 AM, 28-Dec-2025" },
  { "round": "Prize Distribution", "time": "02:00 PM, 28-Dec-2025" }
]

IMPORTANT: Return ONLY the complete JSON array with all rounds. No explanation, no markdown, just the JSON array.`;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div className="loading-message">Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <section className="hero-bg" style={{ minHeight: "25vh", display: "flex", flexDirection: "column" }}>
        <nav className="glass">
          <div className="nav-container">
            <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
              TourneyRadar
            </Link>

            <div className="nav-links">
              <Link href="/tournaments" style={{ textDecoration: "none" }}>Tournaments</Link>
              <Link href="/organizer/dashboard" style={{ textDecoration: "none" }}>Dashboard</Link>
            </div>
          </div>
        </nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: "1rem" }}>
              <Link href="/organizer/dashboard" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>
                Dashboard
              </Link>
              <span style={{ color: "rgba(255,255,255,0.5)", margin: "0 0.5rem" }}>/</span>
              <span style={{ color: "white" }}>Add Tournament</span>
            </div>
            <h1 className="hero-title font-display">
              Add New <span className="highlight">Tournament</span>
            </h1>
          </div>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "800px" }}>
          {success ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
              <h2 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--success)", marginBottom: "1rem" }}>
                Tournament Created Successfully!
              </h2>
              <p style={{ color: "var(--text-secondary)" }}>
                Redirecting to your dashboard...
              </p>
            </div>
          ) : (
            <div className="card">
              {/* Step Indicator */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
                {[1, 2, 3].map((step) => (
                  <div key={step} style={{ display: "flex", alignItems: "center" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        background: currentStep >= step ? "var(--primary)" : "var(--surface-elevated)",
                        color: currentStep >= step ? "white" : "var(--text-secondary)",
                        border: `2px solid ${currentStep >= step ? "var(--primary)" : "var(--border)"}`,
                      }}
                    >
                      {step}
                    </div>
                    {step < 3 && (
                      <div
                        style={{
                          width: "60px",
                          height: "3px",
                          background: currentStep > step ? "var(--primary)" : "var(--border)",
                          margin: "0 0.5rem",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <h2 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {currentStep === 1 && "Basic Information"}
                  {currentStep === 2 && "Venue & Fees"}
                  {currentStep === 3 && "Organizer & Additional Info"}
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Step {currentStep} of 3
                </p>
              </div>

              {error && (
                <div style={{ padding: "1rem", background: "var(--error)", color: "white", borderRadius: "12px", marginBottom: "1.5rem" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Step 1 - Basic Information */}
                {currentStep === 1 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                        Tournament Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        value={formData.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="e.g., Mumbai Open Chess Championship 2025"
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                          Category *
                        </label>
                        <select
                          className="form-select"
                          value={formData.category}
                          onChange={(e) => updateField("category", e.target.value)}
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                          Date *
                        </label>
                        <input
                          type="date"
                          required
                          className="form-input"
                          value={formData.date}
                          onChange={(e) => updateField("date", e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                          Time Control *
                        </label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          value={formData.time_control}
                          onChange={(e) => updateField("time_control", e.target.value)}
                          placeholder="e.g., 90 min + 30 sec"
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                          Format *
                        </label>
                        <select
                          className="form-select"
                          value={formData.format}
                          onChange={(e) => updateField("format", e.target.value)}
                        >
                          {FORMATS.map((fmt) => (
                            <option key={fmt} value={fmt}>{fmt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                          Number of Rounds *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          className="form-input"
                          value={formData.rounds}
                          onChange={(e) => updateField("rounds", parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", paddingTop: "1.5rem" }}>
                        <input
                          type="checkbox"
                          id="fide_rated"
                          checked={formData.fide_rated}
                          onChange={(e) => updateField("fide_rated", e.target.checked)}
                          style={{ width: "20px", height: "20px", marginRight: "0.75rem", accentColor: "var(--primary)" }}
                        />
                        <label htmlFor="fide_rated" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          FIDE Rated Tournament
                        </label>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                        Description *
                      </label>
                      <textarea
                        required
                        className="form-input"
                        rows={4}
                        value={formData.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Describe your tournament, eligibility criteria, special rules, etc."
                        style={{ resize: "vertical" }}
                      />
                    </div>
                  </div>
                )}

                {/* Step 2 - Venue & Fees */}
                {currentStep === 2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                        Venue Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        value={formData.venue_name}
                        onChange={(e) => updateField("venue_name", e.target.value)}
                        placeholder="e.g., Hotel Grand Hyatt"
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                        Venue Address *
                      </label>
                      <textarea
                        required
                        className="form-input"
                        rows={2}
                        value={formData.venue_address}
                        onChange={(e) => updateField("venue_address", e.target.value)}
                        placeholder="Full address including street, area, city, pincode"
                        style={{ resize: "vertical" }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                          City/Location *
                        </label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          value={formData.location}
                          onChange={(e) => updateField("location", e.target.value)}
                          placeholder="e.g., Mumbai"
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                          State *
                        </label>
                        <select
                          className="form-select"
                          value={formData.state}
                          onChange={(e) => updateField("state", e.target.value)}
                        >
                          {INDIAN_STATES.map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                          Entry Fee *
                        </label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          value={formData.entry_fee}
                          onChange={(e) => updateField("entry_fee", e.target.value)}
                          placeholder="e.g., ₹500"
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                          Prize Pool *
                        </label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          value={formData.prize_pool}
                          onChange={(e) => updateField("prize_pool", e.target.value)}
                          placeholder="e.g., ₹50,000 Total"
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                        Prize Distribution (JSON, *)
                      </label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={formData.prize_distribution}
                        onChange={(e) => updateField("prize_distribution", e.target.value)}
                        placeholder='{"1st Place": "₹20,000", "2nd Place": "₹15,000"}'
                        style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.875rem" }}
                      />
                      
                      {/* AI Helper - Collapsible */}
                      <details style={{ marginTop: "0.5rem" }}>
                        <summary style={{ 
                          cursor: "pointer", 
                          fontSize: "0.875rem", 
                          color: "var(--primary)", 
                          fontWeight: 600,
                          padding: "0.5rem 0"
                        }}>
                          🤖 Need help? Use AI to format from PDF
                        </summary>
                        <div style={{ 
                          marginTop: "0.5rem", 
                          padding: "0.75rem", 
                          background: "var(--surface-elevated)", 
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          lineHeight: 1.6,
                          border: "1px solid var(--border)"
                        }}>
                          <p style={{ marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                            1. Copy template below<br/>
                            2. Go to ChatGPT or Claude<br/>
                            3. Paste template + upload your PDF<br/>
                            4. Copy AI response and paste above
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowPrizeTemplate(!showPrizeTemplate)}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.5rem 0.75rem",
                              background: "var(--primary)",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer"
                            }}
                          >
                            {showPrizeTemplate ? "Hide Template" : "Show Template"}
                          </button>
                          {showPrizeTemplate && (
                            <>
                              <pre style={{
                                marginTop: "0.5rem",
                                padding: "0.5rem",
                                background: "var(--surface)",
                                borderRadius: "4px",
                                fontSize: "0.65rem",
                                overflow: "auto",
                                maxHeight: "200px",
                                border: "1px solid var(--border)"
                              }}>{prizeTemplate}</pre>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(prizeTemplate)}
                                style={{
                                  marginTop: "0.5rem",
                                  fontSize: "0.75rem",
                                  padding: "0.5rem 0.75rem",
                                  background: "var(--primary)",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer"
                                }}
                              >
                                📋 Copy Template
                              </button>
                            </>
                          )}
                        </div>
                      </details>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                        Amenities (semicolon-separated)
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.amenities}
                        onChange={(e) => updateField("amenities", e.target.value)}
                        placeholder="Parking; Food; AC Hall; WiFi"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3 - Organizer & Additional Info */}
                {currentStep === 3 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                          Organizer Name
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.organizer_name}
                          readOnly
                          style={{ background: "var(--surface-elevated)", cursor: "not-allowed" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                          Organizer Email
                        </label>
                        <input
                          type="email"
                          className="form-input"
                          value={formData.organizer_email}
                          readOnly
                          style={{ background: "var(--surface-elevated)", cursor: "not-allowed" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                        Organizer Phone
                      </label>
                      <input
                        type="tel"
                        className="form-input"
                        value={formData.organizer_phone}
                        onChange={(e) => updateField("organizer_phone", e.target.value)}
                        placeholder="+91 89761 91515"
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                          WhatsApp Group Link *
                        </label>
                        <input
                          type="url"
                          className="form-input"
                          value={formData.whatsapp_group}
                          onChange={(e) => updateField("whatsapp_group", e.target.value)}
                          placeholder="https://chat.whatsapp.com/..."
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                          Registration Link *
                        </label>
                        <input
                          type="url"
                          className="form-input"
                          value={formData.registration_link}
                          onChange={(e) => updateField("registration_link", e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                        Tournament PDF * (max 10MB)
                      </label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="form-input"
                        style={{ padding: "0.5rem" }}
                      />
                      {pdfFile && (
                        <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--success)" }}>
                          ✓ {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                        Rules (semicolon-separated) *
                      </label>
                      <textarea
                        className="form-input"
                        rows={2}
                        value={formData.rules}
                        onChange={(e) => updateField("rules", e.target.value)}
                        placeholder="Valid ID required; No electronic devices; FIDE rules apply"
                        style={{ resize: "vertical" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                        Schedule (JSON array, *)
                      </label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={formData.schedule}
                        onChange={(e) => updateField("schedule", e.target.value)}
                        placeholder='[{"round": "Round 1", "time": "9:00 AM"}]'
                        style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.875rem" }}
                      />
                      
                      {/* AI Helper - Collapsible */}
                      <details style={{ marginTop: "0.5rem" }}>
                        <summary style={{ 
                          cursor: "pointer", 
                          fontSize: "0.875rem", 
                          color: "var(--primary)", 
                          fontWeight: 600,
                          padding: "0.5rem 0"
                        }}>
                          🤖 Need help? Use AI to format from PDF
                        </summary>
                        <div style={{ 
                          marginTop: "0.5rem", 
                          padding: "0.75rem", 
                          background: "var(--surface-elevated)", 
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          lineHeight: 1.6,
                          border: "1px solid var(--border)"
                        }}>
                          <p style={{ marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                            1. Copy template below<br/>
                            2. Go to ChatGPT or Claude<br/>
                            3. Paste template + upload your PDF<br/>
                            4. Copy AI response and paste above
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowScheduleTemplate(!showScheduleTemplate)}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.5rem 0.75rem",
                              background: "var(--primary)",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer"
                            }}
                          >
                            {showScheduleTemplate ? "Hide Template" : "Show Template"}
                          </button>
                          {showScheduleTemplate && (
                            <>
                              <pre style={{
                                marginTop: "0.5rem",
                                padding: "0.5rem",
                                background: "var(--surface)",
                                borderRadius: "4px",
                                fontSize: "0.65rem",
                                overflow: "auto",
                                maxHeight: "200px",
                                border: "1px solid var(--border)"
                              }}>{scheduleTemplate}</pre>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(scheduleTemplate)}
                                style={{
                                  marginTop: "0.5rem",
                                  fontSize: "0.75rem",
                                  padding: "0.5rem 0.75rem",
                                  background: "var(--primary)",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer"
                                }}
                              >
                                📋 Copy Template
                              </button>
                            </>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", gap: "1rem" }}>
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={handlePrevious}
                      className="btn"
                      style={{ background: "var(--surface-elevated)", border: "2px solid var(--border)", color: "var(--text-primary)" }}
                    >
                      ← Previous
                    </button>
                  ) : (
                    <div />
                  )}

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="btn btn-primary"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary"
                      style={{ opacity: submitting ? 0.6 : 1 }}
                    >
                      {submitting ? "Creating Tournament..." : "Submit Tournament"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
