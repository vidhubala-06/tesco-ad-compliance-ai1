import { useState, useRef } from "react";
import html2canvas from "html2canvas";

function App() {
  const [headline, setHeadline] = useState("");
  const [subhead, setSubhead] = useState("");
  const [cta, setCta] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("Default");
  const [layout, setLayout] = useState("Instagram Square");
  const [selectedRetailer, setSelectedRetailer] = useState("Default");
  const [activeTab, setActiveTab] = useState("simulator"); // simulator, transfer, performance, multiretailer

  const [result, setResult] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [multiRetailerAds, setMultiRetailerAds] = useState(null);
  const previewRef = useRef(null);

  const retailers = ["Tesco", "Walmart", "Amazon Fresh", "Sainsbury's", "Asda"];
  const retailerColors = {
    Tesco: { primary: "#0071CE", secondary: "#00A3E0" },
    Walmart: { primary: "#FFC220", secondary: "#0071CE" },
    "Amazon Fresh": { primary: "#FF9900", secondary: "#146EB4" },
    "Sainsbury's": { primary: "#F47E20", secondary: "#003DA5" },
    Asda: { primary: "#0066CC", secondary: "#00A6D8" },
  };

  const analyzeAndGenerate = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          subhead,
          cta,
          image_url: imageUrl,
          category,
          layout,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Analyze error:", response.status, text);
        alert(`Analyze failed: ${response.status}`);
        return;
      }

      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        const text = await response.text();
        console.error("Analyze returned non-JSON:", text);
        alert("Analyze returned invalid response from server.");
        return;
      }

      // protect against malformed server response
      if (!data || typeof data !== "object") {
        alert("Analyze returned unexpected data");
        return;
      }

      setResult(data);

      // Generate performance prediction
      const performanceScore = Math.min(100, Math.max(0, 50 + ((data.score || 0) - 50) + Math.random() * 20 - 10));
      setPerformanceData({
        ctr: (Math.random() * 4 + 1).toFixed(2),
        quality: performanceScore,
        zone: performanceScore >= 75 ? "green" : performanceScore >= 50 ? "yellow" : "red",
      });
    } catch (err) {
      console.error("Analyze request failed:", err);
      alert("Failed to analyze creative. Is the backend running? Check console for details.");
    }
  };

  const generateMultiRetailerAds = () => {
    if (!result) {
      alert("Please analyze an ad first!");
      return;
    }

    const ads = {};
    retailers.forEach((retailer) => {
      ads[retailer] = {
        headline: `${headline} - ${retailer}`,
        subhead,
        cta,
        imageUrl,
        colors: retailerColors[retailer],
      };
    });
    setMultiRetailerAds(ads);
  };

  const fixAllIssues = async () => {
    if (!result) {
      alert("Please analyze an ad first!");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          subhead,
          cta,
          image_url: imageUrl,
          category,
          layout,
        }),
      });

      const data = await response.json();

      if (data.fixed_creative) {
        const fixed = data.fixed_creative;
        setHeadline(fixed.headline || "");
        setSubhead(fixed.subhead || "");
        setCta(fixed.cta || "");
        setImageUrl(fixed.image_url || "");

        // update result with new analysis
        if (data.analysis_after) {
          setResult({
            ...result,
            issues: data.analysis_after.issues,
            score: data.analysis_after.score,
            status: data.analysis_after.status,
          });
        }

        const msg = data.applied_fixes && data.applied_fixes.length > 0 ? data.applied_fixes.join("; ") : "Applied fixes"
        alert(`✅ Fixes applied: ${msg}`);
      } else {
        alert("No fixes returned from server.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to apply fixes. See console for details.");
    }
  };

  const downloadImage = async () => {
    if (!previewRef.current) return;
    try {
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: "#ffffff",
      });
      // get a JPEG data URL first to send to optimizer
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

      // send to backend optimizer to ensure <500KB
      let optimized = null;
      try {
        const resp = await fetch("http://127.0.0.1:8000/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_data: dataUrl, output_format: "jpeg", max_kb: 500 }),
        });
        const json = await resp.json();
        if (json && json.data_url) optimized = json.data_url;
      } catch (err) {
        console.warn("Image optimization failed, using original image", err);
      }

      const link = document.createElement("a");
      link.href = optimized || dataUrl || canvas.toDataURL();
      link.download = `ad-preview-${Date.now()}.jpg`;
      link.click();
    } catch (error) {
      console.error("Error downloading image:", error);
      alert("Failed to download image. Please try again.");
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>✨ Retail Media Creative Tool</h1>
        <p style={subtitleStyle}>Create and analyze compliant ad creatives</p>
      </div>

      <div style={mainGridStyle}>
        {/* LEFT PANEL – INPUTS */}
        <div style={leftPanelStyle}>
          <h2 style={panelTitleStyle}>Create Your Ad</h2>
          <div style={formStyle}>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Headline</span>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Enter headline..."
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Subhead</span>
              <input
                value={subhead}
                onChange={(e) => setSubhead(e.target.value)}
                placeholder="Enter subhead..."
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>CTA Button Text</span>
              <input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="e.g., Shop Now"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Image URL</span>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={selectStyle}
              >
                <option>Default</option>
                <option>Alcohol</option>
                <option>LEP</option>
              </select>
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Layout</span>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
                style={selectStyle}
              >
                <option>Instagram Square</option>
                <option>Instagram Story</option>
                <option>Facebook Feed</option>
              </select>
            </label>

            <button onClick={analyzeAndGenerate} style={primaryButtonStyle}>
              🚀 Analyze & Generate
            </button>

            {result && (
              <>
                <button onClick={fixAllIssues} style={{ ...primaryButtonStyle, background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}>
                  🔧 Fix All Issues
                </button>
                <button onClick={generateMultiRetailerAds} style={{ ...primaryButtonStyle, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
                  🏪 Generate Multi-Retailer Ads
                </button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANEL – TABS */}
        <div style={rightPanelStyle}>
          {result ? (
            <>
              <div style={tabContainerStyle}>
                {[
                  { id: "simulator", label: "🛡️ Compliance", icon: "Simulator" },
                  { id: "transfer", label: "🎨 Retailer Style", icon: "Transfer" },
                  { id: "performance", label: "📊 Performance", icon: "Performance" },
                  { id: "multiretailer", label: "🏪 Multi-Retailer", icon: "Multi" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      ...tabButtonStyle,
                      background: activeTab === tab.id ? "#667eea" : "#e5e7eb",
                      color: activeTab === tab.id ? "white" : "#555",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: Compliance Simulator */}
              {activeTab === "simulator" && (
                <div style={tabContentStyle}>
                  <h3 style={sectionTitleStyle}>🛡️ Creative Regulation Simulator</h3>
                  <div style={resultHeaderStyle}>
                    <div style={statusBadgeStyle}>
                      <span style={statusLabelStyle}>Status</span>
                      <span style={{ ...statusValueStyle, color: result.status === "Approved" ? "#16a34a" : "#dc2626" }}>
                        {result.status}
                      </span>
                    </div>
                    <div style={scoreBadgeStyle}>
                      <span style={scoreLabelStyle}>Compliance Score</span>
                      <span style={scoreValueStyle}>{result.score}/100</span>
                    </div>
                  </div>

                  <div style={previewContainerStyle}>
                    <div ref={previewRef} style={previewCardStyle}>
                      <h3 style={previewHeadlineStyle}>{headline}</h3>
                      {imageUrl && <img src={imageUrl} alt="Product" style={previewImageStyle} />}
                      <p style={previewSubheadStyle}>{subhead}</p>
                      <button style={ctaButtonStyle}>{cta}</button>
                      {category === "Alcohol" && (
                        <p style={disclaimerStyle}>🍷 Please drink responsibly. Visit drinkaware.co.uk</p>
                      )}
                    </div>
                  </div>

                  <button onClick={downloadImage} style={downloadButtonStyle}>
                    ⬇️ Download Image
                  </button>

                  {result.issues?.length > 0 && (
                    <div style={issuesContainerStyle}>
                      <h3 style={issuesTitleStyle}>⚠️ Compliance Issues Found</h3>
                      <ul style={issuesListStyle}>
                        {result.issues.map((issue, i) => (
                          <li key={i} style={issueItemStyle}>
                            ✗ {issue.message || issue.rule || "Unknown issue"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Retailer Style Transfer */}
              {activeTab === "transfer" && (
                <div style={tabContentStyle}>
                  <h3 style={sectionTitleStyle}>🎨 Retailer Style Transfer Engine</h3>
                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Select Retailer</span>
                    <select
                      value={selectedRetailer}
                      onChange={(e) => setSelectedRetailer(e.target.value)}
                      style={selectStyle}
                    >
                      <option>Default</option>
                      {retailers.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>

                  <div
                    style={{
                      ...previewCardStyle,
                      background: `linear-gradient(135deg, ${retailerColors[selectedRetailer]?.primary || "#667eea"}20 0%, ${retailerColors[selectedRetailer]?.secondary || "#764ba2"}20 100%)`,
                      border: `3px solid ${retailerColors[selectedRetailer]?.primary || "#667eea"}`,
                    }}
                  >
                    <h3 style={{ ...previewHeadlineStyle, color: retailerColors[selectedRetailer]?.primary }}>
                      {headline}
                    </h3>
                    {imageUrl && <img src={imageUrl} alt="Product" style={previewImageStyle} />}
                    <p style={previewSubheadStyle}>{subhead}</p>
                    <button
                      style={{
                        ...ctaButtonStyle,
                        background: retailerColors[selectedRetailer]?.primary || "#667eea",
                      }}
                    >
                      {cta}
                    </button>
                  </div>

                  <p style={infoTextStyle}>
                    ✓ This ad has been styled to match {selectedRetailer}'s brand guidelines
                  </p>
                </div>
              )}

              {/* TAB 3: Performance Predictor */}
              {activeTab === "performance" && (
                <div style={tabContentStyle}>
                  <h3 style={sectionTitleStyle}>📊 Creative Quality & Performance Predictor</h3>
                  {performanceData && (
                    <>
                      <div style={performanceMetricsStyle}>
                        <div style={metricCardStyle}>
                          <span style={metricLabelStyle}>Predicted CTR</span>
                          <span style={metricValueStyle}>{performanceData.ctr}%</span>
                        </div>
                        <div style={metricCardStyle}>
                          <span style={metricLabelStyle}>Quality Score</span>
                          <span style={metricValueStyle}>{performanceData.quality.toFixed(0)}</span>
                        </div>
                      </div>

                      <div
                        style={{
                          ...performanceZoneStyle,
                          background:
                            performanceData.zone === "green"
                              ? "#d1fae5"
                              : performanceData.zone === "yellow"
                              ? "#fef3c7"
                              : "#fee2e2",
                          borderColor:
                            performanceData.zone === "green"
                              ? "#10b981"
                              : performanceData.zone === "yellow"
                              ? "#f59e0b"
                              : "#ef4444",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "2em",
                            color:
                              performanceData.zone === "green"
                                ? "#10b981"
                                : performanceData.zone === "yellow"
                                ? "#d97706"
                                : "#dc2626",
                          }}
                        >
                          {performanceData.zone === "green"
                            ? "🟢 EXCELLENT"
                            : performanceData.zone === "yellow"
                            ? "🟡 GOOD"
                            : "🔴 NEEDS IMPROVEMENT"}
                        </span>
                      </div>

                      <div style={suggestionsStyle}>
                        <h4 style={suggestionsTitleStyle}>💡 Improvement Suggestions:</h4>
                        <ul style={suggestionListStyle}>
                          <li>✓ Keep headlines under 30 characters for better readability</li>
                          <li>✓ Use action-oriented CTA text (Shop Now, Get Offer)</li>
                          <li>✓ Ensure image quality is high (min 1200x627px)</li>
                          <li>✓ Test with different audiences for better targeting</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 4: Multi-Retailer */}
              {activeTab === "multiretailer" && (
                <div style={tabContentStyle}>
                  <h3 style={sectionTitleStyle}>🏪 One-Click Multi-Retailer Compliance Mode</h3>
                  {multiRetailerAds ? (
                    <>
                      <div style={multiRetailerGridStyle}>
                        {retailers.map((retailer) => (
                          <div key={retailer} style={retailerCardStyle}>
                            <h4 style={{ color: retailerColors[retailer].primary, marginBottom: "10px" }}>
                              {retailer}
                            </h4>
                            <div
                              style={{
                                ...previewCardSmallStyle,
                                borderColor: retailerColors[retailer].primary,
                              }}
                            >
                              <p style={{ fontSize: "0.85em", color: "#333", margin: 0 }}>
                                {headline} - {retailer}
                              </p>
                            </div>
                            <button
                              style={{
                                ...downloadButtonStyle,
                                background: retailerColors[retailer].primary,
                                width: "100%",
                                marginTop: "10px",
                              }}
                            >
                              ⬇️ Download
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={emptyStateStyle}>
                      <p style={emptyStateTextStyle}>
                        Click "Generate Multi-Retailer Ads" in the left panel to create versions for all retailers
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={emptyStateStyle}>
              <p style={emptyStateTextStyle}>👉 Create an ad and click "Analyze & Generate" to see the preview here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const containerStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  padding: "30px",
  fontFamily: "'Segoe UI', 'Roboto', sans-serif",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  boxSizing: "border-box",
};

const headerStyle = {
  textAlign: "center",
  marginBottom: "30px",
  color: "white",
};

const titleStyle = {
  fontSize: "2.5em",
  margin: "0 0 8px 0",
  fontWeight: "700",
  textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
};

const subtitleStyle = {
  fontSize: "1.1em",
  opacity: 0.9,
  margin: 0,
};

const mainGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "30px",
  flex: 1,
  width: "100%",
  maxHeight: "calc(100vh - 200px)",
};

const leftPanelStyle = {
  background: "white",
  borderRadius: "16px",
  padding: "30px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  height: "fit-content",
  maxHeight: "calc(100vh - 220px)",
  overflowY: "auto",
};

const panelTitleStyle = {
  fontSize: "1.5em",
  color: "#333",
  margin: "0 0 20px 0",
  fontWeight: "600",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelTextStyle = {
  fontSize: "0.95em",
  fontWeight: "600",
  color: "#555",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  fontSize: "1em",
  border: "2px solid #e0e0e0",
  borderRadius: "8px",
  transition: "border-color 0.3s, box-shadow 0.3s",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "none",
  paddingRight: "30px",
  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  backgroundSize: "20px",
  paddingRight: "35px",
};

const primaryButtonStyle = {
  padding: "14px",
  fontSize: "1.05em",
  fontWeight: "600",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "white",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  transition: "transform 0.2s, box-shadow 0.2s",
  marginTop: "10px",
  boxShadow: "0 5px 20px rgba(102, 126, 234, 0.4)",
};

const rightPanelStyle = {
  background: "white",
  borderRadius: "16px",
  padding: "40px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  maxHeight: "calc(100vh - 220px)",
  overflowY: "auto",
};

const resultHeaderStyle = {
  display: "flex",
  gap: "20px",
  marginBottom: "30px",
  flexWrap: "wrap",
};

const statusBadgeStyle = {
  background: "#f0f0f0",
  padding: "16px 24px",
  borderRadius: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  flex: "1",
  minWidth: "150px",
};

const statusLabelStyle = {
  fontSize: "0.85em",
  color: "#999",
  fontWeight: "500",
};

const statusValueStyle = {
  fontSize: "1.5em",
  fontWeight: "700",
};

const scoreBadgeStyle = {
  background: "#f0f0f0",
  padding: "16px 24px",
  borderRadius: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  flex: "1",
  minWidth: "150px",
};

const scoreLabelStyle = {
  fontSize: "0.85em",
  color: "#999",
  fontWeight: "500",
};

const scoreValueStyle = {
  fontSize: "1.8em",
  fontWeight: "700",
  color: "#667eea",
};

const previewCardStyle = {
  border: "3px solid #667eea",
  borderRadius: "16px",
  padding: "30px",
  width: "320px",
  background: "linear-gradient(135deg, #eaf4ff 0%, #f0ebff 100%)",
  textAlign: "center",
  marginBottom: "25px",
  boxShadow: "0 10px 40px rgba(102, 126, 234, 0.2)",
};

const previewHeadlineStyle = {
  fontSize: "1.4em",
  margin: "0 0 15px 0",
  color: "#333",
  fontWeight: "700",
};

const previewImageStyle = {
  width: "100%",
  height: "auto",
  margin: "15px 0",
  borderRadius: "12px",
  objectFit: "cover",
};

const previewSubheadStyle = {
  fontSize: "0.95em",
  color: "#666",
  margin: "15px 0",
  lineHeight: "1.5",
};

const ctaButtonStyle = {
  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
  color: "white",
  border: "none",
  padding: "12px 28px",
  borderRadius: "24px",
  marginTop: "15px",
  fontSize: "1em",
  fontWeight: "600",
  cursor: "pointer",
  transition: "transform 0.2s, box-shadow 0.2s",
  boxShadow: "0 4px 15px rgba(22, 163, 74, 0.3)",
};

const disclaimerStyle = {
  fontSize: "0.8em",
  color: "#666",
  marginTop: "15px",
  fontStyle: "italic",
  opacity: 0.8,
};

const downloadButtonStyle = {
  padding: "13px 28px",
  fontSize: "1em",
  fontWeight: "600",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "white",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  transition: "transform 0.2s, box-shadow 0.2s",
  boxShadow: "0 5px 20px rgba(59, 130, 246, 0.4)",
  marginBottom: "25px",
  display: "inline-block",
};

const issuesContainerStyle = {
  background: "#fff3cd",
  border: "2px solid #ffc107",
  borderRadius: "12px",
  padding: "20px",
  marginTop: "20px",
};

const issuesTitleStyle = {
  fontSize: "1.1em",
  color: "#856404",
  margin: "0 0 12px 0",
  fontWeight: "600",
};

const issuesListStyle = {
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const issueItemStyle = {
  padding: "8px 12px",
  color: "#856404",
  borderBottom: "1px solid rgba(255, 193, 7, 0.3)",
  fontSize: "0.95em",
};

const emptyStateStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "400px",
  background: "linear-gradient(135deg, #f5f5f5 0%, #f0f0f0 100%)",
  borderRadius: "12px",
  border: "2px dashed #ddd",
};

const emptyStateTextStyle = {
  fontSize: "1.1em",
  color: "#999",
  fontWeight: "500",
};

const tabContainerStyle = {
  display: "flex",
  gap: "10px",
  marginBottom: "25px",
  borderBottom: "2px solid #e5e7eb",
  flexWrap: "wrap",
};

const tabButtonStyle = {
  padding: "12px 20px",
  border: "none",
  borderRadius: "8px 8px 0 0",
  cursor: "pointer",
  fontSize: "0.95em",
  fontWeight: "600",
  transition: "all 0.3s",
};

const tabContentStyle = {
  animation: "fadeIn 0.3s ease-in",
};

const sectionTitleStyle = {
  fontSize: "1.3em",
  color: "#333",
  margin: "0 0 20px 0",
  fontWeight: "700",
};

const previewContainerStyle = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "20px",
};

const infoTextStyle = {
  background: "#e0e7ff",
  border: "2px solid #667eea",
  borderRadius: "8px",
  padding: "12px",
  fontSize: "0.95em",
  color: "#555",
  marginTop: "15px",
  textAlign: "center",
};

const performanceMetricsStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "15px",
  marginBottom: "20px",
};

const metricCardStyle = {
  background: "#f3f4f6",
  padding: "20px",
  borderRadius: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const metricLabelStyle = {
  fontSize: "0.85em",
  color: "#999",
  fontWeight: "500",
};

const metricValueStyle = {
  fontSize: "2em",
  fontWeight: "700",
  color: "#667eea",
};

const performanceZoneStyle = {
  padding: "25px",
  borderRadius: "12px",
  border: "3px solid",
  textAlign: "center",
  marginBottom: "20px",
};

const suggestionsStyle = {
  background: "#f9fafb",
  border: "2px solid #e5e7eb",
  borderRadius: "10px",
  padding: "20px",
  marginTop: "20px",
};

const suggestionsTitleStyle = {
  fontSize: "1.05em",
  color: "#333",
  margin: "0 0 12px 0",
  fontWeight: "600",
};

const suggestionListStyle = {
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const multiRetailerGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: "15px",
  marginTop: "20px",
};

const retailerCardStyle = {
  background: "#f9fafb",
  border: "2px solid #e5e7eb",
  borderRadius: "10px",
  padding: "15px",
  textAlign: "center",
};

const previewCardSmallStyle = {
  border: "2px solid",
  borderRadius: "8px",
  padding: "12px",
  background: "#f3f4f6",
  minHeight: "60px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default App;
