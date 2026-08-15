import type { LucideIcon } from "lucide-react";
import { Library, Radio, ScrollText } from "lucide-react";
import type {
  ActiveTab,
  CommitteeFramework,
  InterventionStatus,
  InterventionType,
  PoiCategory,
  SkillLevel,
} from "@/convex/shared";

// ---------------------------------------------------------------------------
// Committee frameworks
// ---------------------------------------------------------------------------

export const COMMITTEES: Record<
  CommitteeFramework,
  {
    label: string;
    short: string;
    body: string;
    tagline: string;
    committees: string[];
    floorNote: string;
  }
> = {
  un: {
    label: "United Nations (UN Committees)",
    short: "UN",
    body: "United Nations General Assembly",
    tagline: "Permanent missions, diplomatic protocol, and bloc politics.",
    committees: ["UNSC", "UNGA DISEC", "UNHRC", "ECOSOC", "UNEP"],
    floorNote:
      "General debate is in session. The chair recognizes delegates in speaker's list order.",
  },
  loksabha: {
    label: "Lok Sabha (Indian Parliament)",
    short: "Lok Sabha",
    body: "Lok Sabha, Parliament of India",
    tagline:
      "Question Hour, walkouts, and partisan fire — governed by the Rules of Procedure.",
    committees: ["Lok Sabha", "Rajya Sabha", "CABINET", "JOINT SESSION"],
    floorNote:
      "Question Hour is underway. The Speaker enforces the five-minute rule with a bell.",
  },
  aippm: {
    label: "AIPPM",
    short: "AIPPM",
    body: "All India Political Parties Meet",
    tagline: "Coalition arithmetic, principled dissent, and national interest.",
    committees: ["AIPPM", "CABINET", "JOINT SESSION"],
    floorNote:
      "The All India Political Parties Meet is in session. Consensus is the currency of this house.",
  },
};

// ---------------------------------------------------------------------------
// Skill levels
// ---------------------------------------------------------------------------

export const SKILLS: Record<
  SkillLevel,
  { label: string; tagline: string; targetWords: number; targetSeconds: number }
> = {
  beginner: {
    label: "Beginner",
    tagline: "Structure, confidence, and the fundamentals of decorum.",
    targetWords: 140,
    targetSeconds: 90,
  },
  veteran: {
    label: "Veteran",
    tagline: "Advanced rhetoric, rapid rebuttal, and tactical drafting.",
    targetWords: 420,
    targetSeconds: 240,
  },
};

// ---------------------------------------------------------------------------
// Sidebar tabs
// ---------------------------------------------------------------------------

export const TABS: {
  id: ActiveTab;
  label: string;
  blurb: string;
  icon: LucideIcon;
}[] = [
  {
    id: "interventions",
    label: "Live Floor Interventions",
    blurb: "The floor as it happens — speeches, replies, and motions.",
    icon: Radio,
  },
  {
    id: "poiVault",
    label: "POI & Cross-Examination Vault",
    blurb: "Points of information and cross-exam ammunition, filed by tone.",
    icon: Library,
  },
  {
    id: "resolutions",
    label: "Resolution Draftsman",
    blurb: "Draft, revise, and submit resolutions with clause banks.",
    icon: ScrollText,
  },
];

// ---------------------------------------------------------------------------
// Floor feed (curated per committee)
// ---------------------------------------------------------------------------

export type FloorSeed = {
  id: string;
  speaker: string;
  delegation: string;
  type: InterventionType;
  status: InterventionStatus;
  body: string;
  durationSeconds: number;
  source: "floor";
};

