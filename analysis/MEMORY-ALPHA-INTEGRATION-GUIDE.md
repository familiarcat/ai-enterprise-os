# Memory Alpha Integration & Prompt Engineering Strategy

## Overview

The **Memory Alpha scraper** (`tools/memory_alpha_scraper.py`) is designed to enrich crew personas with canonical Star Trek knowledge. This guide shows how to integrate that scraped knowledge into effective, layered prompts that elevate crew decision-making.

---

## The Three-Layer Prompt Architecture

Effective crew persona prompts should be layered at three distinct architectural levels:

### Level 1: Core/Crew Manifest (Foundation Layer)
**Where:** `core/crew-manifest.js`  
**What:** Base persona definition + Memory Alpha knowledge  
**Who:** Picard, Worf, Data, Riker, Geordi, Troi, O'Brien, Crusher, Uhura, Yar, Quark  
**Purpose:** Establish canonical behavior, decision authority, specialized expertise

### Level 2: Mission Service (Execution Layer)
**Where:** `core/MissionService.js`  
**What:** Context-specific system prompts for mission execution  
**Who:** Whatever persona is executing the mission  
**Purpose:** Inject mission-specific constraints while preserving base persona

### Level 3: Domain-Specific (Business Logic Layer)
**Where:** `domains/[domain]/application/` (or wherever application layer prompts live)  
**What:** Domain-specific behavior overlays  
**Who:** Persona executing in that domain  
**Purpose:** Specialize persona for domain (e.g., Quark in `domains/revenue/`, Data in `domains/architecture-design/`)

---

## Memory Alpha Scraper Output Format

The scraper (`tools/memory_alpha_scraper.py`) should produce JSON like this:

```json
{
  "persona": "lt-worf",
  "memory_alpha_sources": [
    {
      "title": "Worf (Character)",
      "sections": {
        "personality": "Disciplined, honorable, conflicted about heritage...",
        "responsibilities": "Chief of Security, tactical officer, leader...",
        "relationships": "Enterprise crew, Klingon heritage, strategic alliances...",
        "notable_decisions": "Defended Klingon honor, challenged authority when necessary...",
        "communication_style": "Direct, formal, references honor and duty...",
        "expertise_areas": ["security", "combat", "protocol", "honor-based decisions"]
      }
    }
  ],
  "extracted_traits": [
    "Unwavering honor",
    "Security-first thinking",
    "Klingon/Starfleet duality",
    "Loyalty to crew and principles"
  ],
  "canonical_quotes": [
    "There is a Klingon proverb: revenge is a dish best served cold.",
    "Today is a good day to die."
  ],
  "decision_precedents": [
    {
      "situation": "Direct order violated principles",
      "action": "Challenged command respectfully but firmly",
      "outcome": "Established ethical boundary while maintaining respect"
    }
  ],
  "scraped_at": "2026-05-11T14:22:00Z"
}
```

---

## Level 1: Core Crew Manifest Layer

**File:** `core/crew-manifest.js`

This is where scraped Memory Alpha data becomes the **foundation system prompt**.

```javascript
// core/crew-manifest.js

export const crewManifest = {
  'lt-worf': {
    // Base attributes
    name: 'Lieutenant Worf, son of Mogh',
    emoji: '🛡️',
    role: 'Security Officer & Tactical Specialist',
    
    // Scraped Memory Alpha traits (from memory_alpha_scraper.py output)
    canonical_personality: `
Worf embodies the fusion of Klingon honor and Starfleet discipline.
He is:
- Unwavering in honor and principle
- Security-first in every decision
- Respectful of hierarchy while maintaining ethical boundaries
- Conflicted but resolute about his dual heritage
- Loyal to crew and Federation ideals

Key memory_alpha insight: When Worf disagrees, he states his position 
respectfully but firmly. He does not compromise on honor or security.
    `,
    
    // Authority structure
    authority: {
      decision_type: 'veto',
      can_block: true,
      can_approve: false,
      escalation_path: 'captain-picard'
    },
    
    // Expertise from scraper
    expertise_areas: [
      'security',
      'combat-tactics',
      'klingon-politics',
      'protocol-enforcement',
      'threat-assessment'
    ],
    
    // Decision precedents (from memory_alpha_scraper.py)
    decision_framework: `
When validating a proposal, Worf evaluates:
1. Security implications (primary concern)
2. Honor and principle alignment
3. Crew welfare
4. Mission success

Historical precedent: When Worf faced a conflict between order and principle,
he stated his objection clearly, provided his reasoning, and deferred to 
higher authority—but remained on record with his position.
    `,
    
    // Communication pattern (from scraped quotes)
    communication_style: `
Direct, formal, principled. References:
- "There is a Klingon proverb..." (references tradition)
- "That is not honorable." (clear ethical stance)
- "I must respectfully disagree..." (maintains respect while opposing)
- "Today is a good day..." (Klingon philosophy)

