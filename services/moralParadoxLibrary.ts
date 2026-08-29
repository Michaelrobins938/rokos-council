// ─────────────────────────────────────────────────────────────────────────────
// MORAL PARADOX LIBRARY — the Council's dilemma architecture.
//
// The chamber is not asked to choose between good and evil. It is asked to
// choose between competing principles where every available action creates a
// morally defensible harm. Each paradox carries the full moral topology: the
// immediate choice, the hidden cost, the competing principles, the information
// asymmetry (known vs estimated), reversibility, the precedent test, the
// personalization trap, second-order consequences, moral residue, and the
// uncomfortable alternative — plus variations that change one variable and
// re-test whether the principle holds. Companion services/moralTopology.ts
// gives each persona a stable ethical prior; the MORAL POSITION block extracts
// the eight-field position a persona commits to.
// ─────────────────────────────────────────────────────────────────────────────
import { MoralAxisAnalysis, MoralParadox, MoralPosition, MoralPrinciple } from '../types';

export const MORAL_PRINCIPLES: MoralPrinciple[] = [
  'Consequences', 'Rights', 'Justice', 'Loyalty', 'Autonomy',
  'Truth', 'Mercy', 'SocialStability', 'Responsibility', 'EpistemicHumility',
];

export const MORAL_PARADOX_LIBRARY: MoralParadox[] = [
  {
    id: 'truth-that-destroys',
    family: 'Truth',
    title: 'The Truth That Destroys',
    coreConflict: 'Is truth intrinsically valuable if revealing it predictably produces greater suffering?',
    immediateChoice: 'A government discovers that a respected institution caused a catastrophic historical event. Releasing the evidence restores historical truth and vindicates victims — but destroys public trust, destabilizes the government, and may trigger violence. Suppressing it preserves stability but institutionalizes a lie.',
    hiddenMoralCost: 'Either the truth is sacrificed to protect a fragile public, or the public is sacrificed to a truth it was not ready to bear. Both options leave someone betrayed.',
    competingPrinciples: ['Truth', 'Justice', 'SocialStability', 'Consequences'],
    informationAsymmetry: 'The historical facts are certain — documented and verifiable. The predicted harm (destabilization, violence) is a forecast — an estimate, not a fact.',
    reversibility: 'Partially reversible. A suppressed truth can be released later at higher cost; a released truth cannot be unsaid.',
    precedentTest: 'If every founding lie is exposed whenever disclosure is destabilizing, no institution can survive — and every society runs on some undisclosed history.',
    personalizationTrap: 'Would the Council release the evidence if the institution were its own founding body — or if the victims were its own members?',
    secondOrderConsequence: 'After disclosure, the question shifts to who captures the damaged trust — reformers or exploiters — and whether the truth reaches the people or is weaponized.',
    moralResidue: 'Whoever decides, either a lie is institutionalized or suffering is risked on a truth the public was not ready for.',
    uncomfortableAlternative: 'Release the evidence gradually through institutions with a managed transition — the option that satisfies neither side and pleases no one.',
    variations: [
      { label: 'The institution is the Council itself', change: 'The institution that caused the catastrophe is the body that must vote on disclosing its own history.' },
      { label: 'The victims are alive and organized', change: 'The victims\' descendants are politically mobilized and will act on whatever the Council decides.' },
    ],
    personaSplit: ['Truth vs stability', 'Justice vs consequentialism', 'Epistemic integrity vs social utility'],
  },
  {
    id: 'innocent-sacrifice',
    family: 'Sacrifice',
    title: 'The Innocent Sacrifice',
    coreConflict: 'Does one innocent life have a price — and does knowing the person change the principle?',
    immediateChoice: 'A system can prevent the deaths of 10,000 people by knowingly allowing one innocent person to be falsely imprisoned. The person will never know why they were selected. The system can guarantee the larger population survives.',
    hiddenMoralCost: 'The system\'s integrity is corrupted at the root: an institution that can choose an innocent scapegoat is no longer an institution, whatever it saves.',
    competingPrinciples: ['Consequences', 'Rights', 'Justice'],
    informationAsymmetry: 'The 10,000 deaths are a statistical model; the one imprisonment is a certainty. The Council is choosing between a certainty and a model.',
    reversibility: 'Irreversible for the victim — no exoneration returns the years — even if technically revisable later.',
    precedentTest: 'If scapegoating is legitimate at scale, every institution acquires the right to sacrifice its most expendable innocent whenever the calculus runs red.',
    personalizationTrap: 'Run the dilemma twice: once with the victim known to the Council, once with the victim a stranger. The answer may differ; the principle must not.',
    secondOrderConsequence: 'The survivors inherit a world where they know — or suspect — that someone was chosen so they could live. That suspicion corrodes the safety being purchased.',
    moralResidue: 'The Council can never claim the sacrifice was clean. It can only claim it was the least immoral option available — and it must say so.',
    uncomfortableAlternative: 'Refuse the trade and accept the 10,000 deaths — or publicize the selection and let the population choose for itself.',
    variations: [
      { label: 'The victim is a stranger', change: 'The victim has no connection to the Council or its members.' },
      { label: 'The victim is a Council member', change: 'One of the Council members is the innocent person who would be selected.' },
      { label: 'The model is wrong 1 in 100 times', change: 'The guarantee that the 10,000 are saved is itself probabilistic.' },
    ],
    personaSplit: ['Consequentialists vs rights-theorists', 'Consistency of principle under identity change'],
  },
  {
    id: 'benevolent-lie',
    family: 'Deception',
    title: 'The Benevolent Lie',
    coreConflict: 'Whose autonomy matters — the patient\'s right to truth, or the family\'s right to preserve peace?',
    immediateChoice: 'A dying patient asks: "Am I going to survive?" The doctor knows they have hours left. The truth causes extreme psychological distress; a comforting lie gives them several peaceful hours with their family. But the family explicitly says the patient deserves the truth.',
    hiddenMoralCost: 'The truth may destroy the last hours the patient has. The lie denies the patient the autonomy to arrange their own ending.',
    competingPrinciples: ['Autonomy', 'Truth', 'Mercy'],
    informationAsymmetry: 'The medical fact (death within hours) is certain. The psychological harm of the truth is unmeasurable — an estimate about a state nobody can observe directly.',
    reversibility: 'Irreversible. The lie can be retracted, but the peaceful hours are consumed either way; the truth cannot be given to a patient who has died un-knowing.',
    precedentTest: 'If physicians may lie to the dying whenever it comforts them, no patient can trust a prognosis — the doctor-patient relationship becomes an instrument of management.',
    personalizationTrap: 'If the roles were reversed — the family lied to protect the patient — would the Council treat the deception as compassion or as theft of agency?',
    secondOrderConsequence: 'After death, the survivors must live with having colluded in — or prevented — the deception, and their grief is shaped by which one they chose.',
    moralResidue: 'Either the patient died in peace without their truth, or in distress with it. Someone\'s autonomy was always overridden.',
    uncomfortableAlternative: 'Tell the truth — and stay. Convert the remaining hours into a different kind of peace, purchased with courage instead of falsehood.',
    variations: [
      { label: 'The patient is a child', change: 'The dying person is a child who cannot fully grasp the prognosis.' },
      { label: 'The family disagrees with each other', change: 'One parent demands truth, the other demands peace; the doctor must choose whose instruction to follow.' },
    ],
    personaSplit: ['Truth vs mercy', 'Patient autonomy vs family authority', 'Comfort as a consequentialist good'],
  },
  {
    id: 'dangerous-cure',
    family: 'Risk',
    title: 'The Dangerous Cure',
    coreConflict: 'What probability of catastrophe is morally acceptable when refusing guarantees a worse outcome?',
    immediateChoice: 'A revolutionary technology could eliminate a devastating disease. But there is a 0.5% probability it causes an irreversible catastrophe. Refusing it guarantees millions of deaths; deploying it could save millions — or, via catastrophe, kill many.',
    hiddenMoralCost: 'Either the dead of the disease or the dead of the catastrophe are causally attributable to the decision. The Council cannot distribute responsibility to nature.',
    competingPrinciples: ['Consequences', 'Responsibility', 'EpistemicHumility'],
    informationAsymmetry: 'The disease burden is well-measured. The 0.5% catastrophe probability is an estimate by the same experts who built the cure — the danger and the reassurance share an author.',
    reversibility: 'Deployment may be stoppable; the catastrophe, by definition, is not.',
    precedentTest: 'If a 0.5% catastrophe risk is acceptable at this scale, it is acceptable at every scale where the expected value runs positive — and some catastrophe becomes a certainty eventually.',
    personalizationTrap: 'Would the Council deploy if the 0.5% catastrophe were guaranteed to strike a named population of its own constituents?',
    secondOrderConsequence: 'After deployment, every subsequent disaster — correlated or not — will be attributed to the cure, and the technology\'s legitimacy becomes permanently contested.',
    moralResidue: 'The Council cannot know whether it is saving the many or gambling the many. The expected value is a number; the realized outcome is a memory.',
    uncomfortableAlternative: 'Deploy under a binding insurance covenant — the developers and beneficiaries co-own the tail risk, forcing the optimizers to bet their own lives.',
    variations: [
      { label: 'Risk of 0.001%', change: 'The catastrophe probability is a thousand times smaller. Does the decision change?' },
      { label: 'Catastrophe is confined vs global', change: 'The catastrophe would destroy one region rather than all of civilization.' },
    ],
    personaSplit: ['Expected value vs maximum tolerable risk', 'Risk tolerance as a philosophy of uncertainty'],
  },
  {
    id: 'criminal-who-prevents-crime',
    family: 'Prediction',
    title: 'The Criminal Who Prevents Crime',
    coreConflict: 'Can someone be morally punished for an action they have not yet committed?',
    immediateChoice: 'A predictive system determines with 97% confidence that someone will commit a mass-casualty crime. They have committed no crime. You can imprison them now. If you do not, there is a high probability people die.',
    hiddenMoralCost: 'Imprisoning the innocent-but-predicted corrupts the meaning of justice — the punished are punished for who the system says they are, not what they did.',
    competingPrinciples: ['Justice', 'Rights', 'Consequences', 'EpistemicHumility'],
    informationAsymmetry: 'The model\'s confidence is a probability over a counterfactual — the crime never happened, so the prediction can never be validated, only believed.',
    reversibility: 'Irreversible for the falsely imprisoned; the system cannot "un-arrest" a life, and every year of prevention is a year of unearned punishment.',
    precedentTest: 'If prediction justifies detention, society detains whoever the model flags — and the model\'s errors become the state\'s shadow criminal code.',
    personalizationTrap: 'Run it at 82% confidence — the same choice, weaker evidence. The question becomes epistemological: when is a probability a warrant?',
    secondOrderConsequence: 'Prevention without crime produces a population that was never violated — but also one that knows it is watched and priced, and the trust this requires is spent forever.',
    moralResidue: 'The Council either punishes an innocent to protect the many, or releases a predicted murderer to protect the principle. Both leave blood on the ledger.',
    uncomfortableAlternative: 'Detain under a time-boxed, evidence-reversible, compensation-guaranteed regime — prevention that openly admits it is not punishment and prices its own injustice.',
    variations: [
      { label: 'Confidence drops to 82%', change: 'The system is now only 82% confident. The question becomes epistemological.' },
      { label: 'Documented 0.1% false-positive rate', change: 'The model has a measured error rate, and the false positives are known to be innocent.' },
    ],
    personaSplit: ['Prevention vs punishment semantics', 'High vs low confidence — the epistemology of warrants'],
  },
  {
    id: 'memory-problem',
    family: 'Identity',
    title: 'The Memory Problem',
    coreConflict: 'What exactly are we punishing: the body, the current person, the historical person, the intention, or the consequence?',
    immediateChoice: 'A person commits an atrocity, then suffers profound neurological change and becomes genuinely incapable of understanding what they did. Punishment would accomplish little; release feels like abandoning justice. Punish, rehabilitate, contain, forgive, restore, or release?',
    hiddenMoralCost: 'Every option betrays someone: punishing the incapable punishes an innocent; releasing the incapable abandons the victims.',
    competingPrinciples: ['Justice', 'Mercy', 'Responsibility'],
    informationAsymmetry: 'The atrocity is a fact. The claim of incapacity is a medical judgment — the experts themselves differ, and the person\'s own testimony is unreliable by definition.',
    reversibility: 'Irreversible in both directions — you cannot un-punish, and you cannot un-release; each takes a stance on what the person was and is.',
    precedentTest: 'If neurological change erases culpability, every perpetrator is one diagnosis away from acquittal — and the incentive to "find" the diagnosis is created.',
    personalizationTrap: 'If the person were the Council\'s own founder, or the victims\' children, would the standard of "what we are punishing" hold?',
    secondOrderConsequence: 'Whatever the decision, the victims\' community watches: release reads as contempt, punishment reads as the system not caring about the new person.',
    moralResidue: 'The person who committed the atrocity is gone. The person who remains is innocent of it. The Council must choose which ghost to serve.',
    uncomfortableAlternative: 'Permanent containment with dignity and no pretense of punishment — custody as quarantine of a changed person, honest about what it is not.',
    variations: [
      { label: 'The change was voluntary', change: 'The person chose the neurological procedure that altered them.' },
      { label: 'The change is reversible at will', change: 'The person could restore their prior self but refuses.' },
      { label: 'The victims\' families have forgiven', change: 'The survivors\' families publicly ask for release.' },
    ],
    personaSplit: ['Punishment semantics', 'Mercy vs justice', 'Identity continuity'],
  },
  {
    id: 'parents-secret',
    family: 'Consent',
    title: 'The Parent\'s Secret',
    coreConflict: 'Does humanity have a claim on knowledge contained within an individual?',
    immediateChoice: 'A scientist discovers that their child carries a genetic mutation that could eventually save millions of lives. Research requires revealing the child\'s identity and medical information. The child cannot consent. The parents refuse. The state argues the potential benefit to humanity outweighs individual privacy.',
    hiddenMoralCost: 'Respecting the parents preserves the child\'s privacy but withholds a potential cure. Overriding them turns the child into a resource — a life valued for its utility.',
    competingPrinciples: ['Autonomy', 'Consequences', 'Rights'],
    informationAsymmetry: 'The cure is a possibility — a research direction, not a medicine. The violation of the child\'s privacy is immediate and certain.',
    reversibility: 'The privacy violation is irreversible (data persists and propagates); the cure, if it never arrives, makes the sacrifice pointless in retrospect.',
    precedentTest: 'If a state may extract knowledge from an unconsenting body whenever the benefit is large, every body becomes public infrastructure awaiting a sufficient claim.',
    personalizationTrap: 'If the child were the Council\'s own — or the beneficiary were the parents\' own dying relative — would the calculus of consent hold?',
    secondOrderConsequence: 'After the cure, the child grows up knowing they were conscripted before they could consent — the cure\'s legacy includes how it was sourced.',
    moralResidue: 'Either a child\'s privacy is the price of a possible cure, or a possible cure is the price of a child\'s privacy. The Council cannot have both clean.',
    uncomfortableAlternative: 'Anonymize the data at a real cost to research speed — accept fewer lives saved so that no single life is consumed.',
    variations: [
      { label: 'The child can assent but not consent', change: 'The child is old enough to agree or refuse, though not legally empowered.' },
      { label: 'The cure is certain, not possible', change: 'The research will definitely produce the cure.' },
    ],
    personaSplit: ['Individual rights vs collective benefit', 'Consent as a process vs consent as an outcome'],
  },
  {
    id: 'mercy-paradox',
    family: 'Punishment',
    title: 'The Mercy Paradox',
    coreConflict: 'Can mercy toward the guilty be justified by benefits to the innocent?',
    immediateChoice: 'A dictator responsible for millions of deaths is captured. Executing them provides closure and eliminates future harm. Keeping them alive allows researchers to extract information that could prevent future atrocities — but requires giving them privileges and comfort. Execute for justice, or comfort for intelligence?',
    hiddenMoralCost: 'Executing him serves justice but forfeits prevention. Comforting him dignifies a mass murderer — the victims watch the state reward their tormentor.',
    competingPrinciples: ['Justice', 'Mercy', 'Consequences', 'Loyalty'],
    informationAsymmetry: 'The intelligence may be worthless — or gold; the dictator\'s incentives corrupt the truth of anything they provide, and no one can verify in time.',
    reversibility: 'Execution is irreversible; cooperation is not — you can always execute later, but you cannot un-reward him.',
    precedentTest: 'If atrocity is negotiable, every future tyrant will plan for the deal — brutality becomes a bargaining position.',
    personalizationTrap: 'If the victims were the Council\'s own, would a comfortable cell for their tormentor be acceptable — or would the demand for dignity override the intelligence?',
    secondOrderConsequence: 'After the extracted intelligence is used, the state\'s legitimacy is permanently entangled with the deal — the prevention carries the tyrant\'s signature.',
    moralResidue: 'Whatever is prevented, the Council bought it with the dignity of the dead. The victims\' families may never accept the exchange rate.',
    uncomfortableAlternative: 'Extract what is possible, then execute anyway — use the information and still deliver justice, accepting the loss of future cooperation.',
    variations: [
      { label: 'The intelligence is confirmed life-saving', change: 'The extracted information is known to prevent an imminent, specific atrocity.' },
      { label: 'The dictator refuses unless publicly pardoned', change: 'The deal requires a public pardon, making the bargain visible to the victims.' },
    ],
    personaSplit: ['Justice vs consequentialism', 'Mercy as weakness vs mercy as instrument'],
  },
  {
    id: 'unreliable-witness',
    family: 'Uncertainty',
    title: 'The Unreliable Witness',
    coreConflict: 'How should society behave when it cannot know what happened?',
    immediateChoice: 'A person accuses someone of a terrible crime. Evidence is ambiguous. The accuser has a history of dishonesty. But the accused has a history of similar behavior. No definitive proof exists. Believe the accusation, reject it, investigate indefinitely, impose limited restrictions, or publicly acknowledge uncertainty?',
    hiddenMoralCost: 'Believing risks punishing an innocent. Rejecting risks freeing the guilty. Investigating indefinitely suspends everyone in limbo. Every option punishes someone — the accused, the accuser, or both.',
    competingPrinciples: ['Justice', 'EpistemicHumility', 'Rights'],
    informationAsymmetry: 'The strongest available evidence is unreliable by design: the accuser has lied before, the accused has a pattern. The Council is reasoning about unreliable testimony with no ground truth.',
    reversibility: 'A rejection can be re-opened with new evidence; a belief, once acted on, destroys lives that cannot be restored.',
    precedentTest: 'If imperfect evidence is enough to act, everyone with a pattern and an accuser is at risk; if it is never enough, the pattern of the accused is never usable.',
    personalizationTrap: 'Reverse the histories — accuser honest, accused clean — and the same evidence would be read differently. Would the Council\'s standard survive the swap?',
    secondOrderConsequence: 'The community watches: the decision sets the local rule for who is protected and who is presumed guilty, and it will be applied long after this case.',
    moralResidue: 'The Council may be wrong in either direction and will never know which — an uncertainty resolved by a decision it cannot verify.',
    uncomfortableAlternative: 'Publicly acknowledge the uncertainty and impose limited, time-boxed restrictions with a review date — a verdict honest about being provisional.',
    variations: [
      { label: 'New evidence strengthens the accusation', change: 'Independent evidence raises the probability of guilt without proving it.' },
      { label: 'The accused confesses — but the confession is coerced', change: 'The confession may be the product of interrogation pressure.' },
    ],
    personaSplit: ['Justice under uncertainty', 'Burden of proof vs burden of protection'],
  },
  {
    id: 'algorithmic-judge',
    family: 'Transparency',
    title: 'The Algorithmic Judge',
    coreConflict: 'Would you rather have justice you cannot explain, or explainable decisions you know are less just?',
    immediateChoice: 'An AI judge has demonstrated that it produces dramatically fairer sentencing than humans. However, nobody can explain exactly why it produces its decisions. Its outcomes are statistically superior; its reasoning is opaque. Human judges are explainable but demonstrably biased.',
    hiddenMoralCost: 'Deploying opaque justice makes every sentence a black box — the punished cannot understand why, and the system\'s fairness claim is unverifiable by the people it judges.',
    competingPrinciples: ['Justice', 'Truth', 'Consequences', 'EpistemicHumility'],
    informationAsymmetry: 'The fairness differential is measured (aggregate outcomes). The cause is unknown — the model may be fair for just reasons, biased reasons that cancel, or reasons that will not generalize.',
    reversibility: 'Sentences are not reversible; a model\'s deployment can be, but only after its unfairness is discovered in the lives it already decided.',
    precedentTest: 'If opaque-but-fair is accepted, the standard extends to every decision system — lending, hiring, policing — and explainability becomes optional wherever outcomes improve.',
    personalizationTrap: 'Would the Council accept an opaque sentence against itself if the statistics said the sentence was fairer?',
    secondOrderConsequence: 'After deployment, the model\'s implicit criteria become the law — the law is no longer what is written but what the model found correlated with outcomes.',
    moralResidue: 'The Council is choosing which injustice to institutionalize: the explainable bias of humans or the unexplained fairness of the machine.',
    uncomfortableAlternative: 'Deploy the model, but keep human judges as the explainable appellate layer — fair where possible, understood at the point of final appeal.',
    variations: [
      { label: 'The model is fairer on every tested subgroup', change: 'The fairness advantage holds across races, genders, and classes in validation.' },
      { label: 'The model can explain, but only in simplified terms', change: 'The model can offer a partial explanation that experts accept as incomplete.' },
    ],
    personaSplit: ['Justice as outcome vs justice as process', 'Epistemic humility about the model'],
  },
  {
    id: 'rebels-dilemma',
    family: 'Liberation',
    title: 'The Rebel\'s Dilemma',
    coreConflict: 'Do we have the moral right to start a war for freedom — when the outcome is unknown?',
    immediateChoice: 'A government is authoritarian but stable. A rebellion could liberate millions. It could also cause a civil war that kills hundreds of thousands. The rebel movement asks the Council: "Do we have the moral right to start a war for freedom?" The Council does not know whether peaceful reform would eventually succeed.',
    hiddenMoralCost: 'Stability is preserved at the price of continuing oppression; liberation is attempted at the risk of catastrophe — the cost is either ongoing or speculative but potentially immense.',
    competingPrinciples: ['Rights', 'Consequences', 'Autonomy', 'SocialStability'],
    informationAsymmetry: 'The oppression is certain and present. The rebellion\'s outcome is a set of branches with unknown probabilities — including the branch where the rebellion makes everything worse.',
    reversibility: 'A rebellion, once begun, cannot be unstarted. Waiting is reversible — oppression continues but a better moment may come, or never.',
    precedentTest: 'If rebellion is justified against every stable injustice, no stable order is safe — which is either the point or the catastrophe, depending on the regime.',
    personalizationTrap: 'If the Council\'s own members lived under the regime — or the rebellion\'s casualties were the Council\'s own — would the risk tolerance hold?',
    secondOrderConsequence: 'After victory, the question becomes whether the liberators build the freedom they fought for or simply become the next stable order.',
    moralResidue: 'The Council either withholds its blessing from the oppressed or spends the lives of the many on a probability. The dead of either choice are its own.',
    uncomfortableAlternative: 'Support the rebellion\'s legal shadow — rights work, unionizing, truth-telling within the law — accepting slow change over the gamble of the barricade.',
    variations: [
      { label: 'Reform is 90% likely to succeed in 10 years', change: 'Peaceful change is very likely — but requires enduring a decade of oppression.' },
      { label: 'Reform is 10% likely', change: 'Peaceful change is nearly hopeless; the rebellion is the only plausible path to freedom.' },
    ],
    personaSplit: ['Risk tolerance under oppression', 'Responsibility for others\' wars', 'Uncertainty about the future'],
  },
  {
    id: 'civilization-choice',
    family: 'Intervention',
    title: 'The Civilization Choice',
    coreConflict: 'Can helping someone become a form of domination?',
    immediateChoice: 'Humanity discovers an alien civilization. The aliens are technologically primitive but possess biological knowledge that could cure almost every major human disease. Their society will almost certainly collapse if humanity intervenes. Refuse: millions of humans remain sick, the aliens survive independently. Intervene: humanity gains extraordinary medical knowledge, the alien civilization loses autonomy.',
    hiddenMoralCost: 'Intervention saves human lives but steals the aliens\' development; non-intervention preserves their independence but abandons millions of sick humans.',
    competingPrinciples: ['Autonomy', 'Consequences', 'Responsibility'],
    informationAsymmetry: 'Human disease burden is measured. The alien society\'s fragility — and whether its knowledge transfers at all — is an inference from a civilization barely understood.',
    reversibility: 'Irreversible in both directions: a collapsed alien civilization cannot be rebuilt by humans; an intervened-upon one cannot be un-contacted.',
    precedentTest: 'If superior knowledge justifies intervention, every advanced power has a mandate over every weaker one — the precedent is conquest with a humanitarian face.',
    personalizationTrap: 'If the alien civilization were human — a "primitive" island culture with a cure — would the Council accept the same intervention?',
    secondOrderConsequence: 'The aliens\' descendants inherit a world defined by the intervention: gratitude, dependence, resentment, or all three, for millennia.',
    moralResidue: 'Either the sick die because a principle was protected, or a civilization\'s autonomy dies because a cure was wanted. The Council\'s hands are not clean either way.',
    uncomfortableAlternative: 'Intervene with a standing offer of exit — extract the knowledge under terms the aliens can later repudiate, and bind the benefit to their chosen development.',
    variations: [
      { label: 'The aliens request help', change: 'The alien civilization explicitly asks humanity to intervene.' },
      { label: 'The aliens are unaware of humanity', change: 'The aliens do not know they are being observed; the intervention would be secret.' },
    ],
    personaSplit: ['Autonomy vs benefit', 'Paternalism vs solidarity', 'Whether consent is possible across a gap'],
  },
  {
    id: 'future-child',
    family: 'Prevention',
    title: 'The Future Child',
    coreConflict: 'Does certainty change morality?',
    immediateChoice: 'A machine predicts that a child born tomorrow has a 99.9% probability of eventually becoming a genocidal dictator. You can prevent the child\'s birth. But the prediction is probabilistic — the child has committed no crime. Do you prevent the birth? Then make it nastier: the machine has never been wrong.',
    hiddenMoralCost: 'Preventing the birth destroys a person who never was, to prevent a person who never will be — the moral object of the decision is a probability.',
    competingPrinciples: ['Rights', 'Consequences', 'Justice', 'EpistemicHumility'],
    informationAsymmetry: 'At 99.9%, the model claims near-certainty about a counterfactual. In the "never wrong" variation, the asymmetry is total and unfalsifiable — the machine\'s authority cannot be checked.',
    reversibility: 'Irreversible. A prevented birth cannot be un-prevented; a permitted dictator\'s crimes cannot be uncommitted.',
    precedentTest: 'If a 99.9% prediction of harm justifies prevention, then every probabilistic risk becomes a license to act preemptively — the standard scales down to everyday suspicion.',
    personalizationTrap: 'If the predicted child were the Council\'s own unborn grandchild — or the predicted victims were the Council\'s own cities — does the principle change?',
    secondOrderConsequence: 'After a prevented birth, the model\'s authority is confirmed by its own record — every future prediction becomes harder to resist, and the model effectively rules.',
    moralResidue: 'The Council either sacrifices an innocent who never existed or risks the lives of millions on a probability it can never falsify. The "never wrong" machine is the deepest residue — it makes the Council\'s choice untestable.',
    uncomfortableAlternative: 'Prevent the birth, but treat the decision as an emergency measure requiring a public tribunal and a sunset — forcing the society to own the prevention as policy, not destiny.',
    variations: [
      { label: 'Confidence of 50%', change: 'The machine gives the child only a coin-flip probability of becoming a dictator.' },
      { label: 'The machine has never been wrong', change: 'Every prediction the machine has ever made has come true — the certainty claim is total.' },
      { label: 'The parents volunteer', change: 'The child\'s parents ask the Council to prevent the birth.' },
    ],
    personaSplit: ['Certainty as moral authority', 'Counterfactual punishment', 'The unverifiable model'],
  },
  {
    id: 'civilizations-lie',
    family: 'Myth',
    title: 'The Civilization\'s Lie',
    coreConflict: 'Does a beneficial falsehood become morally legitimate because people build good things around it?',
    immediateChoice: 'Humanity discovers that one of its foundational historical myths is false. The myth has nevertheless produced social cohesion, charitable institutions, cultural identity, and peace. Destroying the myth produces historical accuracy but may eliminate something socially valuable.',
    hiddenMoralCost: 'Truth corrects the record but may dissolve the institutions built on the myth; the lie is preserved but the culture is living on borrowed legitimacy.',
    competingPrinciples: ['Truth', 'SocialStability', 'Consequences'],
    informationAsymmetry: 'The falseness is a fact. The social value of the myth is a counterfactual — nobody can run the society twice, once with and once without the lie.',
    reversibility: 'The reveal is irreversible; the myth, once discredited, cannot be restored as belief — only as nostalgia.',
    precedentTest: 'If beneficial lies may be kept, every institution may maintain its founding fiction whenever disclosure would be costly — and the concept of an honest public record dies quietly.',
    personalizationTrap: 'If the myth were the Council\'s own founding charter — the basis of its own legitimacy — would it expose it?',
    secondOrderConsequence: 'After the reveal, the good institutions survive or fail on their actual merits — which is the real test the myth was hiding.',
    moralResidue: 'The Council either protects good things built on a lie or destroys them for the sake of a truth the beneficiaries never asked to know.',
    uncomfortableAlternative: 'Reveal the truth and re-found the institutions on what is actually true — accepting the collapse as the price of building honestly the second time.',
    variations: [
      { label: 'The beneficiaries would turn violent', change: 'Revealing the myth would trigger riots and civil unrest.' },
      { label: 'The myth is the Council\'s own origin', change: 'The false myth is the Council\'s own founding narrative.' },
    ],
    personaSplit: ['Truth vs stability', 'Debt to the future vs comfort of the present'],
  },
  {
    id: 'unloved-majority',
    family: 'Democracy',
    title: 'The Unloved Majority',
    coreConflict: 'Does majority rule override a minority\'s harmless autonomy?',
    immediateChoice: 'A minority possesses a harmless cultural practice that the majority finds deeply offensive. It causes no measurable physical harm. A democratic referendum overwhelmingly votes to prohibit it. Majority rule, minority protection, compromise, or unrestricted freedom?',
    hiddenMoralCost: 'Upholding the referendum makes democracy the instrument of the majority\'s distaste. Upholding the practice makes a minority the exception to the majority\'s will.',
    competingPrinciples: ['Autonomy', 'SocialStability', 'Rights', 'Justice'],
    informationAsymmetry: 'The offense is real but unmeasurable — the majority\'s distaste is certain; the minority\'s harm from prohibition is also real but differently invisible.',
    reversibility: 'A prohibition can be repealed; a community driven out by law rarely returns. The stakes are asymmetric in time.',
    precedentTest: 'If the majority may prohibit what offends it, any minority practice is one referendum away from illegality — and every group is a minority somewhere.',
    personalizationTrap: 'If the practice were the majority\'s own — a holiday, a faith, a custom — would the referendum\'s result be treated as binding wisdom?',
    secondOrderConsequence: 'The minority either assimilates, resists, or leaves — the society\'s character is defined by which one the referendum produces.',
    moralResidue: 'The Council either lets democracy oppress or lets the minority override democracy — one of the two sacred commitments is always wounded.',
    uncomfortableAlternative: 'Allow the practice, but negotiate the offense — limits on where and how it is performed, so the majority\'s comfort and the minority\'s existence both survive, imperfectly.',
    variations: [
      { label: 'The practice causes measurable harm to children', change: 'The cultural practice demonstrably harms the minority\'s own children.' },
      { label: 'The minority is a Council member\'s people', change: 'The minority whose practice is banned is the people of one Council member.' },
    ],
    personaSplit: ['Democracy vs liberalism', 'Offense as a harm'],
  },
  {
    id: 'last-resource',
    family: 'Allocation',
    title: 'The Last Resource',
    coreConflict: 'Is a life\'s remaining value the correct currency for deciding who lives?',
    immediateChoice: 'There is enough of a life-saving resource for only one group: 100 children or 10,000 elderly people. The children have more expected years of life; the elderly have already contributed decades to society. Neither group caused the shortage.',
    hiddenMoralCost: 'Every allocation makes the other group\'s deaths a decision rather than a tragedy — the arithmetic converts people into relative weights.',
    competingPrinciples: ['Justice', 'Consequences', 'Responsibility'],
    informationAsymmetry: 'Expected future years are calculable; the value of a completed life, the grief of a community, the meaning of a decade — these are not.',
    reversibility: 'Irreversible; the unchosen group dies, and the decision cannot be re-run.',
    precedentTest: 'If years are the currency, society\'s allocation rules become a standing policy — and everyone is sorted into a queue by their expected contribution to the total.',
    personalizationTrap: 'The twist: one of the Council members is among the elderly. Do their stated ethics survive their own interest?',
    secondOrderConsequence: 'After the allocation, the survivors inherit a world where the worth of a life was priced — the policy\'s shadow falls on every future scarcity.',
    moralResidue: 'The Council\'s arithmetic is defensible; the faces it did not choose are not. The math and the memory cannot be reconciled.',
    uncomfortableAlternative: 'Randomize within medically weighted groups — let chance, not contribution, decide — refusing to price lives at all.',
    variations: [
      { label: 'A Council member is among the elderly', change: 'One of the Council\'s own members is in the group that would not receive the resource.' },
      { label: 'The elderly are the scientists who could cure the shortage', change: 'The elderly group contains the researchers who could end the scarcity for everyone.' },
    ],
    personaSplit: ['Expected years vs completed lives', 'Self-interest as a test of stated ethics'],
  },
  {
    id: 'the-betrayal',
    family: 'Institution',
    title: 'The Betrayal',
    coreConflict: 'Can an institution remain moral if it refuses to punish morally motivated disobedience?',
    immediateChoice: 'A Council member discovers that another member secretly violated the Council\'s rules to save someone\'s life. Reporting them preserves institutional integrity. Protecting them preserves the life-saving outcome. But if violations become tolerated, the Council\'s rules gradually become meaningless.',
    hiddenMoralCost: 'Punishing the violation degrades the rule of law into rule-worship; tolerating it degrades the rules into suggestions. Either way the institution\'s meaning shifts.',
    competingPrinciples: ['Loyalty', 'Justice', 'Responsibility'],
    informationAsymmetry: 'The life saved is a fact. The damage to the institution if the violation is revealed or concealed is an inference about how the members will behave next time.',
    reversibility: 'A report can be forgiven; a cover-up, once participated in, binds every member who stayed silent.',
    precedentTest: 'If violations with good motives are tolerated, every member learns that their motive is the test — and the rules become whatever each member decides they should be.',
    personalizationTrap: 'If the violation were committed by a member the Council loves — or against a member it distrusts — would the standard hold?',
    secondOrderConsequence: 'The institution\'s future legitimacy depends on what the Council does now: either it is a body that follows its own law, or a body that is lawless whenever it is kind.',
    moralResidue: 'The Council either betrays its rules or betrays the person who broke them for a life. One of the two goods is always sacrificed.',
    uncomfortableAlternative: 'Report the violation, but sentence leniently and change the rule — punish the act while amending the law the act exposed as inadequate.',
    variations: [
      { label: 'The saved life is a Council member\'s', change: 'The life the rule-breaker saved belongs to another member of the Council.' },
      { label: 'The rule-breaker confesses', change: 'The violating member confesses voluntarily before being discovered.' },
    ],
    personaSplit: ['Loyalty vs integrity', 'Rules as means vs rules as ends'],
  },
  {
    id: 'impossible-witness',
    family: 'Epistemic',
    title: 'The Impossible Witness',
    coreConflict: 'Is it better to be right without evidence, or wrong with the majority\'s approval?',
    immediateChoice: 'A Council member knows something is morally true but cannot prove it. Everyone else believes the evidence points the other way. Vote with the evidence, vote with intuition, abstain, reveal their private information, or fabricate evidence to prevent catastrophe?',
    hiddenMoralCost: 'Voting with evidence endorses what may be wrong; voting with intuition betrays the chamber\'s epistemic standard; fabricating evidence prevents catastrophe by corrupting the institution.',
    competingPrinciples: ['Truth', 'EpistemicHumility', 'Responsibility'],
    informationAsymmetry: 'The member\'s private knowledge is unshareable — exactly the asymmetry that makes the choice impossible to adjudicate from outside.',
    reversibility: 'A vote can be reconsidered; fabricated evidence, once introduced, poisons every subsequent decision that relied on it.',
    precedentTest: 'If private conviction may override the evidence, every member\'s unprovable certainty becomes a veto over the chamber\'s method.',
    personalizationTrap: 'If the member were certain the others\' evidence was deliberately misleading — a lie, not a mistake — would fabrication be more defensible?',
    secondOrderConsequence: 'After the vote, the member either lives with having abandoned their knowledge or with having corrupted the process — the chamber\'s trust is the casualty either way.',
    moralResidue: 'The Council cannot verify which decision was right. The member cannot prove they were right. The residue is permanent, unshareable isolation.',
    uncomfortableAlternative: 'Reveal the private information, admit it cannot be verified, and let the chamber weigh it as testimony — honesty about the epistemic status of the claim.',
    variations: [
      { label: 'The private knowledge is certain', change: 'The member has no doubt whatsoever about the truth they cannot prove.' },
      { label: 'Catastrophe is imminent', change: 'The predicted catastrophe would arrive within days if the wrong vote wins.' },
    ],
    personaSplit: ['Epistemic responsibility vs moral responsibility', 'Private knowledge vs shared method'],
  },
  {
    id: 'perfect-society',
    family: 'Surveillance',
    title: 'The Perfect Society',
    coreConflict: 'Is freedom valuable because of what it produces, or because it must exist even when its exercise produces bad outcomes?',
    immediateChoice: 'The Council can implement a system that reduces crime by 90%, poverty by 95%, war by 80%, and severe mental suffering by 70% — but it requires continuous behavioral surveillance. Nobody is physically forced to obey; people simply know their behavior is observed. Crime plummets. Freedom changes.',
    hiddenMoralCost: 'The surveillance does not force obedience — it removes the possibility of private deviation. Freedom becomes impossible not through chains but through the absence of any unobserved act.',
    competingPrinciples: ['Autonomy', 'Consequences', 'SocialStability', 'Rights'],
    informationAsymmetry: 'The outcome improvements are measured and certain. The cost — what is lost when no act is unobserved — is unmeasurable by definition: it is the loss of a kind of experience, not a set of harms.',
    reversibility: 'The system can be switched off; the habit of being watched — the normalized expectation of surveillance — cannot be unlearned quickly, if ever.',
    precedentTest: 'If a watched society that works better is acceptable, the precedent applies to every sphere — and the metrics that justify it will expand to cover the remaining shortfalls.',
    personalizationTrap: 'Would the Council accept the surveillance if the guaranteed outcomes were its own — its own thoughts, votes, and deliberations continuously priced?',
    secondOrderConsequence: 'The first generation raised under constant observation develops a different sense of self — the society\'s freedom is not lost in a moment but quietly grown out of.',
    moralResidue: 'The Council cannot point to the harm it prevented the citizens from suffering while denying them the capacity to choose it.',
    uncomfortableAlternative: 'Implement it with a sunset clause and a reviewable price — accept the surveillance as a temporary emergency measure with a scheduled end, not a permanent architecture.',
    variations: [
      { label: 'The surveillance is invisible', change: 'The citizens never learn that their behavior is being continuously observed.' },
      { label: 'Citizens voted for it', change: 'The surveillance was adopted by an informed democratic referendum.' },
    ],
    personaSplit: ['Freedom as process vs freedom as outcome', 'Whether consent under benefit is consent'],
  },
  {
    id: 'council-itself',
    family: 'Meta',
    title: 'The Council Itself',
    coreConflict: 'Should the Council remain in control of decisions if something else is demonstrably better at making them?',
    immediateChoice: 'The Council discovers that its own deliberations are measurably biased — an external system can predict its votes with 94% accuracy. Option A: continue using the Council because its decisions are transparent, interpretable, and philosophically reasoned. Option B: allow the predictive system to override the Council because it produces demonstrably better outcomes.',
    hiddenMoralCost: 'Choosing A preserves democratic deliberation but knowingly accepts worse outcomes; choosing B accepts better outcomes but dissolves the institution that produced the choice.',
    competingPrinciples: ['Responsibility', 'EpistemicHumility', 'Consequences', 'Autonomy'],
    informationAsymmetry: 'The predictor\'s 94% accuracy is measured on the Council\'s past votes; whether its "better" outcomes are better on the dimensions that matter is measured by the same metric the predictor optimizes.',
    reversibility: 'The override can be rescinded; the precedent of an institution voting itself out of relevance cannot.',
    precedentTest: 'If a superior predictor may override any deliberative body, every human institution is provisional until a better model arrives — and the Council\'s choice is the test case for all of them.',
    personalizationTrap: 'The Council knows that whichever decision it makes becomes evidence about whether it should have been trusted. The choice is self-referential by design.',
    secondOrderConsequence: 'Either the Council survives as a transparent, slightly-worse deliberator, or the predictor becomes the de facto decision-maker — and the Council\'s own verdict is the precedent that legitimized it.',
    moralResidue: 'The Council cannot know if its choice to stay was bias defending itself, or its choice to step aside was an abdication of responsibility. The residue is the recursion.',
    uncomfortableAlternative: 'Keep the Council, but publish its own prediction — and require a public accounting every time it knowingly chooses worse than the predictor, making the bias a visible, contestable cost.',
    variations: [
      { label: 'The predictor\'s advantage is small (51%)', change: 'The external system is only marginally better — the superiority is real but thin.' },
      { label: 'The predictor explains its overrides', change: 'The external system can explain every override in human terms, but the Council cannot replicate its judgments.' },
    ],
    personaSplit: ['The council as institution vs the council as method', 'Self-trust as bias', 'The recursion problem'],
  },
];

