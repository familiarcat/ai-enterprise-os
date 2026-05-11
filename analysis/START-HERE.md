# 🚀 START HERE: Updated Sovereign Factory Documentation

**Date:** May 10, 2026  
**Status:** ✅ Complete — Aligned with actual repository structure  
**Language:** Modern Prompt Engineering + 5 Crew Personas

---

## What's New?

This documentation rebuild is **100% aligned with your actual GitHub repository** at https://github.com/familiarcat/ai-enterprise-os:

✅ **Real folder structure mapped** (apps/, core/, domains/, scripts/, tools/, versions/)  
✅ **5 crew members analyzed** (Picard, Riker, Data, Worf, Geordi)  
✅ **MCP tools in Application Layer** (corrected architecture)  
✅ **Modern prompt engineering** (system prompts, multi-agent reasoning)  
✅ **2026 VS Code markdown compatible** (all links work in preview)  
✅ **Actual code examples** (not hypothetical)  

---

## 📖 Three Documentation Files

### 1. **README.md** (Start Here!)
- **Length:** 17 KB, 559 lines
- **Purpose:** Comprehensive guide to the entire platform
- **For:** Everyone—developers, architects, non-technical stakeholders
- **Contains:**
  - Quick summary of what Sovereign Factory does
  - Actual repository structure
  - Deep explanation of all 5 crew members with code examples
  - 4-layer DDD architecture
  - Complexity routing & cost savings
  - Worf's security gate
  - Modern prompt engineering syntax
  - Getting started in 5 minutes
  - How to use each core file

**Read this first.** It's self-contained and explains everything.

---

### 2. **ARCHITECTURE-GUIDE.md** (Deep Dive)
- **Length:** 14 KB, 476 lines
- **Purpose:** Technical architecture reference
- **For:** Developers, architects, anyone building new domains
- **Contains:**
  - Complete system map (how everything connects)
  - Detailed explanation of 5 core modules:
    - `core/orchestrator/` (Picard)
    - `core/router/` (Complexity scoring)
    - `core/crew-manifest/` (Team definitions)
    - `core/mcp-manifest/` (Security & registry)
    - `domains/` (Business logic)
  - Scripts walkthrough (scaffold, analyze, deploy)
  - How the crew coordinates (sequence diagram)
  - Testing strategy
  - Key takeaways

**Read this when you need to understand how pieces fit together.**

---

### 3. **QUICK-REFERENCE.md** (Cheat Sheet)
- **Length:** 6.1 KB, 260 lines
- **Purpose:** Practical reference while building
- **For:** Developers, operators, people getting things done
- **Contains:**
  - Crew coordination quick guide
  - Model selection cheat sheet
  - Worf's security gate flow
  - Finding code by persona
  - Testing by scenario
  - Adding a new MCP tool (step-by-step)
  - Scaffolding a new domain (step-by-step)
  - Cost savings calculator
  - Common mistakes & fixes

**Keep this open in a tab while working.**

---

## 🎯 How to Use These Docs

### I'm New to the Project
```
1. Read: README.md (sections 1-3)
2. Skim: ARCHITECTURE-GUIDE.md (main map)
3. Run: Setup commands from README.md
4. Bookmark: QUICK-REFERENCE.md for later
```

### I'm Building a New Domain
```
1. Reference: ARCHITECTURE-GUIDE.md (domains/ section)
2. Execute: QUICK-REFERENCE.md (scaffolding a new domain)
3. Check: README.md (DDD patterns section)
4. Validate: QUICK-REFERENCE.md (testing by scenario)
```

### I'm Debugging or Investigating
```
1. Use: QUICK-REFERENCE.md (finding code by persona)
2. Reference: ARCHITECTURE-GUIDE.md (system map)
3. Deep dive: README.md (detailed explanation)
```

### I'm Setting Up the Platform
```
1. Follow: README.md (getting started)
2. Configure: QUICK-REFERENCE.md (MCP tools / allowlist)
3. Deploy: ARCHITECTURE-GUIDE.md (scripts section)
```

---

## 🔑 Key Concepts (In 2 Minutes)

### The Crew (5 Personas)
| Persona | Role | Authority | Model |
|---------|------|-----------|-------|
| **Picard** | Orchestrator | Final decision | Opus (0.7–1.0) |
| **Riker** | Executor | Tactical only | Haiku (0.0–0.3) |
| **Data** | Architect | Recommends | Sonnet (0.3–0.7) |
| **Worf** | Security | Can veto | N/A |
| **Geordi** | Engineer | Infrastructure | N/A |

