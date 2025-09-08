import React, { useState } from "react";
import "./App.css";

function App() {
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState("witty");

  const tones = [
    { value: "witty", label: "Witty" },
    { value: "brutal", label: "Brutal" },
    { value: "sarcastic", label: "Sarcastic" },
    { value: "friendly", label: "Friendly" },
  ];

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = error => reject(error);
    });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
      setCaption("");
    }
  };

  const analyzeImageWithQwen = async (image: File): Promise<string> => {
    const API_KEY = import.meta.env.VITE_QWEN_KEY;
    if (!API_KEY) throw new Error("Qwen API key is missing");

    const base64Image = await fileToBase64(image);

    const messages = [
      {
        role: "system",
        content:
          "You are a visual captioning assistant. For the given image, summarize only the key subjects and salient objects or actions that define the main event or scene. Ignore minor background details. Keep description clear, concise, and focused on what stands out most.",
      },
      {
        role: "user",
        content: `<image>${base64Image}`,
      },
    ];

    const payload = {
      model: "accounts/fireworks/models/qwen2p5-vl-32b-instruct",
      max_tokens: 4096,
      top_p: 1,
      top_k: 40,
      presence_penalty: 0,
      frequency_penalty: 0,
      temperature: 0.6,
      messages,
    };

    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen API error: ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "A visually interesting image";
  };

  const generateCaptionWithDobby = async (description: string): Promise<string> => {
    const API_KEY = import.meta.env.VITE_DOBBY_KEY;
    if (!API_KEY) throw new Error("Dobby API key is missing");

    const systemPrompt = `
You are CaptionDobby. Given a visual scene description, create a ${tone}, meme-worthy caption in 25 words or less.
Make it clever and instantly shareable.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: description },
    ];

    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b",
          max_tokens: 4096,
          top_p: 1,
          top_k: 40,
          presence_penalty: 0,
          frequency_penalty: 0,
          temperature: 0.6,
          messages,
        }),
      }
    );

    if (!response.ok) throw new Error(`Dobby API error: ${response.statusText}`);

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "No caption generated.";
  };

  const handleGenerate = async () => {
    if (!imageFile) return;
    setLoading(true);
    setCaption("");

    try {
      const description = await analyzeImageWithQwen(imageFile);
      const caption = await generateCaptionWithDobby(description);
      setCaption(caption);
    } catch (error: any) {
      setCaption("Error: " + error.message);
    }

    setLoading(false);
  };

  return (
    <main className="hero-bg">
      <header
        className="app-header"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "32px 0",
        }}
      >
        <span
          className="app-logo"
          style={{
            fontSize: "2.3rem",
            fontWeight: 700,
            color: "#217c42",
            letterSpacing: "1.5px",
          }}
        >
          DobbyCaption!
        </span>
      </header>
      <section className="hero-section">
        <div className="hero-left">
          <h1 className="hero-headline">
            Savage AI Captions <span className="highlight">for Any Image</span>
          </h1>
          <p className="hero-desc">
            Drop an image—get a caption matching your tone, powered by Qwen + Dobby.
          </p>
        </div>
        <div className="hero-center">
          <div className="upload-card">
            {imagePreview ? (
              <img src={imagePreview} alt="preview" className="preview-img" />
            ) : (
              <div className="placeholder-img">No image selected</div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              id="img-upload"
              style={{ display: "none" }}
            />
            <label htmlFor="img-upload" className="upload-btn">
              Upload Image
            </label>

            <label
              htmlFor="tone-select"
              style={{ marginTop: "10px", marginBottom: "10px", display: "block" }}
            >
              Choose Tone:
            </label>
            <select
              id="tone-select"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              style={{ padding: "6px", fontSize: "1em", marginBottom: "16px" }}
            >
              {tones.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={!imageFile || loading}
            >
              {loading ? "Generating..." : "Generate Caption"}
            </button>

            {caption && <div className="caption-output">{caption}</div>}
          </div>
        </div>
      </section>

      <footer className="footer-gradient">
        Built by surojitpvt
      </footer>
    </main>
  );
}

export default App;