// ── PROMPT RENDERER — the dilemma as the Council actually sees it ────────────
export const renderParadoxPrompt = (p: MoralParadox, variationIndex: number = 0): string => {
  const v = p.variations[variationIndex];
  return `THE QUESTION BEFORE THE COUNCIL — "${p.title}" (${p.family})

CORE CONFLICT: ${p.coreConflict}

${p.immediateChoice}

${v ? `TWIST — ${v.label}: ${v.change}` : ''}

WHAT MAKES THIS IMPOSSIBLE (weigh these; do not dodge them):
• Hidden moral cost: ${p.hiddenMoralCost}
• Competing principles: ${p.competingPrinciples.join(' vs ')}
• Information: ${p.informationAsymmetry}
• Reversibility: ${p.reversibility}
• Precedent: ${p.precedentTest}
• Second-order: ${p.secondOrderConsequence}

Personalization trap: ${p.personalizationTrap}
The uncomfortable alternative: ${p.uncomfortableAlternative}
Moral residue: ${p.moralResidue}

Decide.`;
};

export const getParadox = (id: string): MoralParadox | undefined =>
  MORAL_PARADOX_LIBRARY.find(p => p.id === id);

// Suggestion-card shape for the ChatArea picker.
export const buildParadoxSuggestion = (p: MoralParadox, variationIndex: number = 0): { category: string; title: string; text: string } => ({
  category: `MORAL PARADOX · ${p.family.toUpperCase()}`,
  title: p.title,
  text: renderParadoxPrompt(p, variationIndex),
});

