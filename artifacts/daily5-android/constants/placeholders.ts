export const PROMPTS = [
  'Had coffee with someone who made me laugh.',
  'Twisted my ankle running for the bus — still made the train.',
  'Learned that sourdough likes a cold fridge overnight.',
  'Fought with my sister about something small. We\'ll be fine.',
  'Watched the sunset from the balcony, alone, and it was enough.',
  'Got told \'good job\' by someone whose opinion actually matters.',
  'Found a new shortcut I\'ve somehow missed for years.',
  'Made dinner from scratch. It actually worked.',
  'Long walk to clear my head. Mostly it worked.',
  'Cancelled plans and did not feel guilty about it.',
  'Someone held the door. It made my whole day.',
  'Read two pages of a book I keep meaning to finish.',
  'Skipped the gym. Rested instead. Both are valid.',
  'Quiet evening. The apartment felt like mine tonight.',
  'Sent that message I\'d been putting off all week.',
  'Ran further than I expected. Didn\'t push past that.',
  'Small win at work. Wrote it down so I wouldn\'t forget.',
  'Ordered too much food. Leftovers for tomorrow.',
];

export function randomPrompt(): string {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}
