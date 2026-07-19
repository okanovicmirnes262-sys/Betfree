/**
 * Daily motivational messages, picked by streak day + calendar date.
 * Tiers make early days show early-recovery messages; the date salt
 * makes the pick change every day without repeating in a row.
 */

export type Message = { text: string; author?: string };

const START: Message[] = [
  // days 0–2
  { text: "Day one isn't small. It's the hardest bet you'll ever refuse." },
  { text: "You don't have to quit forever today. Just don't bet until midnight." },
  { text: "The urge you feel right now is proof the habit is fighting back. It fights hardest when it's losing." },
  { text: "Every gambler thinks they'll win it back. The house is counting on exactly that thought." },
  { text: "Right now your streak is fragile. So was every streak that made it to a year." },
  { text: "You already did the hardest part: you stopped lying to yourself." },
  { text: "One hour at a time counts too. Stack the hours." },
  { text: "The first days feel empty because gambling stole your dopamine. It comes back — give it time." },
];

const WEEK1: Message[] = [
  // days 3–6
  { text: "Three days in. The average urge lasts 15 minutes — you've already beaten hundreds of them." },
  { text: "Your brain is recalibrating right now. The restlessness is healing, not weakness." },
  { text: "A week ago you were paying to feel like this. Now you're free for free." },
  { text: "Bookmakers spend millions on ads because people like you quitting costs them money. Stay expensive." },
  { text: "Notice what you did yesterday instead of betting. That's your real life coming back." },
  { text: "Cravings are like waves — they rise, they peak, they always pass. Surf this one." },
  { text: "Nobody ever woke up regretting that they didn't bet yesterday." },
  { text: "The money in your pocket right now would already be gone. Feel that." },
];

const MONTH1: Message[] = [
  // days 7–29
  { text: "One week. Your sleep, your focus, your money — all quietly improving." },
  { text: "You've survived a full weekend without a slip. That's the boss level of early recovery." },
  { text: "The odds were never yours. Now your future actually is." },
  { text: "Two weeks of not chasing losses is two weeks of not creating new ones." },
  { text: "Every day you don't bet, the neural pathway of the habit gets a little weaker. You're literally rewiring." },
  { text: "You used to check odds. Now check your savings counter instead — that number only goes up." },
  { text: "Think of the person who worries about you most. Today you gave them a quiet day." },
  { text: "Boredom is not an emergency. You're allowed to just be bored sometimes." },
  { text: "The urge to 'just check the matches' is the habit knocking. You don't have to answer." },
  { text: "You're not missing out on a win. You're missing out on a loss — statistically, always a loss." },
  { text: "Twenty days of freedom beats twenty minutes of action. You know this now." },
  { text: "Recovery isn't about willpower every second. It's about building days where betting isn't even a question." },
];

const QUARTER: Message[] = [
  // days 30–89
  { text: "One month. That's not a streak anymore — that's a lifestyle change." },
  { text: "Thirty days ago this seemed impossible. Remember that next time something seems impossible." },
  { text: "The bookmaker's algorithm has probably flagged you as churned. Best label you'll ever get." },
  { text: "You've felt real emotions for a month — wins and losses that actually matter. That's living." },
  { text: "By now you've saved real money. That's not luck. That's the only guaranteed win in gambling: not playing." },
  { text: "Six weeks in, urges become rarer but sneakier. Stay humble, stay ready." },
  { text: "You're past the worst of the brain fog. This clarity? It's yours to keep." },
  { text: "Two months of showing up for yourself. Some people never give themselves that." },
  { text: "Your streak is now longer than most 'systems' survive. Yours actually works." },
  { text: "The person you were on day one would be proud of you. The person you'll be at one year already is." },
];

const LONG: Message[] = [
  // day 90+
  { text: "Three months clean. Researchers call this the point where new habits become identity. You're not quitting anymore — you've quit." },
  { text: "A quarter of a year without feeding the machine. The machine misses you. Let it." },
  { text: "You've built something no jackpot could buy: trust in yourself." },
  { text: "By now, helping someone else quit might be your strongest move. Freedom shared is freedom doubled." },
  { text: "Half a year of Sundays that don't depend on a score. That's wealth." },
  { text: "You don't think in odds anymore. You think in plans." },
  { text: "One year of freedom is 365 small decisions. You've been making them on autopilot for a while now. That's mastery." },
  { text: "The story you tell about yourself changed. From 'I always go back' to 'I don't do that anymore.'" },
];

