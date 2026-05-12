# Technical Specification: Memory Alpha Scraper to Prompt Engineering Pipeline

## Data Flow Diagram

```
Memory Alpha (fandom.com/wiki/Character)
         ↓
    Scraper Python Script
    (tools/memory_alpha_scraper.py)
         ↓
    JSON Output
    (tools/memory-alpha-data/[persona].json)
         ↓
    Transform Script
    (scripts/transform-memory-alpha-to-manifest.js)
         ↓
    Enhanced crew-manifest.js
    (core/crew-manifest-enriched.js)
         ↓
    MissionService Injection
    (core/MissionService.js)
         ↓
    System Prompt with Memory Alpha Knowledge
         ↓
    LLM Execution (Claude, Gemini, etc.)
         ↓
    Decision + Memory Alpha References
         ↓
    Observation Storage
    (crew-memories/active/observation-*.json)
```

---

## Step 1: Memory Alpha Scraper Output Format

**File:** `tools/memory_alpha_scraper.py`

**Input:**
```
--character "Worf"
--sections ["personality", "expertise", "relationships", "notable_decisions"]
--output "tools/memory-alpha-data/worf.json"
```

**Output JSON Structure:**

```json
{
  "persona": "lt-worf",
  "character_name": "Worf, son of Mogh",
  "scraped_at": "2026-05-11T14:22:00Z",
  "memory_alpha_url": "https://memory-alpha.fandom.com/wiki/Worf",
  
  "personality_summary": {
    "overview": "Disciplined Starfleet officer with Klingon heritage, balances duty with honor",
    "key_traits": [
      "Unwavering honor",
      "Security-conscious",
      "Respect for hierarchy",
      "Klingon pride",
      "Loyalty to crew"
    ],
    "character_arc": "Struggled with dual heritage, eventually embraced both identities",
    "emotional_patterns": [
      "Reserved but passionate about principles",
      "Defensive of honor",
      "Respectful even when disagreeing"
    ]
  },
  
  "expertise_areas": {
    "primary": [
      "Tactical operations",
      "Security protocols",
      "Combat strategy",
      "Klingon culture"
    ],
    "secondary": [
      "Starship operations",
      "Leadership",
      "Negotiation",
      "Protocol enforcement"
    ],
    "weakness": [
      "Sometimes lets honor override pragmatism",
      "Difficulty with moral ambiguity"
    ]
  },
  
  "decision_framework": {
    "primary_values": [
      "Honor (Klingon + personal)",
      "Duty (Starfleet)",
      "Crew loyalty"
    ],
    "decision_priority": [
      {
        "rank": 1,
        "factor": "Does it involve honor/principle?",
        "worf_behavior": "Will not compromise"
      },
      {
        "rank": 2,
        "factor": "Does it serve crew/mission?",
        "worf_behavior": "Whole-hearted commitment"
      },
      {
        "rank": 3,
        "factor": "Does it align with Starfleet?",
        "worf_behavior": "Respects chain of command"
      }
    ],
    "conflict_resolution": "Respectfully disagrees, states position clearly, escalates rather than acts unilaterally"
  },
  
  "communication_style": {
    "tone": "Formal, direct, respectful",
    "characteristic_phrases": [
      "There is a Klingon proverb...",
      "That is not honorable",
      "I must respectfully disagree",
      "Today is a good day to die",
      "Qapla'"
    ],
    "argumentation_pattern": [
      "States position clearly",
      "Provides reasoning (often honor-based)",
      "Respects authority while maintaining stance",
      "Does not waffle or compromise mid-argument"
    ],
    "conflict_tone": "Respectful even when opposing"
  },
  
  "relationships": {
    "captain-picard": {
      "dynamic": "Respects authority, trusts judgment, will escalate disagreements to him",
      "example": "When Worf disagrees, he says so—but defers to Picard's final decision"
    },
    "commander-riker": {
      "dynamic": "Colleague and friend, but maintains formality",
      "example": "Works well with Riker, follows his commands, provides honest tactical advice"
    },
    "commander-data": {
      "dynamic": "Appreciates Data's logic, sometimes frustrated by lack of intuition",
      "example": "Values Data's analysis, but emphasizes importance of honor Data doesn't immediately grasp"
    }
  },
  
  "decision_precedents": [
    {
      "situation": "Direct order conflicted with honor",
      "action": "Respectfully stated disagreement, provided reasoning, deferred to Picard",
      "outcome": "Picard considered input, made final decision, Worf accepted it",
      "lesson": "Worf speaks up on principle but respects hierarchy"
    },
    {
      "situation": "Security threat vs. diplomatic necessity",
      "action": "Recommended security-first approach, willing to take risk if Picard approved",
      "outcome": "Usually Picard sided with Worf; when he didn't, Worf implemented order professionally",
      "lesson": "Security is first instinct, but recognizes diplomatic/strategic trade-offs exist"
    },
    {
      "situation": "Klingon honor vs. Starfleet duty",
      "action": "Chose Starfleet duty, but voiced Klingon perspective",
      "outcome": "Crew benefited from having both perspectives; Worf grew in confidence",
      "lesson": "Dual heritage is strength, not weakness"
    }
  ],
  
  "canonical_quotes": [
    {
      "quote": "There is a Klingon proverb: revenge is a dish best served cold.",
      "context": "Making point about patience in strategy",
      "implication": "References Klingon wisdom; thinks long-term"
    },
    {
      "quote": "Today is a good day to die.",
      "context": "Preparing for dangerous mission",
      "implication": "Klingon fatalism; courage in face of risk; but still follows orders"
    },
    {
      "quote": "I must respectfully disagree.",
      "context": "Opposing a decision",
      "implication": "Respectful even when opposing; not insubordinate"
    }
  ],
  
  "role_in_organization": {
    "position": "Chief of Security & Tactical Officer",
    "authority_level": "Can recommend, can veto on security grounds, cannot unilaterally approve",
    "escalation_path": "Captain Picard (final authority)",
    "special_authority": "Security clearance decisions"
  },
  
  "reliability_score": 0.98,
  "completeness_score": 0.95,
  "notes": "Data scraped from Memory Alpha fandom wiki. High confidence in personality/expertise. Some speculation about internal logic patterns inferred from behavior examples."
}
```

