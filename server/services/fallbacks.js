// Local fallback questions to prevent dead-ends when OpenAI fails
const FALLBACKS = [
  {
    id: "FB-EV-1",
    subject: "Evidence",
    topic: "Hearsay 801–807",
    stem: "At trial for burglary, a neighbor testifies that, the night after the break-in, the victim said, 'I saw the defendant on my porch yesterday.' The victim also testifies and is cross-examined at trial. The defense objects on hearsay grounds. Should the statement be admitted?",
    choices: [
      "Yes, as a prior identification by a testifying witness",
      "Yes, as a present-sense impression",
      "No, because it is testimonial under the Confrontation Clause",
      "No, because the statement is offered to prove the truth of the matter asserted"
    ],
    correctIndex: 0,
    explanation: "Prior identification by testifying witness is non-hearsay under FRE 801(d)(1)(C)",
    explanationLong: "Under FRE 801(d)(1)(C), a declarant-witness's prior identification of a person is non-hearsay if the declarant testifies and is subject to cross-examination. The victim testified and was cross-examined, so the neighbor can recount the victim's prior identification. Present-sense impression is inapposite. The Confrontation Clause does not bar non-testimonial statements offered via a witness when the declarant appears and is cross-examined.",
    ruleRefs: ["FRE 801(d)(1)(C)"],
    timeLimitSec: 60,
    license: "© Law Duel, original",
    status: "approved"
  },
  {
    id: "FB-K-1",
    subject: "Contracts",
    topic: "UCC §2—Risk of Loss",
    stem: "A merchant seller tenders identified goods FOB seller's city. Before the buyer can pick them up, the buyer repudiates. A storm then destroys the goods while still in the seller's warehouse. Who bears the loss?",
    choices: [
      "The buyer, because risk of loss had already passed at tender",
      "The buyer, because repudiation shifts the risk of loss under §2-510",
      "The seller, because the goods were not yet delivered to a carrier",
      "The seller, unless the goods were conforming"
    ],
    correctIndex: 1,
    explanation: "UCC §2-510 shifts risk to buyer after repudiation",
    explanationLong: "Under UCC §2-510(3), when the buyer repudiates as to identified goods before risk of loss passes, the risk of loss shifts to the buyer for a commercially reasonable time to the extent of any deficiency in the seller's insurance. Thus the buyer bears the loss here. The other options misstate when risk passes or ignore §2-510's allocation after buyer breach.",
    ruleRefs: ["UCC §2-510"],
    timeLimitSec: 60,
    license: "© Law Duel, original",
    status: "approved"
  },
  {
    id: "FB-T-1",
    subject: "Torts",
    topic: "Negligence",
    stem: "During a charity 5K, a volunteer directs runners around a pothole. A late runner ignores the sign and trips, breaking her arm. She sues the city for negligence for failing to repair the street. The city asserts the runner's comparative negligence. How should a court likely rule?",
    choices: [
      "For the city, because the runner's negligence is a superseding cause",
      "For the city, reducing damages under comparative negligence",
      "For the runner, because participants assume no risks from city streets",
      "For the runner, because the city owed a non-delegable duty"
    ],
    correctIndex: 1,
    explanation: "Comparative negligence reduces damages but doesn't bar recovery",
    explanationLong: "The city owes a duty to maintain streets reasonably, but the runner's failure to heed an obvious warning sign is comparative negligence, which reduces (not bars) recovery in comparative-fault jurisdictions. It is not a superseding cause. Assumption-of-risk is not categorical; and non-delegable duty does not make the city strictly liable.",
    ruleRefs: ["Comparative Negligence"],
    timeLimitSec: 60,
    license: "© Law Duel, original",
    status: "approved"
  },
  {
    id: "FB-CL-1",
    subject: "Criminal Law",
    topic: "Fourth Amendment",
    stem: "Police receive an anonymous tip that a man in a red jacket is selling drugs outside a specific address. Officers go to the location and see a man in a red jacket. They approach and ask for identification. When he reaches for his wallet, they see a gun in his waistband and arrest him. Was the seizure lawful?",
    choices: [
      "Yes, because the anonymous tip created reasonable suspicion",
      "Yes, because the gun was in plain view during a lawful encounter",
      "No, because anonymous tips alone cannot justify a stop",
      "No, because asking for identification constituted a seizure"
    ],
    correctIndex: 1,
    explanation: "Plain view doctrine applies during lawful police encounters",
    explanationLong: "The initial approach was a consensual encounter, not requiring reasonable suspicion. When the suspect voluntarily reached for his wallet, the gun became visible to officers in plain view. The plain view doctrine permits seizure of contraband observed during lawful police activity. The anonymous tip alone would not justify a Terry stop, but the plain view observation during a consensual encounter provides lawful grounds for arrest.",
    ruleRefs: ["Fourth Amendment", "Plain View Doctrine"],
    timeLimitSec: 60,
    license: "© Law Duel, original",
    status: "approved"
  }
];

const SUBJECT_ENUM = ["Evidence", "Contracts", "Torts", "Criminal Law", "Civil Procedure", "Constitutional Law", "Property"];

export function pickLocalFallback(subjectPool) {
  const pool = subjectPool && subjectPool.length ? subjectPool : SUBJECT_ENUM;
  const candidates = FALLBACKS.filter(f => pool.includes(f.subject));
  const item = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
  return item ? { ...item, id: `FB-${item.id}-${Date.now()}` } : null;
}

export { FALLBACKS };