const GENERAL: Message[] = [
  // any day — facts, warm support, tough love, mixed in for variety
  { text: "The house edge never sleeps, never tilts, never has a bad day. You can't outplay math — but you can walk away from it. You did." },
  { text: "Gambling sells the feeling of almost. You're building the feeling of actually." },
  { text: "A 'near miss' is a loss with better marketing." },
  { text: "Slot machines and betting apps use the same reward schedule scientists use to addict lab rats. You broke the schedule." },
  { text: "Money saved is boring. Boring is what rich and calm people call Tuesday." },
  { text: "You can't win back the past. You can only stop paying for it." },
  { text: "Your urge is not a command. It's a notification — and you can swipe it away." },
  { text: "Bet on yourself instead. The payout is your whole life." },
  { text: "Nobody's last bet was the plan. Yours actually was." },
  { text: "Freedom isn't the absence of desire. It's desire without obedience." },
  { text: "Odds are a story. Compound interest is a fact. You switched sides." },
  { text: "Each urge you beat makes the next one weaker. You're not enduring — you're training." },
  { text: "Anyone can quit on a good day. You're the kind who stays quit on the bad ones." },
  { text: "If gambling worked, they wouldn't need to advertise it during every match." },
  { text: "The most rebellious thing a gambler can do is keep their own money." },
  { text: "Some days you won't feel strong. Fine. Do it weak — it still counts." },
  { text: "You're not 'missing the fun'. You're remembering what fun felt like before it had a price tag." },
  { text: "A streak is just a promise you keep renewing. Renew it today." },
  { text: "Losses chase you only if you run toward them." },
  { text: "Your future self is watching this exact moment through memory. Give them something good." },
];

const MILESTONE_DAYS = [1, 3, 7, 14, 30, 60, 90, 180, 365] as const;

const MILESTONE_MESSAGES: Record<number, Message> = {
  1: { text: "24 hours bet-free. The single hardest day is behind you. 🎉" },
  3: { text: "Three days! The acute cravings peak around now — and you're still here. 🎉" },
  7: { text: "One full week without a single bet. This is officially momentum. 🏆" },
  14: { text: "Two weeks strong. Your brain's reward system is measurably recovering. 🏆" },
  30: { text: "THIRTY DAYS. You've done what most never even attempt. 🏆" },
  60: { text: "Two months of freedom. The new you isn't new anymore — it's just you. 🏆" },
  90: { text: "90 days — the gold standard of recovery milestones. Extraordinary. 🏆" },
  180: { text: "Half a year bet-free. Read that again. Half a year. 🏆" },
  365: { text: "ONE YEAR. 365 days of choosing yourself. You are living proof it can be done. 👑" },
};

function pool(streakDays: number): Message[] {
  if (streakDays < 3) return [...START, ...GENERAL];
  if (streakDays < 7) return [...WEEK1, ...GENERAL];
  if (streakDays < 30) return [...MONTH1, ...GENERAL];
  if (streakDays < 90) return [...QUARTER, ...GENERAL];
  return [...LONG, ...GENERAL];
}

/** Deterministic daily pick: same message all day, new one tomorrow. */
export function dailyMessage(streakDays: number, date = new Date()): Message {
  const milestone = MILESTONE_MESSAGES[streakDays];
  if (milestone) return milestone;
  const p = pool(streakDays);
  const dayKey =
    date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate() + streakDays * 7;
  return p[dayKey % p.length];
}

export function milestones(streakDays: number) {
  return MILESTONE_DAYS.map((d) => ({ days: d, reached: streakDays >= d }));
}

export const TOTAL_MESSAGES =
  START.length + WEEK1.length + MONTH1.length + QUARTER.length + LONG.length + GENERAL.length;