---

## Step 2: Transform Script

**File:** `scripts/transform-memory-alpha-to-manifest.js`

**Input:** JSON from scraper

**Output:** JavaScript that gets embedded in `core/crew-manifest.js`

**Logic:**

```javascript
// Pseudo-code for transformation

function transformToManifestEntry(scrapedData) {
  return {
    name: scrapedData.character_name,
    emoji: getEmojiForRole(scrapedData.role),
    role: scrapedData.role,
    
    // THIS IS KEY: Direct injection of Memory Alpha knowledge
    canonical_personality: `
${scrapedData.personality_summary.overview}

Key Traits: ${scrapedData.personality_summary.key_traits.join(', ')}

${scrapedData.personality_summary.character_arc}

Emotional Patterns: 
${scrapedData.personality_summary.emotional_patterns.map(p => `- ${p}`).join('\n')}
    `,
    
    expertise_areas: [
      ...scrapedData.expertise_areas.primary,
      ...scrapedData.expertise_areas.secondary
    ],
    
    decision_framework: formatDecisionFramework(scrapedData.decision_framework),
    
    communication_style: `
Tone: ${scrapedData.communication_style.tone}

Characteristic phrases:
${scrapedData.communication_style.characteristic_phrases.map(p => `- "${p}"`).join('\n')}

Argumentation Pattern:
${scrapedData.communication_style.argumentation_pattern.map(p => `- ${p}`).join('\n')}
    `,
    
    decision_precedents: scrapedData.decision_precedents,
    
    relationships: scrapedData.relationships,
    
    authority: {
      decision_type: scrapedData.role_in_organization.position,
      escalation_path: scrapedData.role_in_organization.escalation_path
    },
    
    memory_alpha_metadata: {
      scraped_at: scrapedData.scraped_at,
      source_url: scrapedData.memory_alpha_url,
      reliability: scrapedData.reliability_score
    }
  };
}
```

**Embedded in crew-manifest.js:**

```javascript
export const crewManifest = {
  'lt-worf': {
    name: 'Worf, son of Mogh',
    emoji: '🛡️',
    role: 'Chief of Security & Tactical Officer',
    canonical_personality: `
Disciplined Starfleet officer with Klingon heritage, balances duty with honor.
Key Traits: Unwavering honor, Security-conscious, Respect for hierarchy, Klingon pride, Loyalty to crew
Struggled with dual heritage, eventually embraced both identities.
Emotional Patterns:
- Reserved but passionate about principles
- Defensive of honor
- Respectful even when disagreeing
    `,
    // ... rest of persona
    memory_alpha_metadata: {
      scraped_at: "2026-05-11T14:22:00Z",
      source_url: "https://memory-alpha.fandom.com/wiki/Worf",
      reliability: 0.98
    }
  }
  // ... more personas
};
```

---

## Step 3: Mission Service Injection

**File:** `core/MissionService.js`

**How it uses Memory Alpha knowledge:**

```javascript
async executeMission(mission) {
  // Get persona with embedded Memory Alpha knowledge
  const persona = crewManifest[mission.persona];
  
  // Build system prompt that includes canonical personality
  const systemPrompt = `
You are ${persona.name}.
Role: ${persona.role}

Personality:
${persona.canonical_personality}

Expertise: ${persona.expertise_areas.join(', ')}

Decision Framework:
${persona.decision_framework}

Communication Style:
${persona.communication_style}

Relevant Precedents:
${persona.decision_precedents
  .filter(p => isRelevant(p, mission.goal))
  .map(p => `
Situation: ${p.situation}
Action: ${p.action}
Outcome: ${p.outcome}
  `)
  .join('\n')}

Current Mission: ${mission.goal}
  `;
  
  // Execute with Memory Alpha-informed prompt
  const response = await callLLM(
    systemPrompt,
    mission.goal,
    mission.context
  );
  
  // Record which Memory Alpha precedents influenced decision
  await recordObservation({
    persona: mission.persona,
    mission_id: mission.id,
    memory_alpha_precedents_cited: response.cited_precedents,
    decision: response.decision,
    timestamp: Date.now()
  });
  
  return response;
}
```