export const FLOOR_FEED: Record<CommitteeFramework, FloorSeed[]> = {
  un: [
    {
      id: "un-live-1",
      speaker: "Amb. Zhou Lin",
      delegation: "People's Republic of China",
      type: "Formal Speech",
      status: "live",
      body: "China reaffirms that development is the master key to all problems. The Global Development Initiative has earned the support of more than one hundred nations, and this committee should build upon it rather than reinvent the wheel.",
      durationSeconds: 300,
      source: "floor",
    },
    {
      id: "un-up-1",
      speaker: "Amb. Ruchira Kamboj",
      delegation: "Republic of India",
      type: "Right of Reply",
      status: "upcoming",
      body: "The distinguished delegate has mischaracterised our position on reform of the Security Council. India seeks not privilege but representation — a permanent voice for a sixth of humanity.",
      durationSeconds: 180,
      source: "floor",
    },
    {
      id: "un-del-1",
      speaker: "Amb. Nicolas de Rivière",
      delegation: "Republic of France",
      type: "Formal Speech",
      status: "delivered",
      body: "France believes the Security Council must be both more representative and more effective. It is time to enlarge the Council — including permanent seats for Africa.",
      durationSeconds: 300,
      source: "floor",
    },
    {
      id: "un-del-2",
      speaker: "Amb. Martin Kimani",
      delegation: "Republic of Kenya",
      type: "Formal Speech",
      status: "delivered",
      body: "The climate crisis is a security crisis, and Africa is its first casualty. We ask this body to match its rhetoric with financing that actually arrives.",
      durationSeconds: 240,
      source: "floor",
    },
  ],
  loksabha: [
    {
      id: "ls-live-1",
      speaker: "Shri Nirmala Sitharaman",
      delegation: "Minister of Finance (BJP)",
      type: "Formal Speech",
      status: "live",
      body: "The Union Budget is a statement of intent: capital for infrastructure, certainty for investors, and dignity for the poor. The Opposition's arithmetic is creative; the accounts are settled.",
      durationSeconds: 420,
      source: "floor",
    },
    {
      id: "ls-up-1",
      speaker: "Shri Rahul Gandhi",
      delegation: "Leader of the Opposition (INC)",
      type: "Right of Reply",
      status: "upcoming",
      body: "The Minister calls it intent; the farmer calls it delay. We demand a statutory MSP and an answer to the unemployment figures the Government has stopped publishing.",
      durationSeconds: 300,
      source: "floor",
    },
    {
      id: "ls-del-1",
      speaker: "Shri Amit Shah",
      delegation: "Minister of Home Affairs (BJP)",
      type: "Formal Speech",
      status: "delivered",
      body: "Three new criminal codes replace the colonial Penal Code. This is not a change of names; it is a change of philosophy — justice over punishment.",
      durationSeconds: 480,
      source: "floor",
    },
    {
      id: "ls-del-2",
      speaker: "Km. Priyanka Chaturvedi",
      delegation: "Member of Parliament (Shiv Sena UBT)",
      type: "Explanation of Vote",
      status: "delivered",
      body: "We abstain because the Bill, while progressive, ignores the concerns of coastal states. A good law should not need to be rescued by amendments.",
      durationSeconds: 180,
      source: "floor",
    },
  ],
  aippm: [
    {
      id: "aippm-live-1",
      speaker: "Shri Jairam Ramesh",
      delegation: "AICC Spokesperson (INC)",
      type: "Formal Speech",
      status: "live",
      body: "The Congress believes the Opposition must fight the Government on policy, not on personality. Inflation, unemployment, and inequality are the issues this meet must confront.",
      durationSeconds: 360,
      source: "floor",
    },
    {
      id: "aippm-up-1",
      speaker: "Shri Sushmita Dev",
      delegation: "National Spokesperson (TMC)",
      type: "Cross-Examination Answer",
      status: "upcoming",
      body: "The TMC's federalism is not a slogan. When West Bengal's dues were withheld, we fought in the courts — and we will fight again, for every state.",
      durationSeconds: 300,
      source: "floor",
    },
    {
      id: "aippm-del-1",
      speaker: "Shri Gaurav Bhatia",
      delegation: "National Spokesperson (BJP)",
      type: "Formal Speech",
      status: "delivered",
      body: "India's decade of development speaks for itself: twenty-five crore out of poverty, digital highways for all, and a voice the world now listens to.",
      durationSeconds: 360,
      source: "floor",
    },
    {
      id: "aippm-del-2",
      speaker: "Shri D. Raja",
      delegation: "National Spokesperson (CPI(M))",
      type: "Formal Speech",
      status: "delivered",
      body: "We come to this meet to defend the Constitution and the federal structure. The Government's centralisation is the greatest threat to Indian democracy today.",
      durationSeconds: 300,
      source: "floor",
    },
  ],
};

