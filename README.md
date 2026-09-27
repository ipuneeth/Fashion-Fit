# 🥼 Fashion-Fit — AI Virtual Try-On

> **Try clothes virtually before you buy — directly from your browser.**

Fashion-Fit is an AI-powered **virtual fashion try-on Chrome extension** inspired by modern virtual try-on platforms such as Anywear.

The project allows users to select clothing from an online fashion website or upload a garment image, activate their webcam, and visualize the selected garment on themselves in real time using an AI-powered virtual try-on model.

---

## ✨ Features

* 👕 **Virtual Try-On** — Visualize clothing on yourself using your webcam.
* 📸 **Live Camera Support** — Uses the device camera for real-time interaction.
* 🖼️ **Garment Upload** — Upload a clothing image directly from your computer.
* 🖱️ **Drag & Drop** — Quickly select garment images using drag-and-drop.
* 🌐 **Webpage Garment Selection** — Select clothing images directly from supported webpages.
* 🔄 **Camera Switching** — Switch between available camera devices.
* 🎥 **Real-Time Processing** — Designed around a real-time virtual try-on workflow.
* 🧩 **Chrome Extension Architecture** — Works through a browser extension rather than requiring a standalone application.
* 🔐 **Backend API Proxy** — Keeps the external AI API credential on the server rather than exposing it directly in the extension.
* 🎨 **Isolated Extension UI** — Uses an isolated UI approach to reduce interference with the host webpage.

---

## 🧠 How It Works

Fashion-Fit combines a Chrome extension frontend with a lightweight backend and a real-time AI virtual try-on service.

```text
                  ┌─────────────────────┐
                  │   Fashion Website   │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │  Fashion-Fit Chrome │
                  │      Extension      │
                  └──────────┬──────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
       ┌─────────────────┐       ┌─────────────────┐
       │ Garment Image   │       │ Webcam / Camera │
       │ Selection       │       │ Stream          │
       └────────┬────────┘       └────────┬────────┘
                │                         │
                └────────────┬────────────┘
                             ▼
                  ┌─────────────────────┐
                  │  Backend API Layer  │
                  │      Express        │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Real-Time AI        │
                  │ Virtual Try-On      │
                  │      Model          │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Live Virtual        │
                  │ Try-On Experience   │
                  └─────────────────────┘
```

### Typical user flow

1. Open an online fashion website.
2. Launch the Fashion-Fit Chrome extension.
3. Select a garment:

   * Upload an image
   * Drag and drop an image
   * Select an image from the webpage
4. Enable the camera.
5. Start virtual try-on.
6. The camera stream and selected garment are processed through the virtual try-on pipeline.
7. View the resulting virtual outfit experience in real time.

---

## 🏗️ Project Architecture

The project is divided into two major components:

```text
Fashion-Fit/
│
├── extension/
│   ├── public/
│   ├── src/
│   │   ├── background.ts
│   │   ├── content/
│   │   ├── popup/
│   │   ├── sidepanel/
│   │   └── assets/
│   ├── manifest.config.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── server/
│   ├── src/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
└── .gitignore
```

### Extension

The `extension` application contains the Chrome extension UI and browser-side functionality.

It handles:

* User interaction
* Garment selection
* Webcam access
* Content-script integration
* Popup UI
* Side-panel UI
* Background browser operations
* Communication with the backend

### Server

The `server` application provides the backend layer required to communicate securely with the external AI service.

The backend is responsible for:

* API authentication
* Creating client access/token information
* Keeping sensitive credentials outside the browser extension
* Providing an API endpoint consumed by the extension

---

## 🛠️ Tech Stack

### Frontend / Browser Extension

| Technology            | Purpose                       |
| --------------------- | ----------------------------- |
| React                 | User interface                |
| TypeScript            | Type-safe development         |
| Vite                  | Development and build tooling |
| CRXJS                 | Chrome extension development  |
| CSS                   | Extension styling             |
| Chrome Extension APIs | Browser integration           |

### Backend

| Technology | Purpose                       |
| ---------- | ----------------------------- |
| Node.js    | Server runtime                |
| Express    | Backend API                   |
| TypeScript | Type-safe backend development |
| dotenv     | Environment configuration     |

