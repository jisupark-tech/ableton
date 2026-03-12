# Suno Helper

> Chrome Extension that automates music creation workflows — auto-fill prompts from suhbway.kr to Suno.com and save generated music metadata to GitHub.

![Chrome](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome)
![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow)
![Manifest](https://img.shields.io/badge/Manifest-V3-green)

---

## Features

### Feature A: Auto-Fill (suhbway.kr → Suno)

Automatically transfers prompt data from suhbway.kr to Suno.com's creation page.

- **One-click transfer** — "Send to Suno" button on suhbway.kr prompt pages
- **Auto-fill fields** — Style of Music, Lyrics, Exclude Styles, Parameter sliders
- **Smart detection** — 7-level parent traversal, aria-describedby, name attribute matching
- **React 18+ compatible** — Handles Fiber memoizedProps reset, focusin/focusout events
- **Retry logic** — Independent per-field retries with 30-second timeout
- **Auto Custom mode** — Switches Suno to Custom mode before filling

### Feature B: Save to GitHub (Suno → GitHub)

Select generated songs on Suno.com and save metadata directly to your GitHub repository.

- **Song selection** — Checkbox overlay on song cards
- **Optional scoring** — Rate songs 0-100 before saving
- **Markdown export** — Creates individual song files with full metadata
- **History tracking** — Auto-updates README.md with a history table
- **Multi-strategy data fetch** — Studio API → React Fiber → Background tab rendering

---

## How It Works

```
suhbway.kr                    Suno.com                     GitHub
┌──────────┐    click     ┌──────────────┐   save      ┌──────────┐
│  Prompt  │ ──────────→  │  Create Page │ ──────────→ │  Repo    │
│  Detail  │  auto-fill   │  (Custom)    │  metadata   │  songs/  │
│  Page    │              │  ♫ Generate  │             │  README  │
└──────────┘              └──────────────┘             └──────────┘
```

---

## Installation

1. Go to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select the `Suno/` folder
4. Pin the extension icon in toolbar
5. Click the icon and configure:
   - **GitHub Personal Access Token** (with repo scope)
   - **GitHub Username**
   - **Repository Name**

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Platform** | Chrome Extension (Manifest V3) |
| **Language** | JavaScript (ES2020+) |
| **APIs** | Chrome Storage, Tabs, Cookies, Scripting |
| **External** | GitHub REST API, Suno Studio API |
| **Permissions** | suno.com, suhbway.kr, api.github.com |

---

## Web Application (Homepage)

A full-featured **music community platform** built with PHP + SQLite.

### Features

- **User System** — Registration, login, profiles, messaging, follow
- **Music Library** — Upload, browse, play, like, bookmark, share
- **Community Board** — Posts, comments, image uploads
- **Prompt Sharing** — Create and share music generation prompts
- **Search & Discovery** — Tag search, popular tracks, rankings
- **Admin Panel** — User/content management, settings, reports (41 admin pages)

### Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | PHP 8+ |
| **Database** | SQLite |
| **Frontend** | Tailwind CSS, dark theme |
| **Features** | 58 PHP pages + 41 admin pages |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.1.0 | 2026-03-11 | React 18+ compatibility, improved field detection, duplicate prevention |
| v2.0.0 | 2026-03 | Manifest V3 migration, multi-strategy data fetch |

---

## License

MIT License
