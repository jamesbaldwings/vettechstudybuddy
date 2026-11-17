// Diagnostic questions. Original items written against the AAVSB 2023 VTNE Content Outline topics.
// Domain weights are the share of the 150 scored VTNE items in each domain.

export type DomainId =
  | "pharm"
  | "surgery"
  | "dentistry"
  | "lab"
  | "nursing"
  | "imaging"
  | "anesthesia"
  | "ecc"
  | "pain"
  | "communication";

export interface Domain {
  id: DomainId;
  name: string;
  weight: number; // percent of the VTNE
}

export const DOMAINS: Domain[] = [
  { id: "pharm", name: "Pharmacy and Pharmacology", weight: 13 },
  { id: "surgery", name: "Surgical Nursing", weight: 13 },
  { id: "dentistry", name: "Dentistry", weight: 7 },
  { id: "lab", name: "Laboratory Procedures", weight: 9 },
  { id: "nursing", name: "Animal Care and Nursing", weight: 20 },
  { id: "imaging", name: "Diagnostic Imaging", weight: 6 },
  { id: "anesthesia", name: "Anesthesia", weight: 13 },
  { id: "ecc", name: "Emergency and Critical Care", weight: 7 },
  { id: "pain", name: "Pain Management", weight: 7 },
  { id: "communication", name: "Communication and Professional Support", weight: 5 },
];

export const domainById = (id: DomainId) => DOMAINS.find((d) => d.id === id)!;