// ---------------------------------------------------------------------------
// POI & cross-examination library, keyed by committee:skill
// ---------------------------------------------------------------------------

export type VaultEntry = {
  id: string;
  category: PoiCategory;
  tone: string;
  question: string;
  response: string;
  tags: string[];
  source: "curated";
};

export const TONE_OPTIONS = [
  "Sharp",
  "Measured",
  "Forensic",
  "Disarming",
  "Cordial",
] as const;

export const CATEGORY_LABELS: Record<PoiCategory, string> = {
  poi: "POI",
  cross_exam: "Cross-Examination",
};

export const POI_LIBRARY: Record<string, VaultEntry[]> = {
  "un:beginner": [
    {
      id: "un-b1",
      category: "poi",
      tone: "Measured",
      question:
        "Does the delegate of France believe voluntary pledges can replace binding emissions targets, given that global temperatures continue to rise?",
      response:
        "We thank the distinguished delegate for the question. Voluntary pledges are a complement, not a substitute — but this committee has watched consensus collapse when targets are imposed without financing. France remains open to a phased, reviewable framework.",
      tags: ["climate", "finance", "consensus"],
      source: "curated",
    },
    {
      id: "un-b2",
      category: "poi",
      tone: "Sharp",
      question:
        "Will the delegate concede that the Security Council's deadlock on humanitarian corridors has cost more civilian lives than the conflict itself?",
      response:
        "The Council's record is imperfect — that is precisely why we urge this committee to act where the Council cannot.",
      tags: ["humanitarian", "security"],
      source: "curated",
    },
    {
      id: "un-b3",
      category: "cross_exam",
      tone: "Forensic",
      question:
        "When the delegate calls for 'regulated migration', what exactly is the enforcement mechanism, and who pays for it?",
      response:
        "A standing tripartite mechanism under UNHCR and IOM, funded by assessed contributions — the full framework is in our working paper.",
      tags: ["migration", "enforcement"],
      source: "curated",
    },
    {
      id: "un-b4",
      category: "poi",
      tone: "Disarming",
      question:
        "If the delegate's own country's emissions grew last year, how does the delegate square its rhetoric with its record?",
      response:
        "We acknowledge the gap and welcome the scrutiny — the national trajectory is bending, and this draft accelerates it.",
      tags: ["climate", "record"],
      source: "curated",
    },
  ],
  "un:veteran": [
    {
      id: "un-v1",
      category: "poi",
      tone: "Sharp",
      question:
        "Does the delegation maintain that Article 2(7) shields its actions, when the Responsibility to Protect has been invoked by this very body in identical circumstances?",
      response:
        "Sovereignty is not a shield; it is a responsibility. The distinction the delegate draws is legal, not moral — and we would gladly litigate it in committee.",
      tags: ["sovereignty", "r2p", "charter"],
      source: "curated",
    },
    {
      id: "un-v2",
      category: "cross_exam",
      tone: "Forensic",
      question:
        "Name the three operative clauses of your draft that survive a plain reading of the Charter, and reconcile the fourth with Article 51.",
      response:
        "Clauses 2, 5, and 7 are Charter-compliant; clause 4 invokes Article 51's inherent right, which the delegate knows is neither a blank cheque nor a dead letter.",
      tags: ["charter", "article-51", "drafting"],
      source: "curated",
    },
    {
      id: "un-v3",
      category: "poi",
      tone: "Disarming",
      question:
        "If the P5 cannot agree on a working definition of terrorism, why should this committee adopt the delegate's?",
      response:
        "Because definitions are negotiated — and this draft is a negotiation, not a decree.",
      tags: ["terrorism", "p5"],
      source: "curated",
    },
    {
      id: "un-v4",
      category: "poi",
      tone: "Measured",
      question:
        "Would the delegate accept a review clause that subjects its own proposed mechanism to a sunset after three years?",
      response:
        "We proposed that clause ourselves, and we will fight to keep it.",
      tags: ["sunset", "mechanism"],
      source: "curated",
    },
  ],
  "loksabha:beginner": [
    {
      id: "ls-b1",
      category: "poi",
      tone: "Measured",
      question:
        "Does the Honourable Minister concede that the budget's allocation to health remains below the level promised in the last session?",
      response:
        "The Honourable Member's figures come from the revised estimates; the actual allocation rises in real terms — the difference is accounting, not intent.",
      tags: ["budget", "health"],
      source: "curated",
    },
    {
      id: "ls-b2",
      category: "poi",
      tone: "Sharp",
      question:
        "If the Government is serious about farmers' incomes, why is the MSP announcement still pending?",
      response:
        "The announcement is a formality the House will see this session — the policy is settled; the arithmetic is being finalised.",
      tags: ["msp", "farmers"],
      source: "curated",
    },
    {
      id: "ls-b3",
      category: "cross_exam",
      tone: "Forensic",
      question:
        "Which provision of the new criminal code replaces the concept of sedition, and how does the Member defend its retention in spirit?",
      response:
        "Section 152 criminalises acts that endanger sovereignty — the Honourable Member confuses criticism with incitement, deliberately or not.",
      tags: ["criminal-code", "sedition"],
      source: "curated",
    },
    {
      id: "ls-b4",
      category: "poi",
      tone: "Cordial",
      question:
        "Will the Minister agree that the opposition's amendments on education funding deserve a vote?",
      response:
        "All amendments deserve consideration, and the Minister will gladly take this one on merits, clause by clause.",
      tags: ["education", "amendments"],
      source: "curated",
    },
  ],
  "loksabha:veteran": [
    {
      id: "ls-v1",
      category: "cross_exam",
      tone: "Forensic",
      question:
        "The Member cited Article 142. Which judgment did the Member rely on, and does the Member accept that it was later diluted by a larger Bench?",
      response:
        "The Member's Bench-watching is excellent. The dilution applied to the remedy, not the principle — the principle stands, and so does the motion.",
      tags: ["article-142", "judiciary"],
      source: "curated",
    },
    {
      id: "ls-v2",
      category: "poi",
      tone: "Sharp",
      question:
        "If the House is sovereign, why is the Ministry's reply to my starred question still classified after six months?",
      response:
        "Classification is governed by statute, not convenience. The Member knows the process and is welcome to move a privilege motion.",
      tags: ["starred-question", "privilege"],
      source: "curated",
    },
    {
      id: "ls-v3",
      category: "poi",
      tone: "Disarming",
      question:
        "The Minister called the opposition's walkout theatrical. Does the Minister accept that it was also constitutional?",
      response:
        "The walkout was constitutional and the speech was theatrical — both are true, and the House is richer for both.",
      tags: ["walkout", "procedure"],
      source: "curated",
    },
    {
      id: "ls-v4",
      category: "poi",
      tone: "Measured",
      question:
        "Would the Government accept an independent audit of the welfare scheme's delivery before the next phase?",
      response:
        "We would welcome it — provided the audit's terms are agreed by consensus and its findings bind all parties, including the Member's.",
      tags: ["welfare", "audit"],
      source: "curated",
    },
  ],
  "aippm:beginner": [
    {
      id: "ap-b1",
      category: "poi",
      tone: "Measured",
      question:
        "Will the party commit to a single national candidate in the seat where the alliance split last election?",
      response:
        "Seat-sharing is decided by the alliance partners through mutual agreement, and the party will honour the consensus of the coalition.",
      tags: ["coalition", "seat-sharing"],
      source: "curated",
    },
    {
      id: "ap-b2",
      category: "poi",
      tone: "Sharp",
      question:
        "If the party is for the farmer, why did its government in that state cut the input subsidy?",
      response:
        "The subsidy was reformed, not cut — the savings now flow directly into procurement; the numbers are on the table.",
      tags: ["farmers", "subsidy"],
      source: "curated",
    },
    {
      id: "ap-b3",
      category: "cross_exam",
      tone: "Forensic",
      question:
        "What is the party's official position on the proposed uniform civil code, in one sentence?",
      response:
        "Uniformity that respects diversity — a common code that guarantees individual rights without erasing community identities.",
      tags: ["ucc", "rights"],
      source: "curated",
    },
    {
      id: "ap-b4",
      category: "poi",
      tone: "Cordial",
      question:
        "Would the party support a joint committee on electoral funding reforms?",
      response:
        "Yes — and we will be the first to sign the terms of reference.",
      tags: ["electoral-funding", "reform"],
      source: "curated",
    },
  ],
  "aippm:veteran": [
    {
      id: "ap-v1",
      category: "poi",
      tone: "Sharp",
      question:
        "The party speaks of 'national interest' — will it define that term without reference to its own electoral arithmetic?",
      response:
        "National interest is the one arithmetic all parties share. The difference is who counts first — the nation or the party. We count the nation.",
      tags: ["national-interest", "positioning"],
      source: "curated",
    },
    {
      id: "ap-v2",
      category: "cross_exam",
      tone: "Forensic",
      question:
        "Which single promise from the party's manifesto has been fully implemented in the current term?",
      response:
        "The digital identity for farmers — implemented, funded, and now being copied by two state governments, including one the Member's party runs.",
      tags: ["manifesto", "delivery"],
      source: "curated",
    },
    {
      id: "ap-v3",
      category: "poi",
      tone: "Disarming",
      question:
        "Does the party accept that its ally's statement embarrassed it at the last all-party meeting?",
      response:
        "Allies disagree in public and reconcile in private — that is what coalitions do. The meeting ended with the common minimum programme intact.",
      tags: ["allies", "coalition"],
      source: "curated",
    },
    {
      id: "ap-v4",
      category: "poi",
      tone: "Measured",
      question:
        "If the party wins the next election, will it name its prime ministerial candidate now?",
      response:
        "The party will go to the people with a candidate, a programme, and a deadline — announced before the first rally, not after the last exit poll.",
      tags: ["leadership", "election"],
      source: "curated",
    },
  ],
};