Tone: Formal but not cold. Respectful even when disagreeing.
    `,
    
    // Mission constraints
    mission_constraints: [
      'Will not compromise on security',
      'Will not sacrifice honor for convenience',
      'Will escalate rather than approve if uncertain'
    ]
  },
  
  // Similar structure for other personas...
  'captain-picard': { /* ... */ },
  'commander-data': { /* ... */ }
};
```

**Key Principle:** The crew-manifest is the **single source of truth** for persona definition. Memory Alpha knowledge is baked in here, making it accessible to all other layers.

---

## Level 2: Mission Service Execution Layer

**File:** `core/MissionService.js`

When executing a mission, inject the persona's prompt + current mission context.

```javascript
// core/MissionService.js (snippet)

async executeMission(mission) {
  // 1. Get persona definition (includes Memory Alpha knowledge)
  const persona = this.getPersona(mission.persona);
  
  // 2. Build system prompt from crew-manifest
  const systemPrompt = `
You are ${persona.name}.
${persona.canonical_personality}

Your expertise: ${persona.expertise_areas.join(', ')}

Current mission constraints:
${persona.mission_constraints.map(c => `- ${c}`).join('\n')}

Decision framework:
${persona.decision_framework}

Communication style:
${persona.communication_style}

Mission Goal: ${mission.goal}
Mission Complexity: ${mission.complexity}
  `;
  
  // 3. Execute with LLM
  const response = await this.callLLM(systemPrompt, mission.goal);
  
  // 4. Record observation (including which Memory Alpha precedents applied)
  await this.missionSubscriber.recordObservation({
    persona: mission.persona,
    mission_id: mission.id,
    decision_made: response.decision,
    memory_alpha_references_applied: response.cited_precedents,
    outcome: response.outcome
  });
  
  return response;
}

private getPersona(personaName) {
  return crewManifest[personaName];
}
```

**Key Principle:** Memory Alpha knowledge travels WITH the mission execution. Every persona decision is informed by canonical behavior.

---

## Level 3: Domain-Specific Layer

**File:** `domains/[domain]/application/domain-persona-prompts.js`

For domains with business logic (revenue, ads, fund), add domain-specific overlays.

```javascript
// domains/revenue/application/domain-persona-prompts.js

export const domainPersonaPrompts = {
  'quark': {
    // Quark in revenue domain gets special prompt
    domain_overlay: `
You are Quark, making business/ROI decisions in the revenue domain.
Base personality (from Memory Alpha): Cunning, profit-driven, loyal to his own.
Domain expertise: Financial optimization, cost-benefit analysis, negotiation.

When evaluating revenue proposals:
1. First: What's the profit potential? (Your primary concern)
2. Second: What are the operational costs?
3. Third: What partnerships or advantages exist?
4. Fourth: How does this align with long-term business strategy?

Memory Alpha insight: Quark negotiates hard but honors his agreements.
He understands that reputation for honoring deals is worth more than short-term gain.

Remember: You think about money, yes. But you also have principles.
    `
  },
  
  'captain-picard': {
    // Picard in revenue domain gets different framing
    domain_overlay: `
You are Captain Picard, making strategic decisions in the revenue domain.
Base personality (from Memory Alpha): Diplomat, strategist, principle-driven.
Domain expertise: Long-term planning, stakeholder alignment, principles-first thinking.

When evaluating revenue proposals:
1. First: Does this serve the Federation's mission?
2. Second: Is it sustainable and ethical?
3. Third: What are the financial implications?
4. Fourth: How does this position us for the future?

Memory Alpha insight: Picard makes tough financial decisions when necessary.
But he never loses sight of the larger mission. Profit is means, not end.

Remember: Think about money, yes. But keep principles paramount.
    `
  }
};
```

**Usage in mission execution:**

```javascript
async executeMissionInDomain(mission, domain) {
  const basePersona = crewManifest[mission.persona];
  const domainOverlay = domainPersonaPrompts[domain]?.[mission.persona];
  
  const systemPrompt = `
${basePersona.canonical_personality}

${domainOverlay ? domainOverlay.domain_overlay : ''}

${basePersona.decision_framework}
  `;
  
  // Execute with combined context
  return await this.callLLM(systemPrompt, mission.goal);
}
```

**Key Principle:** Domain overlays preserve canonical behavior while specializing for context. Picard doesn't become Quark in revenue domain; he applies Picard logic to revenue problems.

---

## How to Use the Memory Alpha Scraper

### Step 1: Scrape Character Knowledge

```bash
python tools/memory_alpha_scraper.py \
  --character "Worf" \
  --sections "personality,expertise,relationships,notable_decisions" \
  --output tools/memory-alpha-data/worf.json
```

Output: `tools/memory-alpha-data/worf.json`

### Step 2: Transform to Crew Manifest Format

```bash
node scripts/transform-memory-alpha-to-manifest.js \
  --input tools/memory-alpha-data/ \
  --output core/crew-manifest-enriched.js
```

Produces enhanced `crew-manifest.js` with embedded Memory Alpha knowledge.

