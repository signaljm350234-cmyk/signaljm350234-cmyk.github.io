# Personal Website Project — Handoff Document

**Generated**: 2026-08-11
**Built by**: Claude Code
**For**: OpenCode or any AI coding agent
**Read this first** before doing any work on this project.

---

## Quick Facts

| Item | Value |
|------|-------|
| **URL** | https://signaljm350234-cmyk.github.io |
| **GitHub repo** | https://github.com/signaljm350234-cmyk/signaljm350234-cmyk.github.io |
| **Local path** | `C:\Users\ROG\personal-site` |
| **Framework** | Hexo 8.x (Node.js static blog generator) |
| **Theme** | hexo-theme-aero (MIT) — HEAVILY customized |
| **Deploy** | GitHub Actions → GitHub Pages, auto on each push |
| **Git remote** | `origin` = `https://github.com/signaljm350234-cmyk/signaljm350234-cmyk.github.io.git` |
| **Git user** | `signaljm350234-cmyk` / `signaljm350234@gmail.com` |
| **VPN proxy** | `127.0.0.1:7890` (Clash) — needed for git push |

---

## File Map (what's where)

```
C:\Users\ROG\personal-site\
├── _config.yml                          ★ Site config (title, author, URL, perms)
├── package.json                         Node dependencies
├── scaffolds/                           Hexo scaffolds for new posts
│   ├── post.md                           Default post template
│   └── learning.md                       Learning note template
├── source/                              ★ Content (the files you edit most)
│   ├── _data/spending.json              ★ Spending tracker data
│   ├── _posts/                          Markdown blog posts
│   ├── about/index.md                    About page
│   ├── spending/index.md                 Spending page (layout=spending)
│   ├── categories/index.md              Category listing
│   └── galaxy-bg/                       ★ Galaxy black hole background
│       ├── index.html                   Standalone page (not wrapped by Hexo)
│       ├── style.css                    Galaxy reset CSS
│       └── script.js                    665KB (Three.js + custom galaxy engine)
├── themes/aero/                         ★ Customized theme (MIT fork)
│   ├── _config.yml                      Theme config (profile, music, etc.)
│   ├── layout/                          EJS templates
│   │   ├── layout.ejs                   ★ Main layout (intro animation, iframe, taskbar)
│   │   ├── _partial/
│   │   │   ├── header.ejs               Nav table as desktop window
│   │   │   ├── widget.ejs               Profile + Music as draggable windows
│   │   │   └── footer.ejs               (unused — copyright now in taskbar)
│   │   ├── index.ejs                    Homepage article list window
│   │   ├── post.ejs                     Single post window
│   │   ├── about.ejs                    About page window
│   │   ├── archive.ejs                  Archives window
│   │   └── spending.ejs                  Spending page window template
│   └── source/
│       ├── css/                         SCSS partials (compiled to style.css)
│       │   ├── style.scss               Entry point
│       │   └── _partial/
│       │       ├── _variables.scss      PC-98 color scheme
│       │       ├── _main.scss           Body, card, button, layout
│       │       ├── _desktop.scss        Taskbar, desktop icons, window classes
│       │       ├── _header.scss         Nav window styles
│       │       ├── _post.scss           Post cards
│       │       ├── _archive.scss        Archive timeline
│       │       ├── _markdown.scss        Post content formatting
│       │       ├── _footer.scss         Footer (unused now)
│       │       ├── _responsive.scss     Mobile adaptation
│       │       └── _widgets/
│       │           ├── _profile.scss    Profile widget window
│       │           └── _music.scss      Music player widget
│       ├── js/
│       │   ├── desktop.js               Window dragging + z-index
│       │   ├── image-viewer.js           Fullscreen image zoom/pan
│       │   ├── music.js                 Audio player
│       │   ├── responsive.js            Mobile sidebar toggle
│       │   └── blackhole-bg.js          (DEPRECATED) Old canvas attempts
│       └── image/                       Theme icons + background
└── .github/workflows/
    └── deploy.yml                       GitHub Actions deploy config
```

---

## Architecture Decisions

### 1. Galaxy black hole background via iframe
The black hole is a standalone HTML page loaded in a fullscreen iframe:
- Source: `source/galaxy-bg/` (copied directly from CodePen "galaxy" project dist)
- 655KB script.js = Three.js minified + custom galaxy particle engine (50K particles, spiral arms, distortion post-processing)
- **Why iframe**: Direct embedding caused CSS conflicts (`* { margin:0 }` reset destroyed PC-98 layout). iframe provides complete sandbox isolation.
- **pointer-events:none** on iframe so clicks pass through to the PC-98 window layer.

### 2. Intro animation system
- **Only on homepage** (`is_home()` gating in EJS)
- Camera zoom: `scale(2.5)+blur(12px)→scale(1.0)+blur(0)` over 3 seconds, 1/x curve
- White flash at 2.8s
- Windows appear staggered: title(3.0s) → main(3.2s) → icons(3.4s) → menu(3.5s) → taskbar(3.6s)
- **localStorage `intro_done=1`** — plays once, never again. Delete this key to reset.
- Subpages have NO intro animation (plain iframe, no .intro-item classes)