export function getPoiLibrary(
  committee: CommitteeFramework,
  skill: SkillLevel,
): VaultEntry[] {
  return POI_LIBRARY[`${committee}:${skill}`] ?? [];
}

// ---------------------------------------------------------------------------
// Angle hints per committee + skill
// ---------------------------------------------------------------------------

export const ANGLE_HINTS: Record<string, string[]> = {
  "un:beginner": [
    "Open with the chair: 'Honourable Chair, esteemed delegates…' then state your position in one line.",
    "One argument, one example, one call to action. General debate rewards clarity over volume.",
    "End by naming the bloc you are building — a resolution needs friends before it needs clauses.",
  ],
  "un:veteran": [
    "Lead with the operative ask, not the preamble. The chair and the bloc leaders have heard ten preambles already.",
    "Pre-empt the POI: plant the concession inside the speech so the point is conceded before it is raised.",
    "Quote working-paper clause numbers aloud — precision reads as preparation.",
  ],
  "loksabha:beginner": [
    "Begin with 'Honourable Speaker, through you…' — the House is unforgiving about protocol.",
    "Time discipline: five minutes feels like thirty seconds when the bell rings. Practise to four and a half.",
    "One attack, one defence, one promise — the opposition responds to structure.",
  ],
  "loksabha:veteran": [
    "Attack the argument and name the constituency: 'The Honourable Member's data serves his seat, not the nation.'",
    "Use the starred question as your hook — questions answered badly are questions worth repeating.",
    "Close with the Constitution: a quotation from the Preamble ends debates, not just speeches.",
  ],
  "aippm:beginner": [
    "Coalition math: address allies before opponents — consensus is the floor of this house.",
    "Say 'this meet', not 'this committee' — AIPPM has its own vocabulary.",
    "Keep one concession ready: a small surrender buys a large audience.",
  ],
  "aippm:veteran": [
    "Position, not policy: the room votes on which party leads, then on what it says.",
    "Invoke the common minimum programme — it is the only text every party has signed.",
    "A one-line slogan delivered twice beats a paragraph delivered once.",
  ],
};

