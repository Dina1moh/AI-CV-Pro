// =============================
// Global State (Persistent)
// =============================
let cvData = JSON.parse(localStorage.getItem("cvData"));
let matchData = JSON.parse(localStorage.getItem("matchData"));

// =============================
// Utility: Loading
// =============================
function setLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerText;
        button.innerText = "Processing...";
    } else {
        button.disabled = false;
        button.innerText = button.dataset.originalText;
    }
}

// =============================
// Extract CV
// =============================
async function extractCV(event) {
    const button = event?.target;
    const fileInput = document.getElementById("cvFile");

    if (!fileInput.files.length)
        return alert("Please upload a CV file");

    setLoading(button, true);

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const res = await fetch("/extract", {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        cvData = data;
        localStorage.setItem("cvData", JSON.stringify(cvData));

        displayList("cvResult", data);

    } catch (err) {
        alert("Something went wrong while extracting CV");
    }

    setLoading(button, false);
}

// =============================
// Match Job
// =============================
async function matchJob(event) {
    const button = event?.target;
    const jobText = document.getElementById("jobDescription").value;

    if (!cvData)
        return alert("Extract CV first");

    setLoading(button, true);

    try {
        const res = await fetch("/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cv_data: cvData,
                job_description: jobText
            })
        });

        const data = await res.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        matchData = data;
        localStorage.setItem("matchData", JSON.stringify(matchData));

        displayList("matchResult", data);

    } catch (err) {
        alert("Match failed");
    }

    setLoading(button, false);
}

// =============================
// Generate Cover Letter
// =============================
async function generateCoverLetter(event) {
    const button = event?.target;

    if (!cvData || !matchData)
        return alert("Run CV extraction and match first");

    setLoading(button, true);

    try {
        const res = await fetch("/generate_cover_letter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cv_data: cvData,
                match_data: matchData,
                job_description: {
                    title: "Unknown",
                    company: "Unknown",
                    responsibilities: document
                        .getElementById("jobDescription")
                        .value.split("\n"),
                    requirements: []
                }
            })
        });

        const data = await res.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        document.getElementById("coverLetterResult").innerHTML =
            `<div style="white-space:pre-line">${data.content}</div>`;

    } catch (err) {
        alert("Generation failed");
    }

    setLoading(button, false);
}

// =============================
// Download Cover Letter
// =============================
async function downloadCoverLetter() {
    const content =
        document.getElementById("coverLetterResult").innerText;

    if (!content)
        return alert("Generate cover letter first");

    try {
        const res = await fetch("/download_cover_letter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content })
        });

        const data = await res.json();

        if (data.pdf_url)
            window.open(data.pdf_url, "_blank");

    } catch {
        alert("Download failed");
    }
}

// =============================
// RAG Chat (Uses CV Analysis)
// =============================
async function sendRagMessage(event) {
    const button = event?.target;
    const input = document.getElementById("ragMessage");

    if (!input.value)
        return;

    appendChat("You", input.value);
    setLoading(button, true);

    const formData = new FormData();
    formData.append("message", input.value);

    // 🔥 Inject CV analysis if available
    if (cvData && matchData) {
        const cv_analysis = {
            match_percentage: matchData.match_percentage,
            strengths: matchData.strengths,
            gaps: matchData.gaps,
            recommended_skills: matchData.recommended_skills,
            improvement_suggestions:
                matchData.improvement_suggestions || []
        };

        formData.append(
            "cv_analysis",
            JSON.stringify(cv_analysis)
        );
    }

    const file =
        document.getElementById("ragFile").files[0];

    if (file)
        formData.append("file", file);

    try {
        const res = await fetch("/rag/chat", {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        appendChat(
            "AI",
            data.response || data.error || "No response"
        );

    } catch {
        appendChat("Error", "Something went wrong");
    }

    input.value = "";
    setLoading(button, false);
}

// =============================
// Clear Stored Data (Optional)
// =============================
function clearSession() {
    localStorage.removeItem("cvData");
    localStorage.removeItem("matchData");
    cvData = null;
    matchData = null;
    alert("Session cleared");
}

// =============================
// Helpers
// =============================
function displayList(elementId, obj) {
    const container = document.getElementById(elementId);
    let html = "<ul>";

    for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
            html += `<li><strong>${key}:</strong><ul>`;
            value.forEach(item => {
                if (typeof item === "object") {
                    html += "<li>";
                    for (const [k, v] of Object.entries(item))
                        html += `<div><strong>${k}:</strong> ${v ?? "-"}</div>`;
                    html += "</li>";
                } else {
                    html += `<li>${item}</li>`;
                }
            });
            html += "</ul></li>";
        } else {
            html += `<li><strong>${key}:</strong> ${value}</li>`;
        }
    }

    html += "</ul>";
    container.innerHTML = html;
}

function appendChat(sender, text) {
    const chatBox = document.getElementById("chatBox");
    const msg = document.createElement("div");

    msg.className =
        sender === "You" ? "chat-user" : "chat-ai";

    msg.innerText = text;

    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}