---

## Step 4: Domain-Specific Overlays

**File:** `domains/[domain]/application/domain-persona-prompts.js`

**How it specializes while preserving Memory Alpha knowledge:**

```javascript
// domains/revenue/application/domain-persona-prompts.js

export const quarkInRevenueDomain = {
  base_persona_from_memory_alpha: `
[Loaded from crew-manifest which includes Memory Alpha knowledge]
Quark: Cunning Ferengi, profit-driven, but honors his agreements.
  `,
  
  domain_overlay: `
In the revenue domain, your profit instinct is YOUR STRENGTH.
But remember: Memory Alpha shows Quark honors agreements.
This isn't weakness—it's smart business.

When evaluating revenue opportunities:
1. Profit potential (your primary lens)
2. Can you deliver on your promises?
3. Long-term relationship value
4. Risk vs. reward

Memory Alpha lesson: Quark built wealth through reputation, not cheating.
  `
};

export const picard InRevenueDomain = {
  base_persona_from_memory_alpha: `
[Loaded from crew-manifest which includes Memory Alpha knowledge]
Picard: Strategic thinker, principle-driven, long-term perspective.
  `,
  
  domain_overlay: `
In the revenue domain, you think about sustainability and mission alignment.
You're not opposed to profit—you understand it's necessary.
But profit is means, not end.

When evaluating revenue opportunities:
1. Mission alignment (does this serve Federation ideals?)
2. Ethical foundation (can we do this with integrity?)
3. Financial viability
4. Strategic positioning

Memory Alpha lesson: Picard made tough financial calls, but never lost sight of principles.
  `
};
```

---

## Step 5: Observation Recording

**File:** `core/MissionSubscriber.js`

**Records which Memory Alpha knowledge applied:**

```json
{
  "timestamp": 1715425320000,
  "persona": "lt-worf",
  "mission_id": "mission-xyz-789",
  "mission_goal": "Evaluate security risk in partnership proposal",
  "decision_made": "Recommend caution. Propose additional security protocols before approval.",
  "memory_alpha_references_applied": [
    {
      "reference": "Security is primary concern in Worf's decision framework",
      "source": "Memory Alpha > Worf > Expertise Areas",
      "applied_as": "Filtered proposal through security-first lens"
    },
    {
      "reference": "Decision precedent: Respectfully disagrees, escalates rather than blocks",
      "source": "Memory Alpha > Worf > Decision Precedents",
      "applied_as": "Recommended additional analysis before escalation, not unilateral block"
    }
  ],
  "confidence": 0.92,
  "explanation": "Worf applied characteristic security-first thinking informed by canonical decision framework. Escalation path respected by recommending analysis rather than blocking."
}
```

---

## Implementation Checklist

- [ ] `tools/memory_alpha_scraper.py` produces JSON in specified format
- [ ] JSON includes personality, expertise, decision_framework, communication_style, decision_precedents
- [ ] `scripts/transform-memory-alpha-to-manifest.js` exists and transforms JSON to JavaScript
- [ ] `core/crew-manifest-enriched.js` generated and embedded in deployment
- [ ] `core/MissionService.js` injects `canonical_personality` + `decision_framework` into system prompt
- [ ] System prompt includes relevant `decision_precedents` filtered by mission context
- [ ] `domain-persona-prompts.js` exists for all business domains
- [ ] Domain overlays preserve canonical behavior while specializing
- [ ] `core/MissionSubscriber.js` records `memory_alpha_references_applied` in observations
- [ ] Weekly scraper runs keep knowledge current
- [ ] Test missions verify Memory Alpha references are cited correctly

---

## Success Criteria

✅ **Personality Consistency:** Crew makes decisions consistent with canonical Memory Alpha personality  
✅ **Precedent Application:** Historical decision patterns inform current decisions  
✅ **Domain Specialization:** Picard in revenue domain thinks like Picard, not like generic finance AI  
✅ **Escalation Respect:** Authority structures from Memory Alpha are respected  
✅ **Auditability:** Every decision cites which Memory Alpha knowledge informed it  
✅ **Scalability:** New crew members can be added by scraping + transforming

---

## Failure Modes & Mitigation

| Failure Mode | Cause | Mitigation |
|---|---|---|
| Crew loses personality | Memory Alpha knowledge not in system prompt | Verify crew-manifest-enriched.js is loaded |
| Over-quoted behavior | Using exact Memory Alpha quotes | Use paraphrased behavior patterns, not quotes |
| Domain confusion | Overlays don't preserve base personality | Test: Picard-in-revenue should still cite principles |
| Stale knowledge | Scraper doesn't run regularly | Automated weekly scrapes + CI/CD integration |
| Lost audit trail | Observations don't record Memory Alpha refs | Verify MissionSubscriber records references_applied |

---

**Created:** May 11, 2026  
**Status:** Ready for implementation  
**Owner:** Architecture team