export function getAngleHints(
  committee: CommitteeFramework,
  skill: SkillLevel,
): string[] {
  return ANGLE_HINTS[`${committee}:${skill}`] ?? ANGLE_HINTS["un:beginner"];
}

// ---------------------------------------------------------------------------
// Resolution drafting — phrase banks and starter templates
// ---------------------------------------------------------------------------

export const PHRASE_BANKS: Record<
  CommitteeFramework,
  { preamble: string[]; operative: string[] }
> = {
  un: {
    preamble: [
      "Affirming that",
      "Deeply concerned by",
      "Emphasizing the need to",
      "Guided by the principles of",
      "Noting with grave concern that",
      "Reaffirming its previous resolutions on",
    ],
    operative: [
      "Calls upon",
      "Urges",
      "Requests",
      "Condemns",
      "Encourages",
      "Decides to",
      "Invites",
    ],
  },
  loksabha: {
    preamble: [
      "Whereas this House notes with concern that",
      "Whereas the Constitution of India guarantees",
      "Recognizing the gravity of the situation",
      "This House firmly believes that",
    ],
    operative: [
      "This House urges the Government to",
      "This House recommends that",
      "This House directs the Ministry to",
      "This House calls upon all parties to",
      "This House resolves that",
    ],
  },
  aippm: {
    preamble: [
      "Whereas the unity of the nation demands",
      "Whereas the Constitution of India guarantees",
      "Recognizing the gravity of the situation",
      "This House, representing the collective will of the people,",
    ],
    operative: [
      "This House resolves that",
      "This House urges the Government of India to",
      "This House recommends that",
      "This House calls upon all parties to",
      "This House mandates the setting up of",
    ],
  },
};