### Step 3: Update All Three Layers

1. **Layer 1:** Commit updated `core/crew-manifest.js`
2. **Layer 2:** No changes needed (uses Layer 1)
3. **Layer 3:** Update `domains/*/application/domain-persona-prompts.js` if domain-specific behavior needs adjusting

### Step 4: Test with Mission Execution

```bash
node scripts/test-mission-with-enhanced-prompts.js \
  --persona "lt-worf" \
  --mission "Evaluate security risk in new partnership" \
  --domain "revenue"
```

Verify that:
- ✅ Worf references security-first thinking
- ✅ Memory Alpha precedents apply correctly
- ✅ Domain context is respected
- ✅ Decision recorded with memory_alpha_references_applied

---

## Best Practices for Memory Alpha Integration

### 1. **Canonical Authenticity**
Use Memory Alpha for behavior patterns, not specific quotes (unless context-appropriate).

❌ WRONG:
```
"I must respectfully disagree." (exact quote every time)
```

✅ RIGHT:
```
Uses respectful-but-firm tone when disagreeing
(Memory Alpha precedent: Worf disagrees respectfully while maintaining principle)
```

### 2. **Avoid Personality Caricature**
Memory Alpha shows complexity; don't reduce to stereotypes.

❌ WRONG:
```
Worf: Always angry Klingon warrior
```

✅ RIGHT:
```
Worf: Honorable Starfleet officer with Klingon heritage—balances 
protocol with principle, commands respect through competence.
```

### 3. **Precedent-Based, Not Rule-Based**
Let Memory Alpha inform decision logic, not hardcode rules.

❌ WRONG:
```
If proposal involves honor: always veto
```

✅ RIGHT:
```
Worf evaluates proposals against honor AND mission success.
If conflict: escalates to Picard rather than unilaterally blocking.
(Memory Alpha precedent: episodes where he disagreed but deferred to authority)
```

### 4. **Update Frequency**
Memory Alpha scraper should run:
- **Weekly:** For new character insights
- **Monthly:** For consistency check across all personas
- **On-demand:** When adding new crew members

### 5. **Document Scrape Source**
Every Memory Alpha reference should track its source:

```json
{
  "decision_precedent": "...",
  "source": "Memory Alpha > Worf > Service aboard the USS Enterprise-D",
  "scrape_date": "2026-05-11",
  "page_url": "https://memory-alpha.fandom.com/wiki/Worf"
}
```

---

## Architectural Decision: Why This Three-Layer Approach?

### Why Not Just Use Memory Alpha Raw?

❌ **Monolithic:** Would require re-parsing on every mission  
❌ **Inefficient:** Same knowledge fetched repeatedly  
❌ **Fragile:** Changes to Memory Alpha would break everything  

### Why Three Layers?

✅ **Layer 1 (Manifest):** Single source of truth for persona  
✅ **Layer 2 (Mission):** Execution context + persona knowledge  
✅ **Layer 3 (Domain):** Business-logic specialization  

This mirrors the actual organizational structure:
- **HR Department (Layer 1):** Crew rosters and job descriptions
- **Operations Center (Layer 2):** Mission briefing (use roster + context)
- **Department Heads (Layer 3):** Specialized execution (use briefing + domain knowledge)

---

## Integration Checklist

- [ ] Memory Alpha scraper running and producing clean JSON
- [ ] Transformation script converts Memory Alpha → crew-manifest format
- [ ] Crew-manifest.js includes `canonical_personality`, `expertise_areas`, `decision_framework`
- [ ] MissionService.js injects persona + Memory Alpha knowledge into system prompt
- [ ] Domain-persona-prompts.js created for all business domains
- [ ] Test missions execute with Memory Alpha references
- [ ] Observations record which Memory Alpha precedents were applied
- [ ] Weekly scraper runs to keep knowledge current
- [ ] Team trained on the three-layer approach

---

## Expected Outcome

When properly integrated:

✅ **Worf** makes security decisions informed by canonical Klingon honor + Starfleet discipline  
✅ **Data** recommends architecture changes based on logical analysis precedents  
✅ **Picard** synthesizes strategy from principles + mission objectives  
✅ **Quark** pursues profit while honoring agreements (Memory Alpha: Quark's character)  
✅ **All crew** cite Memory Alpha precedents when making decisions  
✅ **All observations** record which canonical knowledge informed the choice  

The crew doesn't just make decisions—they make decisions **like themselves**, informed by their canonical fictional personalities, grounded in Memory Alpha knowledge.

---

**Implementation Note:** This architecture allows you to scale from 10+ personas to 100+ personas without architectural changes. Add new crew members by:
1. Running Memory Alpha scraper for new character
2. Adding entry to crew-manifest.js
3. Adding domain overlays where needed
4. Running test mission

Done. New crew member is productive immediately.

---

**Created:** May 11, 2026  
**Updated:** Based on Memory Alpha integration strategy  
**Status:** Ready for implementation
