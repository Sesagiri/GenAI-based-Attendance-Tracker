# I Rig — AI-Powered Smart Attendance System
### Multimodal GenAI · Voice · Vision · Real-Time

An intelligent attendance assistant that replaces manual attendance 
marking using Google Gemini's multimodal capabilities. Teachers mark 
attendance through voice commands, photos of handwritten sheets, 
Excel uploads, or natural text — reducing an 8-minute task to 
under 45 seconds.

---

## Demo

🌐 **[Live Demo — Try it now](https://sesagiriapp-ves9.vercel.app/)**

| Dashboard | Voice Input | OCR Recognition |
|---|---|---|
| ![Dashboard](https://github.com/user-attachments/assets/0b296095-508e-4da8-b6f7-1845b63a12d6) | ![Voice Input](https://github.com/user-attachments/assets/a3bd4ead-9877-400b-9d27-17690ea0aafe) | ![OCR Recognition](https://github.com/user-attachments/assets/dc3df06e-e7e4-45b1-97f8-9b665d07ade1) |

> 💡 Open in Chrome for full voice and camera support

---

## The Problem

Manual attendance marking in educational institutions is:
- **Slow** — 5–10 minutes per class session
- **Error-prone** — manual entry mistakes and missed records
- **Fragmented** — no unified system for multiple input formats
- **Repetitive** — same task every session, every day

---

## The Solution — I Rig

Instead of manual entry, the AI listens, understands, and updates 
attendance automatically across 5 input modes:

| Input Mode | Example |
|---|---|
| 🎤 Voice command | "Mark Arun absent" |
| 📸 Photo of sheet | Upload handwritten attendance photo |
| 📝 Handwritten notes | Scanned/photographed notes |
| 📊 Excel file | Upload existing .xlsx attendance sheet |
| 💬 Text input | "Everyone present except roll 42 and 57" |

---

## Performance Metrics

| Metric | Value |
|---|---|
| Attendance time | Reduced from 8 min → 45 seconds |
| Handwriting recognition accuracy | >95% |
| Voice response latency | <500ms |
| End-to-end voice response | <1.5 seconds |
| Mobile usability score | 100% |

---

## System Architecture

```
Teacher Input (Voice / Image / Text / Excel)
              ↓
    ┌─────────────────────────┐
    │   Multimodal AI Engine  │
    │                         │
    │  Gemini Live API        │ ← Real-time voice conversation
    │  Gemini 3 Pro Vision    │ ← OCR + handwriting recognition  
    │  Gemini 2.5 Flash       │ ← Audio/text analysis
    └────────────┬────────────┘
                 ↓
    ┌─────────────────────────┐
    │   Processing Pipeline   │
    │                         │
    │  Voice intent parsing   │
    │  OCR text extraction    │
    │  JSON structured output │
    │  Student matching algo  │
    │  Ambiguity detection    │
    └────────────┬────────────┘
                 ↓
    ┌─────────────────────────┐
    │   Attendance Records    │
    │                         │
    │  Update database        │
    │  Dashboard analytics    │
    │  Export to Excel        │
    └─────────────────────────┘
```

---

## AI Models Used

| Model | Purpose |
|---|---|
| **Gemini Live API** | Real-time voice conversation — teacher speaks naturally, AI responds live |
| **Gemini 3 Pro Vision** | OCR and handwriting recognition from photos of attendance sheets |
| **Gemini 2.5 Flash** | Audio and text analysis from voice notes and file uploads |

Built using **Google AI Studio** for full-stack development.

---

## Key Features

### Multimodal Input
- Web Audio API for live voice capture
- Camera and file upload for image input
- SheetJS for Excel file parsing

### AI Intelligence
- Reads handwritten attendance sheets
- Extracts roll numbers and present/absent status
- Converts voice notes into attendance records
- Resolves ambiguous references ("mark him absent" → uses context)
- Interprets natural phrases ("not here" = absent)

### Real-Time AI Agent
- WebSocket streaming — AI continuously listens and responds
- Live conversation flow — no button pressing required

### Function Calling
AI directly triggers system actions:
```javascript
markAttendance(rollNumber, status)
addStudent(name, rollNumber)
removeStudent(rollNumber)
```

### Smart Ambiguity Handling
- Detects unclear references and asks for clarification
- Uses conversation context to resolve pronouns
- Identifies chronic absentees from attendance trends

### Dashboard & Export
- FN / AN attendance donut charts
- Weekly attendance trend graphs
- Sidebar navigation
- Export to Excel automatically
- AI chat floating button

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| AI Engine | Google Gemini (Live API, Pro Vision, 2.5 Flash) |
| Voice | Web Audio API, WebSocket streaming |
| File Processing | SheetJS (Excel), Camera API (images) |
| Development Platform | Google AI Studio |
| Storage | localStorage (offline-first) |

---

## How to Run

```bash
# Clone the repository
git clone https://github.com/Sesagiri/Sesagiriapp
cd Sesagiriapp

# Open in browser
# Option 1: Direct
open index.html

# Option 2: Local server (recommended)
python -m http.server 8000
# Visit http://localhost:8000
```

**Requirements:**
- Google AI Studio API key
- Modern browser with Web Audio API support (Chrome recommended)
- Camera access for image input mode

---

## Usage Examples

```
Teacher: "Mark everyone present"
I Rig: "Done — 45 students marked present for this session."

Teacher: "Arun is absent today"  
I Rig: "Marked Arun Kumar (Roll 23) absent. Confirm?"

Teacher: [uploads photo of handwritten sheet]
I Rig: "Detected 3 absentees — Roll 12, 34, and 47. Update records?"

Teacher: "Who has less than 75% attendance?"
I Rig: "5 students below 75%: [lists names and percentages]"
```

---

## Traditional vs I Rig

| Aspect | Traditional | I Rig |
|---|---|---|
| Input method | Checkbox / Excel typing | Voice or image |
| Name lookup | Manual searching | AI resolves automatically |
| Entry style | One-by-one | Bulk commands |
| Time taken | 5–10 minutes | <45 seconds |
| Error handling | Manual correction | AI ambiguity detection |
| Record keeping | Fragmented | Unified dashboard |

---

## What I Learned

- Multimodal AI goes beyond text generation — combining voice, 
  vision, and reasoning creates genuinely useful real-world tools
- WebSocket streaming enables truly conversational AI experiences
- Function calling bridges AI reasoning with system actions
- Ambiguity handling is the hardest part of natural language 
  interfaces — edge cases matter more than the happy path

---

## Related Projects

- 🤖 [TD3 Autonomous Navigation](https://github.com/Sesagiri/td3-autonomous-robot-navigation) — Deep RL sim-to-real robotics
- 🌐 [Portfolio](https://sesagirikr.framer.website)

---

*Built as part of Introduction to Generative AI coursework*  
*Amrita School of Engineering · 2025*