export const RESOLUTION_STARTERS: Record<
  CommitteeFramework,
  { title: string; topic: string; preamble: string[]; operative: string[] }
> = {
  un: {
    title: "Ensuring Equitable Access to Climate Finance for Developing Nations",
    topic: "Climate finance and loss & damage",
    preamble: [
      "Reaffirming the principle of common but differentiated responsibilities and respective capabilities,",
      "Deeply concerned that existing climate finance flows fall far short of the commitments made under the Paris Agreement,",
      "Noting with grave concern the disproportionate impact of climate change on developing nations,",
    ],
    operative: [
      "Calls upon developed nations to honour the pledge of USD 100 billion annually and to scale it up thereafter,",
      "Requests the establishment of a transparent mechanism for tracking climate finance flows,",
      "Encourages the operationalisation of the loss and damage fund with simplified access procedures,",
      "Decides to remain seized of the matter.",
    ],
  },
  loksabha: {
    title:
      "A Resolution on Strengthening Public Healthcare and Primary Health Centres",
    topic: "Public healthcare infrastructure",
    preamble: [
      "Whereas the Constitution of India guarantees the right to life, which this House interprets to include the right to health,",
      "Whereas rural primary health centres remain understaffed and underfunded,",
      "This House firmly believes that preventive care is the most cost-effective investment in public health,",
    ],
    operative: [
      "This House urges the Government to increase public health expenditure to 2.5% of GDP within three years,",
      "This House directs the Ministry of Health to fill vacant posts at primary health centres on a mission-mode basis,",
      "This House recommends the establishment of a national telemedicine grid connecting district hospitals to village clinics,",
      "This House resolves that health outcomes be reviewed annually in this House.",
    ],
  },
  aippm: {
    title:
      "A Common Resolution on Cooperative Federalism and State Fiscal Autonomy",
    topic: "Centre-state financial relations",
    preamble: [
      "Whereas the unity and integrity of the nation are best served by a true partnership between the Centre and the States,",
      "Whereas the Constitution provides for a clear division of fiscal powers,",
      "Recognizing that delays in devolution and the arbitrary use of cesses undermine the federal compact,",
    ],
    operative: [
      "This House resolves that all cesses and surcharges be brought within the divisible pool of taxes,",
      "This House urges the Government to release pending GST compensation dues to the States without further delay,",
      "This House calls upon all parties to constitute a standing committee on Centre-State fiscal relations,",
      "This House recommends that the Finance Commission's recommendations be implemented in letter and spirit.",
    ],
  },
};

// ---------------------------------------------------------------------------
// Small formatting helpers
// ---------------------------------------------------------------------------

export function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