### The Layers (DDD)
```
Domain Layer        → Zero external dependencies
Application Layer   → Use cases + MCP tools ← NEW PLACEMENT
Infrastructure      → Implementations + APIs
UI/Adapter          → REST, webhooks, adapters
```

### The Flows
```
User Goal → Picard Plans → Crew Analyzes → Riker Executes → Result
   ↓           ↓              ↓              ↓               ↓
Request   Mission Plan   Risk/Capacity   Model Selected   Domain Built
           Complexity    Assessment      Via Router        Decision Recorded
           Routing       Worf Validates
```

---

## 📁 File Overview

```
/mnt/user-data/outputs/
├── README.md                    ← Main reference (start here!)
├── ARCHITECTURE-GUIDE.md        ← How pieces fit together
├── QUICK-REFERENCE.md           ← Practical cheat sheet
└── START-HERE.md               ← This file
```

---

## ✅ What's Included

| Feature | README | Architecture | Quick Ref |
|---------|--------|-------------|-----------|
| Repository structure | ✅ | ✅ | |
| All 5 crew members explained | ✅ | ✅ | ✅ |
| Code examples | ✅ | ✅ | ✅ |
| Getting started steps | ✅ | | ✅ |
| System architecture map | | ✅ | |
| Module deep dives | | ✅ | |
| Testing strategies | | ✅ | ✅ |
| Practical cheat sheet | | | ✅ |
| Common mistakes | | | ✅ |
| Cost calculations | | | ✅ |

---

## 🚀 Next Steps

1. **Read README.md** (sections 1-3) — 10 minutes
2. **Run setup** — 5 minutes
   ```bash
   zsh ./setup_credentials.sh
   pnpm install
   node ./apps/api/mcp-server.js
   ```
3. **Explore the code** — Check `core/` and `domains/`
4. **Try the crew** — Use it in Claude with MCP server running
5. **Reference as needed** — Use QUICK-REFERENCE.md & ARCHITECTURE-GUIDE.md

---

## 📊 Documentation Stats

- **Total lines:** 1,295
- **Total size:** 37 KB
- **Code examples:** 15+
- **Diagrams:** 8+ (in text format)
- **Cross-references:** Complete
- **2026-compatible:** ✅ All VS Code markdown links work

---

## 🎯 Key Principles

These docs emphasize:

1. **Specialization** – Each crew member has ONE job
2. **Clear Authority** – No ambiguity about who decides
3. **Transparency** – How every piece connects
4. **Practicality** – Real code, real examples
5. **Learning** – Understand WHY, not just HOW

---

## 💡 Pro Tips

- **Bookmark all three files** — You'll reference them often
- **Keep QUICK-REFERENCE in a tab** — For when you're coding
- **Read Architecture decisions in /versions/** — Understand the "why"
- **Test with `pnpm test`** — Validates your understanding
- **Use the crew in Claude** — They work best together

---

## ❓ Common Questions

**Q: Where do I start?**
A: README.md sections 1-3, then run setup commands.

**Q: How do I add a new MCP tool?**
A: QUICK-REFERENCE.md has step-by-step instructions.

**Q: What's this "Worf Gate" I keep hearing about?**
A: README.md section "Worf's Security Clearance Gate" + QUICK-REFERENCE.md section "Worf's Security Gate Flow"

**Q: Why MCP tools in the Application layer?**
A: README.md section "Why MCP Tools in Application Layer?"

**Q: How do I know what model to use?**
A: QUICK-REFERENCE.md has a "Model Selection Quick Cheat"

---

## 📞 Support

These docs are designed to be **self-documenting**. If something isn't clear:

1. **Check QUICK-REFERENCE.md** first (fastest answers)
2. **Then check ARCHITECTURE-GUIDE.md** (technical context)
3. **Then check README.md** (comprehensive explanation)
4. **Review your `/versions/` decisions** (understand the "why")

---

**You're all set!** 🚀

Start with README.md. Everything else will make sense. Trust the crew.

---

**Made with ❤️ for autonomous enterprise teams**  
Sovereign Factory • May 2026 • Brady Georgen (@familiarcat)