export interface Question {
  id: string;
  domain: DomainId;
  stem: string;
  options: string[]; // A, B, C, D in order
  answer: number; // index into options
  explanation: string;
}

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    domain: "pharm",
    stem: "A 20 kg dog is ordered cefazolin 22 mg/kg IV. The vial concentration is 100 mg/mL. How many mL should be drawn up?",
    options: ["0.44 mL", "2.2 mL", "4.4 mL", "44 mL"],
    answer: 2,
    explanation:
      "20 kg × 22 mg/kg = 440 mg. 440 mg ÷ 100 mg/mL = 4.4 mL. The 0.44 and 44 answers are decimal-place slips; 2.2 treats the per-kg dose as the total. Write out the units so they cancel and you'll catch these every time.",
  },
  {
    id: "q2",
    domain: "pharm",
    stem: "Which of these drugs is a DEA Schedule II controlled substance?",
    options: ["Butorphanol", "Hydromorphone", "Diazepam", "Ketamine"],
    answer: 1,
    explanation:
      "Hydromorphone is a full mu-opioid agonist in Schedule II, the most tightly controlled class you'll handle in practice. Ketamine is Schedule III; butorphanol and diazepam are Schedule IV. Every controlled drug needs an accurate log entry, but Schedule II carries the strictest ordering and record-keeping rules.",
  },
  {
    id: "q3",
    domain: "pharm",
    stem: "A dog started on meloxicam five days ago now has vomiting and black, tarry stool. What is the most likely cause?",
    options: ["Hepatic lipidosis", "Gastrointestinal ulceration", "Opioid-induced pancreatitis", "Hypoglycemia"],
    answer: 1,
    explanation:
      "NSAIDs block the prostaglandins that protect the stomach lining, so GI ulceration is their classic adverse effect. Black, tarry stool (melena) is digested blood from the upper GI tract. Hold the next dose and notify the veterinarian. The risk climbs when an NSAID is paired with a corticosteroid or another NSAID.",
  },
  {
    id: "q4",
    domain: "surgery",
    stem: "Which temperature and pressure are standard for a gravity-displacement steam autoclave cycle?",
    options: ["100°C (212°F) at 0 psi", "121°C (250°F) at about 15 psi", "80°C (176°F) at 5 psi", "60°C (140°F) at 0 psi"],
    answer: 1,
    explanation:
      "Pressurized steam at 121°C and about 15 psi kills spores; boiling at 100°C doesn't reliably sterilize. Exposure time depends on the load and wrapping, and pre-vacuum cycles run hotter (around 132–134°C). Put a chemical indicator in every pack and run biological indicators on a schedule.",
  },
  {
    id: "q5",
    domain: "surgery",
    stem: "When performing the sterile scrub on a surgical site, how should the scrub sponge move?",
    options: [
      "From the edge of the clipped area toward the incision site",
      "Back and forth across the incision site",
      "From the incision site outward in widening circles, never returning to the center",
      "In any direction, as long as contact time is met",
    ],
    answer: 2,
    explanation:
      "Start where the incision will be and work outward, so contaminants move away from the cleanest area. Once a sponge has touched the outer edge, it never goes back to the center. Grab a fresh one. Contact time matters too, but direction comes first.",
  },
  {
    id: "q6",
    domain: "surgery",
    stem: "Once the surgical technician is gowned and gloved, which part of the gown is considered sterile?",
    options: [
      "The back of the gown",
      "The front from chest to the level of the sterile field, and the sleeves from cuff to just above the elbow",
      "The neckline and shoulders",
      "The entire gown, including below the table",
    ],
    answer: 1,
    explanation:
      "Only what you can see and keep in front of you counts: the front from chest to table height, and the sleeves from the cuff to about two inches above the elbow. The back, neckline, shoulders and anything below the table are considered contaminated.",
  },
  {
    id: "q7",
    domain: "dentistry",
    stem: "Using the modified Triadan system, what is the number of a dog's right maxillary canine tooth?",
    options: ["104", "204", "304", "404"],
    answer: 0,
    explanation:
      "The first digit is the quadrant: 1 right maxilla, 2 left maxilla, 3 left mandible, 4 right mandible. The canine is always 04, so the right maxillary canine is 104. Remember the quadrants go clockwise as you face the patient.",
  },
  {
    id: "q8",
    domain: "dentistry",
    stem: "Which is correct technique with a powered ultrasonic scaler?",
    options: [
      "Point the tip straight at the tooth and hold it in one spot until the calculus is gone",
      "Use the side of the tip with light pressure, keep it moving, and limit contact to about 10–15 seconds per tooth",
      "Turn the water off to see the tooth surface more clearly",
      "Use firm pressure to remove calculus faster",
    ],
    answer: 1,
    explanation:
      "The tip produces heat. Pointing it at the tooth, pressing hard, staying in one spot or running it dry can overheat the pulp and etch the enamel. Light, moving strokes with the side of the tip, short contact time and steady water flow protect the tooth.",
  },
  {
    id: "q9",
    domain: "lab",
    stem: "Which test is preferred for detecting Giardia cysts in a fecal sample?",
    options: [
      "Baermann technique",
      "Zinc sulfate centrifugal flotation",
      "Passive flotation in sodium nitrate",
      "Direct smear only",
    ],
    answer: 1,
    explanation:
      "Zinc sulfate (specific gravity about 1.18) with centrifugation is the go-to for Giardia cysts, which are small and get distorted in high-gravity sugar solutions. The Baermann technique is for nematode larvae such as lungworms. A direct smear can catch trophozoites but misses many infections.",
  },
  {
    id: "q10",
    domain: "lab",
    stem: "Which blood tube is standard for a complete blood count (CBC)?",
    options: ["Red top, no additive", "Lavender top, EDTA", "Light blue top, sodium citrate", "Green top, heparin"],
    answer: 1,
    explanation:
      "EDTA prevents clotting by binding calcium and preserves cell shape for counts and smears. Red top gives serum for chemistry; light blue (citrate) is for coagulation tests; green (heparin) gives plasma for chemistry and is sometimes used in exotics. Fill EDTA tubes to the line, because under-filling can distort results.",
  },
  {
    id: "q11",
    domain: "nursing",
    stem: "Which resting heart rate is within the normal range for a healthy adult cat in the clinic?",
    options: ["60 bpm", "90 bpm", "180 bpm", "280 bpm"],
    answer: 2,
    explanation:
      "Normal adult feline heart rates run roughly 140–220 bpm in the clinic, often on the high side from stress. A rate of 60 or 90 is bradycardic for a cat and needs attention; 280 is tachycardic.",
  },
  {
    id: "q12",
    domain: "nursing",
    stem: "When measuring indirect blood pressure, what happens if the cuff is too narrow for the limb?",
    options: [
      "The reading will be falsely low",
      "The reading will be falsely high",
      "The reading will be accurate but harder to hear",
      "Only the heart rate will be affected",
    ],
    answer: 1,
    explanation:
      "A cuff that's too narrow needs more pressure to block the artery, so the reading comes out falsely high. Too wide gives a falsely low reading. Aim for a cuff width of about 30–40% of the limb's circumference, and record the cuff size and site so later readings compare fairly.",
  },
  {
    id: "q13",
    domain: "nursing",
    stem: "Which finding at a peripheral IV catheter site most strongly suggests the catheter needs to come out?",
    options: [
      "A small amount of tape residue on the fur",
      "The catheter flushes easily without resistance",
      "Redness, heat, swelling and pain along the vein",
      "The patient is eating normally",
    ],
    answer: 2,
    explanation:
      "Redness, heat, swelling and pain along the vein point to phlebitis or infection. Notify the veterinarian, pull the catheter and place a new one at a different site if it's still needed. Check the site every time you give a treatment.",
  },
  {
    id: "q14",
    domain: "nursing",
    stem: "Why are the two middle toes (digits 3 and 4) usually left visible at the end of a limb bandage?",
    options: [
      "To let the patient walk more easily",
      "To monitor for swelling, coolness or color change that signal the bandage is too tight",
      "To keep the nails from overgrowing",
      "To give the patient something to lick instead of the bandage",
    ],
    answer: 1,
    explanation:
      "Those toes are your window into circulation. If they spread apart, swell, feel cold or change color, the bandage may be too tight and needs checking right away. Look at them at least twice a day, and teach owners to do the same.",
  },
  {
    id: "q15",
    domain: "nursing",
    stem: "A cat in its kennel is crouched at the back with dilated pupils, ears flattened sideways and tail wrapped tightly around its body. What is the best interpretation and response?",
    options: [
      "The cat is relaxed; handle it normally",
      "The cat is fearful; use slow, low-stress handling such as a towel, minimal restraint and a quiet space",
      "The cat is playful; offer a toy before handling",
      "The cat is in heat; separate it from other cats",
    ],
    answer: 1,
    explanation:
      "Crouching, dilated pupils, flattened ears and a tucked tail all say fear. Forceful restraint makes it worse and raises the risk of injury to the cat and to you. Slow movements, a towel wrap and keeping the cat partly covered help. For very stressed cats, ask the veterinarian whether pre-visit medication would help.",
  },
  {
    id: "q16",
    domain: "imaging",
    stem: "Which practice best follows the ALARA radiation safety principle?",
    options: [
      "Hold the patient manually for every view while wearing lead gloves",
      "Use positioning aids or sedation and step away from the primary beam during exposure",
      "Place gloved hands in the primary beam as long as you wear a dosimeter",
      "Retake images freely, since each exposure is low",
    ],
    answer: 1,
    explanation:
      "ALARA means as low as reasonably achievable, through time, distance and shielding. Lead gloves and aprons protect only against scatter, never the primary beam. Sandbags, foam wedges, tape and sedation let you step back, and nailing the technique the first time avoids retakes.",
  },
  {
    id: "q17",
    domain: "imaging",
    stem: "At what point in the breathing cycle should a thoracic radiograph be taken?",
    options: ["At peak inspiration", "At the end of expiration", "In the middle of expiration", "Timing does not matter for the thorax"],
    answer: 0,
    explanation:
      "At peak inspiration the lungs are most inflated, giving the best contrast between air-filled lung and soft tissue. Abdominal films are the opposite: shoot at the end of expiration, when the diaphragm has moved forward and the abdomen is least crowded.",
  },
  {
    id: "q18",
    domain: "anesthesia",
    stem: "What is the main risk of over-inflating an endotracheal tube cuff in a cat?",
    options: [
      "The tube will slide out more easily",
      "Damage to the tracheal lining, including tracheal tears",
      "Faster recovery from anesthesia",
      "Lower anesthetic gas concentration",
    ],
    answer: 1,
    explanation:
      "Too much cuff pressure can damage or tear the tracheal lining, and cats are especially prone to tears. Inflate just enough to stop a leak at normal breathing pressure (about 20 cm H₂O). Disconnect the breathing circuit before you turn the patient so the tube doesn't twist in the trachea.",
  },
  {
    id: "q19",
    domain: "anesthesia",
    stem: "During anesthesia, the capnograph shows an end-tidal CO₂ of 60 mmHg. What does this most likely indicate?",
    options: [
      "Normal ventilation",
      "Hyperventilation",
      "Hypoventilation causing elevated CO₂ (hypercapnia)",
      "Low oxygen saturation",
    ],
    answer: 2,
    explanation:
      "Normal end-tidal CO₂ is about 35–45 mmHg. A reading of 60 means the patient isn't breathing enough to clear CO₂, often because the plane is too deep. Tell the veterinarian, check depth and be ready to assist ventilation. End-tidal CO₂ measures ventilation, not oxygenation. That's the pulse oximeter's job.",
  },
  {
    id: "q20",
    domain: "anesthesia",
    stem: "Which patient is the best candidate for a non-rebreathing circuit?",
    options: ["A 3 kg cat", "A 30 kg Labrador", "A 45 kg German Shepherd", "A 25 kg Border Collie"],
    answer: 0,
    explanation:
      "Non-rebreathing circuits have less resistance and dead space, so small patients breathe through them more easily. They're generally used for patients under about 5–7 kg; bigger patients usually go on a rebreathing (circle) system. Non-rebreathing systems need high oxygen flow rates to flush out CO₂.",
  },
  {
    id: "q21",
    domain: "ecc",
    stem: "According to current veterinary CPR guidelines (RECOVER), what chest compression rate should you aim for?",
    options: ["40–60 per minute", "60–80 per minute", "100–120 per minute", "150–180 per minute"],
    answer: 2,
    explanation:
      "RECOVER calls for 100–120 compressions per minute in two-minute cycles, compressing a third to half the width of the chest and letting it fully recoil. Swap compressors every cycle so nobody gets tired and sloppy.",
  },
  {
    id: "q22",
    domain: "ecc",
    stem: "Four patients arrive at the same time. Which should be seen first?",
    options: [
      "A dog that vomited once this morning and is now bright and alert",
      "A cat breathing with its mouth open and its elbows held away from its body",
      "A dog limping on one hind leg but bearing some weight",
      "A dog scratching at its ears for two days",
    ],
    answer: 1,
    explanation:
      "Open-mouth breathing in a cat is an emergency. Cats rarely mouth-breathe unless they're in serious respiratory distress. Breathing problems come first in triage: give oxygen with as little handling as possible and get the veterinarian immediately.",
  },
  {
    id: "q23",
    domain: "pain",
    stem: "Which of these is one of the features scored on the Feline Grimace Scale?",
    options: ["Tail wagging", "Orbital tightening (squinting)", "Increased appetite", "Purring"],
    answer: 1,
    explanation:
      "The Feline Grimace Scale scores five facial features: ear position, orbital tightening, muzzle tension, whisker change and head position. Purring isn't a reliable comfort sign, because cats also purr when sick or hurting.",
  },
  {
    id: "q24",
    domain: "pain",
    stem: "Which plan best describes multimodal analgesia?",
    options: [
      "Doubling the dose of a single opioid",
      "Combining drugs from different classes, such as an opioid, an NSAID and a local anesthetic block",
      "Giving pain medication only once the patient shows obvious pain",
      "Switching between two NSAIDs every other day",
    ],
    answer: 1,
    explanation:
      "Multimodal analgesia combines drugs that act at different points along the pain pathway. You get better control, often with lower doses of each drug and fewer side effects. Treat pain before it starts, and never combine two NSAIDs.",
  },
  {
    id: "q25",
    domain: "communication",
    stem: "Which of the following is NOT part of a patient's signalment?",
    options: ["Species", "Age", "Presenting complaint", "Sex and reproductive status"],
    answer: 2,
    explanation:
      "Signalment is the patient's basic description: species, breed, age, and sex with reproductive status. The presenting complaint, why they're here today, belongs in the history. Getting signalment right matters because so many conditions are tied to age, breed or sex.",
  },
];