### AI / Virtual Try-On

The project integrates a real-time virtual try-on service using the **Lucy VTON** model through the Decart real-time API.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

* Node.js
* npm
* Google Chrome
* A Decart API key

Check your installations:

```bash
node --version
npm --version
```

---

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/ipuneeth/Fashion-Fit.git
```

Navigate into the project:

```bash
cd Fashion-Fit
```

---

## 🔧 Configure the Backend

Navigate to the server:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

Create an environment file:

```text
.env
```

Add your API key:

```env
DECART_API_KEY=your_decart_api_key_here
```

> ⚠️ **Never commit your `.env` file or expose your API key publicly.**

Start the backend:

```bash
npm run dev
```

The backend runs locally and provides the API required by the extension.

---

## 🧩 Build the Chrome Extension

Open another terminal and navigate to:

```bash
cd extension
```

Install dependencies:

```bash
npm install
```

Build the extension:

```bash
npm run build
```

This generates the production extension build.

---

## 🌐 Load the Extension in Chrome

1. Open Google Chrome.
2. Navigate to:

```text
chrome://extensions/
```

3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Select the generated extension build directory.

The Fashion-Fit extension should now appear in your Chrome extensions list.

---

## 🔐 Environment Variables

The backend requires:

| Variable         | Description                                                                       |
| ---------------- | --------------------------------------------------------------------------------- |
| `DECART_API_KEY` | API credential used by the backend to communicate with the virtual try-on service |

For security, use:

```text
server/.env
```

and never commit the actual credentials.

A safe example can be provided as:

```text
server/.env.example
```

with:

```env
DECART_API_KEY=your_decart_api_key_here
```

---

## 🎯 Project Goals

Fashion-Fit was built to explore how **AI-powered virtual try-on technology** can be integrated directly into the online shopping experience.

The project focuses on reducing the gap between:

```text
"I like this clothing"
          ↓
"How would it look on me?"
```

Instead of relying entirely on imagination or static product photography, users can interact with clothing through a more personalized visual experience.

---

## 🔬 Technical Highlights

### Real-Time Camera Processing

The browser camera is accessed through the Web Media API:

```javascript
navigator.mediaDevices.getUserMedia()
```

The resulting camera stream is used as part of the virtual try-on pipeline.

### Browser-Based Garment Selection

Fashion-Fit can work with garment images obtained from multiple sources:

```text
Local Upload
     │
     ├── Upload
     ├── Drag & Drop
     └── Webpage Image
```

### Backend Credential Isolation

Instead of placing the primary API credential directly inside the Chrome extension:

```text
Chrome Extension
       │
       ▼
Backend API
       │
       ▼
External AI Service
```

This provides a cleaner separation between the client and sensitive server-side credentials.

---

## 📈 Future Improvements

Potential future enhancements include:

* 🧍 Improved body and pose handling
* 👚 Support for additional garment categories
* 👖 Pants and full-body outfit try-on
* 🎨 Improved garment preservation
* 📱 Mobile support
* 💾 Saved outfits and wardrobe history
* 🛍️ Direct integration with more e-commerce platforms
* ⚡ Further optimization of real-time inference
* 👤 Personalized recommendations
* 📊 Virtual try-on analytics
* ☁️ Production cloud deployment
* 🔒 Enhanced authentication and API security

---

## ⚠️ Disclaimer

Fashion-Fit is an independent project created for educational, research, and demonstration purposes.

It is inspired by the concept of modern AI-powered virtual fashion try-on platforms and is **not affiliated with or endorsed by Anywear or other commercial platforms**.

---

## 👨‍💻 Author

**Puneeth**

Computer Science Engineering
Machine Learning & Applied Data Science

GitHub:
https://github.com/ipuneeth

---

## ⭐ Support

If you find this project interesting, consider giving the repository a ⭐ on GitHub.

Contributions, suggestions, and improvements are welcome.

---

## 📄 License

This project currently does not specify a license.

If you intend to make the repository open source, consider adding an appropriate license such as the MIT License after reviewing the applicable dependencies and project requirements.