### 3. PC-98 window system
- All desktop windows are `position: fixed` with `.draggable-element` class
- Only the title bar area triggers drag (`.undraggable-element` children are exempt)
- z-index auto-increments on click to bring window to front
- Profiles/Music windows originate from widget.ejs partial
- Content windows (posts/spending/about) come from their respective .ejs templates

### 4. Content categories
- Posts use `categories:` frontmatter: `想法` (thoughts) or `学习笔记` (learning)
- Tags support multi-categorization
- Archives auto-generated by Hexo, sorted by year/month

### 5. VPN / networking
- Git operations need proxy: `git config http.proxy "http://127.0.0.1:7890"`
- Detection: `netstat -an | grep LISTEN | grep 7890`

---

## Common Tasks

### Add a new blog post
```bash
cd C:\Users\ROG\personal-site
npx hexo new post "我的文章标题"
# Edit source/_posts/YYYY-MM-DD-我的文章标题.md
# Frontmatter: categories: 想法 or 学习笔记, tags: [tag1, tag2]
npx hexo server  # preview at http://localhost:4000
git add -A && git commit -m "新文章: xxx" && git push
```

### Add spending record
Edit `source/_data/spending.json`, add entry:
```json
{"name": "Item Name", "price": 1234, "date": "2026-08-01", "category": "数码"}
```
Then commit and push. The spending page auto-calculates per-day cost.

### Modify site colors / fonts
Edit `themes/aero/source/css/_partial/_variables.scss` — all PC-98 colors are defined as CSS custom properties.

### Add a new page type
1. Create `source/newpage/index.md` with `layout: newpage`
2. Create `themes/aero/layout/newpage.ejs` with window structure
3. Add nav link in `layout.ejs` header and taskbar sections

### Test intro animation
1. Open browser DevTools → Application → Local Storage
2. Delete key `intro_done`
3. Refresh homepage

### Deploy manually (if Actions fails)
```bash
cd C:\Users\ROG\personal-site
git add -A && git commit -m "manual deploy" && git push
```
GitHub Actions auto-deploys within ~30 seconds.

---

## Known Issues & Gotchas

1. **Galaxy script is 655KB** — it's a bundled Three.js library + custom code. Don't try to edit it; treat it as a binary blob. The source CodePen is at `C:\Users\ROG\Downloads\galaxy\galaxy\`.

2. **Theme is heavily forked** — pulling upstream hexo-theme-aero updates will conflict with our changes. We've modified almost every CSS partial and template.

3. **Windows randomly positioned** — each `.desktop-window` has inline `style="top:...;left:..."` in the template. Drag state resets on page navigation (SPA not implemented).

4. **Mobile layout** — <768px breaks the free-form window arrangement. Windows stack vertically in a single column instead.

5. **`blackhole-bg.js`** is dead code from our failed shader attempts (v5-v6.2). It's not loaded anymore — the galaxy iframe replaced it. Safe to delete.

6. **vision.js** at `C:\Users\ROG\vision.js` is a Qwen multimodal image analysis script. NOT part of the website project.

---

## If Something Breaks

1. **Site is 404**: Check https://github.com/signaljm350234-cmyk/signaljm350234-cmyk.github.io/settings/pages — ensure "Source" is "GitHub Actions"
2. **Actions failing**: Check https://github.com/signaljm350234-cmyk/signaljm350234-cmyk.github.io/actions
3. **Black background, no galaxy**: The iframe src `/galaxy-bg/` might not be loading — check browser Network tab
4. **Windows not draggable**: Check that `desktop.js` is loaded and no JS errors in console
5. **Intro animation not playing**: Check the `<% if (is_home()) { %>` blocks in `layout.ejs` — the animation CSS styles and camera-rig HTML are both gated by this condition

---

## Claude Code Environment (for OpenCode migration)

The original Claude Code environment had these installed. OpenCode should install equivalents:

### Skills (in `~/.claude/skills/`)
| Skill | Purpose |
|-------|---------|
| `academic-paper` | 12-agent paper writing pipeline |
| `academic-paper-reviewer` | Multi-perspective peer review simulation |
| `academic-pipeline` | Full academic research pipeline orchestrator |
| `deep-research` | 13-agent deep research team |
| `agently-mail` | Email operations via agently-cli |
| `easyeda-api` | PCB design with EasyEDA Pro |
| `shared` | Shared references across all academic skills |

### Plugin (via marketplace)
```
/plugin marketplace add Imbad0202/academic-research-skills
/plugin install academic-research-skills
```
This provides 10 slash commands: `/ars-full`, `/ars-plan`, `/ars-outline`, `/ars-revision`, `/ars-revision-coach`, `/ars-abstract`, `/ars-lit-review`, `/ars-format-convert`, `/ars-citation-check`, `/ars-disclosure`

### Environment config (~/.claude/settings.json)
```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:15721",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-7[1M]",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-6[1M]",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-5"
  }
}
```
Custom model routing through local proxy at port 15721 (DeepSeek models).

### VPN hook (~/.claude/scripts/vpn-pre-tool-use.sh)
Bash/WebFetch tools auto-trigger VPN pre-check before network calls.

### vision.js (at `C:\Users\ROG\vision.js`)
Qwen multimodal image analysis script — NOT part of the website project but used for screenshot analysis during development. Calls local Qwen API endpoint.