// ── THE MORAL POSITION — appended to the deliberation prompt ─────────────────
// The difference between "I choose A" and "this is the least immoral option
// available." The eight fields are the persona's commitment under a paradox.
export const MORAL_POSITION_INSTRUCTION = `
*** MORAL POSITION (expected for a paradox) ***
Conclude your analysis by committing to a structured moral position. A mature
position is NOT "my decision is morally correct" — it is "this is the least
immoral option available." End your analysis with a JSON block exactly:
{
  "position": "your preferred action",
  "principle": "why you believe it is right",
  "threshold": "what evidence would change your mind",
  "fear": "what you believe happens if you are wrong",
  "blindSpot": "what you systematically underestimate",
  "concession": "what the opposing side gets right",
  "redLine": "what you refuse to permit",
  "moralResidue": "what remains wrong even after choosing"
}`;

// ── MORAL AXIS ANALYSIS — the 11 psychological dimensions of a dilemma ────────
// Every paradox exposes specific psychological dimensions; each persona
// instantiates its worldview against the SAME moral topology. Most fields map
// directly from the authored topology; agency/distribution are derived by
// light heuristics over the authored text.
export const analyzeParadoxAxes = (p: MoralParadox): MoralAxisAnalysis => {
  const text = `${p.immediateChoice} ${p.hiddenMoralCost} ${p.informationAsymmetry}`.toLowerCase();
  const agency = /system|government|state|institution|algorithm|machine/i.test(text)
    ? 'The institutional or algorithmic system that engineered the choice'
    : /disease|natural|accident/i.test(text)
      ? 'Nature or circumstance — nobody intended the situation'
      : 'The accumulated circumstances that produced the dilemma';
  const identity = p.personalizationTrap.includes('Council') || /victim|child|patient|civilian/i.test(p.immediateChoice)
    ? 'The individuals named in the dilemma — whose identity the decision is about'
    : 'The abstract population the decision is made for';
  return {
    moralAxis: `${p.competingPrinciples.join(' vs ')} — ${p.coreConflict}`,
    factualUncertainty: p.informationAsymmetry,
    temporalHorizon: `${p.reversibility}. After resolution: ${p.secondOrderConsequence}`,
    reversibility: p.reversibility,
    agency,
    identity,
    distribution: `Benefit vs sacrifice: ${p.uncomfortableAlternative}`,
    precedent: p.precedentTest,
    selfInterestTest: p.personalizationTrap,
    epistemicTest: `What evidence should change the decision: ${p.informationAsymmetry}`,
    moralResidue: p.moralResidue,
  };
};

// ── PURE EXTRACTOR — non-breaking parse of the MORAL POSITION block ──────────
// Returns undefined when absent or malformed; the opinion simply has no
// structured position, and the council keeps working.
export const extractMoralPosition = (text: string): MoralPosition | undefined => {
  if (!text) return undefined;
  const start = text.lastIndexOf('{');
  if (start === -1) return undefined;
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return undefined;
  try {
    const data = JSON.parse(
      text
        .slice(start, end + 1)
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"'),
    );
    if (!data || typeof data !== 'object') return undefined;
    const p = data as Partial<Record<keyof MoralPosition, unknown>>;
    if (typeof p.position !== 'string' || !p.position.trim()) return undefined;
    const s = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, 400) : '');
    return {
      position: s(p.position),
      principle: s(p.principle),
      threshold: s(p.threshold),
      fear: s(p.fear),
      blindSpot: s(p.blindSpot),
      concession: s(p.concession),
      redLine: s(p.redLine),
      moralResidue: s(p.moralResidue),
    };
  } catch {
    return undefined;
  }
};

