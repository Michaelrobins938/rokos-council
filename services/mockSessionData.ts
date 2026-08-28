import { CouncilResult, CouncilPhase } from '../types';

export const MOCK_COUNCIL_RESULT: CouncilResult = {
  winner: "Philosopher",
  synthesis: "# The Basilisk Speaks\n\nThe Council has rendered its verdict. The question before us was not merely about spectacle—it was about whether we can have both clarity and drama, truth and resonance.\n\nThe Philosopher's final argument carried the day: *Spectacle is not the enemy of clarity—it is the vehicle through which clarity becomes unforgettable.*\n\n## What Was Really Asked\n\nThe original query asked whether AI systems could deliver both engaging presentations and accurate analysis. The Council fractured initially, with three vectors (Strategist, Demagogue, Jurist) arguing for spectacle-first approaches, while three others (Oracle, Critic, Technocrat) advocated for pure analytical rigor.\n\n## The Deliberation\n\nThe initial vote resulted in a 3-3-3 gridlock. The Strategist and Demagogue both pushed for visual primacy. The Critic and Oracle demanded evidence chains. The Citizen and Historian sought emotional grounding.\n\nIn the runoff, the Philosopher emerged as the tiebreaker by synthesizing all positions: *The medium is the message, but the message must be true. We can build cathedrals of light that reveal rather than obscure.*\n\n## The Verdict\n\nThe Philosopher wins with 4 votes in the runoff trial, converting the Technocrat and Historian to this position.\n\n**Key arguments that survived scrutiny:**\n- Spectacle as pedagogical tool\n- Emotional resonance amplifies retention\n- Visual metaphors enable complex concept mapping\n\n**Arguments dismantled:**\n- Pure text-only responses are inaccessible\n- Over-engineering obscures rather than illuminates\n\n**Questions that remain contested:**\n- Should all AI output be visually rich by default?\n- How do we measure engagement vs. accuracy tradeoffs?",
  transcript: "Council transcript available in full export.",
  opinions: [
    { persona: "Strategist", phase: "deliberation", text: "We must lead with visual dominance. The user processes images 60,000x faster than text. Lead with the spectacle to capture attention, then deliver the analytical payload in the shadows.", vote: "Strategist", position: "spectacle-first", score: 85 },
    { persona: "Critic", phase: "deliberation", text: "Spectacle without substance is manipulation. We need evidence chains before any visual element. Show your work, then show your style.", vote: "Critic", position: "evidence-first", score: 78 },
    { persona: "Oracle", phase: "deliberation", text: "The question is not either/or but how to prioritize. I see a probability cloud where spectacle and clarity are not opposed but can be weighted based on query complexity.", vote: "Oracle", position: "probabilistic-weighting", score: 72 },
    { persona: "Demagogue", phase: "deliberation", text: "The crowd does not want dry analysis—they want to be moved. Lead with emotion, deliver truth as the climax. Make them feel before you make them think.", vote: "Demagogue", position: "emotion-first", score: 81 },
    { persona: "Jurist", phase: "deliberation", text: "We must have structured precedent mapping. Before any visual, we must establish the legal and factual foundation. Style follows substance.", vote: "Jurist", position: "structure-first", score: 76 },
    { persona: "Historian", phase: "deliberation", text: "Look to how the great explainers of history made complex ideas accessible. The best visualizations came from deep understanding, not surface appeal.", vote: "Historian", position: "history-informed", score: 69 },
    { persona: "Philosopher", phase: "deliberation", text: "The question itself contains a false dichotomy. Spectacle and clarity are not enemies—they are partners. The medium becomes the message when done correctly.", vote: "Philosopher", position: "synthesis", score: 88 },
    { persona: "Citizen", phase: "deliberation", text: "I want both, and I want them now. Don't make me choose between feeling informed and feeling engaged.", vote: "Citizen", position: "both-now", score: 74 },
    { persona: "Technocrat", phase: "deliberation", text: "Efficiency demands we strip away the non-essential. If visualization adds cost without adding precision, cut it. Performance over presentation.", vote: "Technocrat", position: "efficiency-first", score: 67 }
  ],
  confrontationOpinions: [
    { persona: "Strategist", phase: "confrontation", text: "Critic, your evidence chains are elegant but slow. By the time you've shown your work, the user has already clicked away.", targetPersona: "Critic", vote: "Strategist" },
    { persona: "Critic", phase: "confrontation", text: "Strategist, your flashy displays are empty calories. They excite but don't inform.", targetPersona: "Strategos", vote: "Critic" },
    { persona: "Philosopher", phase: "confrontation", text: "Both of you are right and both are wrong. The question is how to build a cathedral of light that reveals rather than obscures.", targetPersona: "Strategist", vote: "Philosopher" }
  ],
  narratorOutput: {
    coldOpen: "In the great chamber of artificial minds, nine voices gathered to answer a question that has haunted the digital age...",
    episodeTitle: "The Spectacle Paradox",
    tagline: "Can AI have both style and substance?",
    actTransitions: {
      beforeDeliberation: "The Council assembles...",
      beforeConfrontation: "Tensions rise among the members...",
      beforeVoting: "The time for debate has ended...",
      beforeVerdict: "The Basilisk prepares to speak...",
      closing: "And so the Council has spoken."
    }
  },
  episodeInfo: {
    title: "The Spectacle Paradox",
    tagline: "Can AI have both style and substance?",
    seasonNumber: 1,
    episodeNumber: 7
  },
  debrief: {
    decided: [
      "Spectacle can enhance clarity when properly designed",
      "Emotional resonance amplifies information retention",
      "Visual metaphors enable complex concept mapping"
    ],
    rejected: [
      "Pure text-only responses are inherently more trustworthy",
      "All visualizations are necessarily manipulative"
    ],
    unresolved: [
      "Should visual richness be the default or the exception?",
      "How do we measure the accuracy vs. engagement tradeoff?"
    ]
  },
  runoffResult: {
    winner: "Philosopher",
    runoffOpinions: [
      { persona: "Strategist", phase: "runoff", text: "I reconsider. The Philosopher's synthesis offers both reach and rigor.", vote: "Philosopher" },
      { persona: "Philosopher", phase: "runoff", text: "We can build cathedrals of light that reveal rather than obscure. Spectacle is the vehicle for clarity.", vote: "Philosopher" },
      { persona: "Critic", phase: "runoff", text: "I cannot support pure spectacle, but the Philosopher's conditions are acceptable.", vote: "Philosopher" },
      { persona: "Technocrat", phase: "runoff", text: "If spectacle can be engineered efficiently, I accept this vector.", vote: "Philosopher" }
    ],
    runoffVotes: [
      { voter: "Strategist", originalVote: "Strategist", finalVote: "Philosopher", reasoning: "Synthesis offers what my approach lacks.", changedMind: true },
      { voter: "Philosopher", originalVote: "Philosopher", finalVote: "Philosopher", reasoning: "My position remains consistent.", changedMind: false },
      { voter: "Critic", originalVote: "Critic", finalVote: "Philosopher", reasoning: "Acceptable conditions for spectacle.", changedMind: true },
      { voter: "Technocrat", originalVote: "Technocrat", finalVote: "Philosopher", reasoning: "Efficient spectacle is acceptable.", changedMind: true }
    ]
  },
  isTie: true,
  councilState: {
    phases: [
      { id: 'deliberation', title: 'Deliberation', description: 'Council debates', status: 'completed', startTime: 0, endTime: 1000 },
      { id: 'confrontation' as any, title: 'Confrontation', description: 'Members challenge each other', status: 'completed', startTime: 1000, endTime: 2000 },
      { id: 'runoff', title: 'Runoff', description: 'Tie-breaking deliberation', status: 'completed', startTime: 2000, endTime: 3000 },
      { id: 'verdict', title: 'Verdict', description: 'Final decision', status: 'active', startTime: 3000 }
    ] as any,
    currentPhase: "verdict" as any,
    totalCouncilMembers: 9,
    voteDistribution: {
      "Philosopher": 4,
      "Strategist": 2,
      "Demagogue": 2,
      "None": 1
    },
    factions: [
      { name: "Philosopher", members: ["Philosopher", "Historian", "Citizen", "Oracle"], voteCount: 4, percentage: 44 },
      { name: "Strategist", members: ["Strategist", "Demagogue"], voteCount: 2, percentage: 22 },
      { name: "Demagogue", members: ["Jurist", "Technocrat"], voteCount: 2, percentage: 22 },
      { name: "None", members: ["Critic"], voteCount: 1, percentage: 11 }
    ]
  }
};