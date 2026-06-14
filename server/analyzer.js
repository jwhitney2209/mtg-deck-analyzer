const SCRYFALL_COLLECTION_URL = "https://api.scryfall.com/cards/collection";
const SPELLBOOK_COMBOS_URL =
  "https://backend.commanderspellbook.com/find-my-combos?format=json";
const SPELLBOOK_BRACKET_URL =
  "https://backend.commanderspellbook.com/estimate-bracket?format=json";

const KNOWN_WINCONS = [
  "Aetherflux Reservoir",
  "Approach of the Second Sun",
  "Demonic Consultation",
  "Jace, Wielder of Mysteries",
  "Laboratory Maniac",
  "Tainted Pact",
  "Thassa's Oracle",
  "Walking Ballista"
];

const GIFTED_EXTRA_TURN_CARD_NAMES = new Set([
  "perch protection"
]);

const SECTION_HEADERS = new Map([
  ["commander", "commanders"],
  ["commanders", "commanders"],
  ["main", "main"],
  ["mainboard", "main"],
  ["deck", "main"]
]);

const BRACKET_TAGS = {
  E: { level: 1, name: "Exhibition" },
  C: { level: 2, name: "Core" },
  U: { level: 3, name: "Upgraded" },
  O: { level: 4, name: "Optimized" },
  R: { level: 5, name: "cEDH / Ruthless" }
};

const STRICT_BRACKET_RESTRICTIONS = [
  {
    level: 1,
    restrictions: [
      { label: "No Game Changers", test: ({ gameChangers }) => gameChangers.length === 0 },
      { label: "No Mass Land Denial", test: ({ hasMassLandDenial }) => !hasMassLandDenial },
      { label: "No Extra Turns", test: ({ hasExtraTurns }) => !hasExtraTurns },
      { label: "No 2-card combos", test: ({ twoCardCombos }) => twoCardCombos.length === 0 }
    ]
  },
  {
    level: 2,
    restrictions: [
      { label: "No Game Changers", test: ({ gameChangers }) => gameChangers.length === 0 },
      { label: "No Mass Land Denial", test: ({ hasMassLandDenial }) => !hasMassLandDenial },
      { label: "No Chaining Extra Turns", test: ({ hasChainingExtraTurns }) => !hasChainingExtraTurns },
      { label: "No 2-card combos", test: ({ twoCardCombos }) => twoCardCombos.length === 0 }
    ]
  },
  {
    level: 3,
    restrictions: [
      { label: "0-3 Game Changers", test: ({ gameChangers }) => gameChangers.length <= 3 },
      { label: "No Mass Land Denial", test: ({ hasMassLandDenial }) => !hasMassLandDenial },
      { label: "No Chaining Extra Turns", test: ({ hasChainingExtraTurns }) => !hasChainingExtraTurns },
      {
        label: "No 2-card combos achievable before turn 6",
        test: ({ fastTwoCardCombos }) => fastTwoCardCombos.length === 0
      }
    ]
  }
];

const SYNERGY_THEMES = [
  {
    id: "artifacts",
    label: "Artifacts",
    patterns: [/artifact/iu, /treasure/iu, /clue/iu, /food/iu, /vehicle/iu]
  },
  {
    id: "tokens",
    label: "Tokens",
    patterns: [/create .* token/iu, /\btokens?\b/iu, /populate/iu]
  },
  {
    id: "counters",
    label: "Counters",
    patterns: [/\+1\/\+1 counter/iu, /counter on/iu, /proliferate/iu]
  },
  {
    id: "graveyard",
    label: "Graveyard",
    patterns: [/graveyard/iu, /mill/iu, /surveil/iu, /return .* card .* graveyard/iu]
  },
  {
    id: "spellslinger",
    label: "Instants and sorceries",
    patterns: [/instant or sorcery/iu, /copy .* spell/iu, /magecraft/iu, /prowess/iu]
  },
  {
    id: "lifegain",
    label: "Lifegain",
    patterns: [/gain .* life/iu, /lifelink/iu, /whenever .* gain life/iu]
  },
  {
    id: "sacrifice",
    label: "Sacrifice",
    patterns: [/sacrifice/iu, /\bdies\b/iu, /whenever .* dies/iu]
  },
  {
    id: "lands",
    label: "Lands",
    patterns: [/landfall/iu, /land enters/iu, /play an additional land/iu, /search .* land/iu]
  },
  {
    id: "enchantments",
    label: "Enchantments",
    patterns: [/enchantment/iu, /aura/iu, /constellation/iu]
  },
  {
    id: "equipment",
    label: "Equipment",
    patterns: [/equipment/iu, /equipped creature/iu, /attach/iu]
  },
  {
    id: "card-draw",
    label: "Card draw",
    patterns: [/draw (a|two|three|x|\d+)/iu, /whenever .* draw/iu]
  }
];

const PROFILE_DETECTORS = [
  {
    id: "control",
    label: "Control",
    test: ({ oracleText }) =>
      /counter target|destroy|exile|return target|tap target|can't attack|can't block/iu.test(oracleText)
  },
  {
    id: "lock",
    label: "Lock/Stax",
    test: ({ oracleText }) =>
      /can't cast|can't activate|players can't|opponents can't|skip|doesn't untap|more to cast/iu.test(oracleText)
  },
  {
    id: "reanimator",
    label: "Reanimator",
    test: ({ oracleText }) =>
      /return .* from your graveyard .* battlefield|reanimate|graveyard .* battlefield/iu.test(oracleText)
  },
  {
    id: "fast-mana",
    label: "Fast mana",
    test: ({ card, oracleText }) =>
      !card.type_line?.includes("Land") &&
      card.cmc <= 2 &&
      producesMana(oracleText)
  },
  {
    id: "tutored",
    label: "Tutored",
    test: ({ oracleText }) =>
      /search your library/iu.test(oracleText) && !/basic land|land card/iu.test(oracleText)
  },
  {
    id: "graveyard",
    label: "Graveyard",
    test: ({ oracleText }) => /graveyard|mill|surveil|escape|flashback|delve/iu.test(oracleText)
  },
  {
    id: "combo",
    label: "Combo",
    test: ({ oracleText }) =>
      /copy .*spell|untap|whenever you cast|storm|magecraft|you win the game/iu.test(oracleText)
  },
  {
    id: "tokens",
    label: "Tokens",
    test: ({ oracleText }) => /create .* token|\btokens?\b|populate/iu.test(oracleText)
  },
  {
    id: "combat",
    label: "Combat",
    test: ({ oracleText }) =>
      /attacks|combat damage|double strike|trample|haste|vigilance|menace/iu.test(oracleText)
  }
];

export function parseDeckText(deckText) {
  const cards = [];
  let section = "main";

  for (const rawLine of deckText.split(/\r?\n/)) {
    const trimmedLine = rawLine.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const normalizedHeader = trimmedLine
      .replace(/:$/, "")
      .trim()
      .toLowerCase();

    if (SECTION_HEADERS.has(normalizedHeader)) {
      section = SECTION_HEADERS.get(normalizedHeader);
      continue;
    }

    const parsedCard = parseDeckLine(trimmedLine, section);

    if (parsedCard) {
      cards.push(parsedCard);
    }
  }

  return mergeDuplicateCards(cards);
}

function parseDeckLine(line, section) {
  const withoutComment = line.split(/\s+\/\/\s+/)[0].trim();
  const withoutSetCode = withoutComment
    .replace(/\s+\[[^\]]+\]\s*$/u, "")
    .replace(/\s+\([^)]+\)\s*\d*\s*$/u, "")
    .trim();
  const match = withoutSetCode.match(/^(?:(\d+)\s*x?\s+)?(.+?)$/iu);

  if (!match) {
    return null;
  }

  const quantity = Number.parseInt(match[1] ?? "1", 10);
  const name = match[2]
    .replace(/\s+\*.*$/u, "")
    .replace(/\s+#.*$/u, "")
    .trim();

  if (!name || Number.isNaN(quantity)) {
    return null;
  }

  return {
    name,
    quantity,
    zone: section
  };
}

function mergeDuplicateCards(cards) {
  const mergedCards = new Map();

  for (const card of cards) {
    const key = card.name.toLowerCase();
    const existingCard = mergedCards.get(key);

    if (existingCard) {
      existingCard.quantity += card.quantity;
      existingCard.zone =
        existingCard.zone === "commanders" || card.zone === "commanders"
          ? "commanders"
          : "main";
    } else {
      mergedCards.set(key, { ...card });
    }
  }

  return [...mergedCards.values()];
}

export async function analyzeDeck({ commanderName = "", deckText = "" }) {
  const cleanCommanderName = commanderName.trim();
  const cleanDeckText = deckText.trim();

  if (!cleanCommanderName) {
    const error = new Error("Please enter your commander first.");
    error.statusCode = 400;
    throw error;
  }

  if (!cleanDeckText) {
    const error = new Error("Please paste a decklist first.");
    error.statusCode = 400;
    throw error;
  }

  const deckCards = withCommanderCard(parseDeckText(cleanDeckText), cleanCommanderName);

  if (deckCards.length === 0) {
    const error = new Error("I could not find any cards in that decklist yet.");
    error.statusCode = 400;
    throw error;
  }

  const scryfallCards = await fetchScryfallCards(deckCards);
  const spellbookCardList = buildSpellbookCardList(deckCards, scryfallCards.cards);
  const [spellbookCombos, baselineBracket] = await Promise.all([
    fetchSpellbookCombos(spellbookCardList),
    fetchBaselineBracket(spellbookCardList, scryfallCards.cards)
  ]);
  const stats = buildDeckStats(deckCards, scryfallCards.cards, spellbookCombos);
  const commander = findCommander(deckCards, scryfallCards.cards, cleanCommanderName);
  const wincons = findWincons(scryfallCards.cards, spellbookCombos);
  const synergyAnalysis = analyzeSynergy({
    commander,
    deckCards,
    scryfallCards: scryfallCards.cards,
    stats
  });
  const deckProfile = analyzeDeckProfile({
    deckCards,
    scryfallCards: scryfallCards.cards,
    stats,
    spellbookCombos
  });
  const enrichedCombos = mergeComboDetails(
    spellbookCombos.included,
    baselineBracket.combos
  );
  const bracketAnalysis = analyzeBracket({
    bracketEstimate: baselineBracket,
    spellbookCombos,
    stats,
    synergyAnalysis
  });

  return {
    commander,
    deckName: `${commander} Commander deck`,
    source: "Pasted list",
    deckStats: [
      { label: "Cards", value: String(stats.totalCards) },
      { label: "Lands", value: String(stats.lands) },
      { label: "Combos", value: String(spellbookCombos.included.length) },
      { label: "Synergy", value: `${synergyAnalysis.score}` }
    ],
    combos: enrichedCombos.slice(0, 8),
    wincons,
    bracketAnalysis,
    synergyAnalysis,
    deckProfile,
    notes: buildNotes(stats, spellbookCombos, scryfallCards.notFound),
    cardIssues: scryfallCards.notFound
  };
}

function mergeComboDetails(combos, bracketCombos) {
  const detailsById = new Map(
    bracketCombos.map((combo) => [combo.spellbookId, combo])
  );

  return combos.map((combo) => ({
    ...combo,
    ...detailsById.get(combo.spellbookId)
  }));
}

function withCommanderCard(deckCards, commanderName) {
  const existingCommander = deckCards.find(
    (card) =>
      card.zone === "commanders" ||
      card.name.toLowerCase() === commanderName.toLowerCase()
  );

  if (existingCommander) {
    existingCommander.zone = "commanders";
    existingCommander.quantity = 1;
    return deckCards;
  }

  return [
    { name: commanderName, quantity: 1, zone: "commanders" },
    ...deckCards
  ];
}

async function fetchScryfallCards(deckCards) {
  const uniqueNames = [...new Set(deckCards.map((card) => card.name))];
  const chunks = chunkArray(uniqueNames, 75);
  const foundCards = [];
  const notFound = [];

  for (const chunk of chunks) {
    const response = await fetch(SCRYFALL_COLLECTION_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "mtg-deck-analyzer/0.0.0"
      },
      body: JSON.stringify({
        identifiers: chunk.map((name) => ({ name }))
      })
    });

    if (!response.ok) {
      const error = new Error("Scryfall card lookup failed.");
      error.statusCode = 502;
      throw error;
    }

    const data = await response.json();
    foundCards.push(...(data.data ?? []));
    notFound.push(...(data.not_found ?? []));
  }

  return {
    cards: foundCards,
    notFound: notFound.map((entry) => entry.name ?? JSON.stringify(entry))
  };
}

function buildSpellbookCardList(deckCards, scryfallCards) {
  const nameByLowercase = new Map(
    scryfallCards.map((card) => [card.name.toLowerCase(), card.name])
  );
  const spellbookCardList = {
    main: [],
    commanders: []
  };

  for (const card of deckCards) {
    const entry = {
      card: nameByLowercase.get(card.name.toLowerCase()) ?? card.name,
      quantity: card.quantity
    };

    if (card.zone === "commanders") {
      spellbookCardList.commanders.push(entry);
    } else {
      spellbookCardList.main.push(entry);
    }
  }

  return spellbookCardList;
}

async function fetchSpellbookCombos(spellbookCardList) {
  if (
    spellbookCardList.main.length === 0 &&
    spellbookCardList.commanders.length === 0
  ) {
    return { included: [], almostIncluded: [] };
  }

  const response = await fetch(SPELLBOOK_COMBOS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "mtg-deck-analyzer/0.0.0"
    },
    body: JSON.stringify(spellbookCardList)
  });

  if (!response.ok) {
    const error = new Error("Commander Spellbook combo lookup failed.");
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();
  const results = data.results ?? {};

  return {
    included: normalizeCombos(results.included ?? []),
    almostIncluded: normalizeCombos(results.almostIncluded ?? [])
  };
}

function normalizeCombos(combos) {
  return combos.map((combo) => ({
    name: combo.uses
      ?.map((use) => use.card?.name)
      .filter(Boolean)
      .join(" + "),
    result:
      combo.produces
        ?.map((produce) => produce.feature?.name)
        .filter(Boolean)
        .join(", ") || combo.description,
    description: combo.description,
    manaNeeded: combo.manaNeeded,
    prerequisites: combo.notablePrerequisites,
    spellbookId: combo.id,
    bracketTag: combo.bracketTag,
    speed: combo.speed,
    definitelyTwoCard: combo.definitelyTwoCard,
    lock: combo.lock,
    extraTurn: combo.extraTurn,
    massLandDenial: combo.massLandDenial,
    skipTurns: combo.skipTurns
  }));
}

async function fetchBaselineBracket(spellbookCardList, scryfallCards) {
  const response = await fetch(SPELLBOOK_BRACKET_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "mtg-deck-analyzer/0.0.0"
    },
    body: JSON.stringify(spellbookCardList)
  });

  if (!response.ok) {
    const error = new Error("Commander bracket estimate failed.");
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();
  const flaggedCards = data.cards ?? [];
  const scryfallByName = new Map(
    scryfallCards.map((card) => [card.name.toLowerCase(), card])
  );
  const normalizedFlaggedCards = flaggedCards.map((entry) =>
    normalizeBracketCardFlags(entry, scryfallByName)
  );

  return {
    tag: data.bracketTag,
    label: formatBracket(data.bracketTag),
    gameChangers: normalizedFlaggedCards
      .filter((entry) => entry.gameChanger)
      .map((entry) => entry.card?.name)
      .filter(Boolean),
    flaggedCards: normalizedFlaggedCards
      .filter(
        (entry) =>
          entry.banned ||
          entry.gameChanger ||
          entry.massLandDenial ||
          entry.extraTurn
      )
      .map((entry) => ({
        name: entry.card?.name,
        banned: entry.banned,
        gameChanger: entry.gameChanger,
        massLandDenial: entry.massLandDenial,
        extraTurn: entry.extraTurn
      }))
      .filter((entry) => entry.name),
    combos: normalizeBracketCombos(data.combos ?? [])
  };
}

function normalizeBracketCardFlags(entry, scryfallByName) {
  const cardName = entry.card?.name ?? "";
  const scryfallCard = scryfallByName.get(cardName.toLowerCase());

  return {
    ...entry,
    extraTurn:
      entry.extraTurn &&
      !giftsExtraTurnToAnotherPlayer(cardName, scryfallCard)
  };
}

function giftsExtraTurnToAnotherPlayer(cardName, scryfallCard) {
  const normalizedName = cardName.toLowerCase();

  if (GIFTED_EXTRA_TURN_CARD_NAMES.has(normalizedName)) {
    return true;
  }

  const oracleText = scryfallCard?.oracle_text ?? "";

  return (
    /(?:target|chosen|that) (?:opponent|player).*takes? an extra turn/iu.test(
      oracleText
    ) && !/you take an extra turn/iu.test(oracleText)
  );
}

function normalizeBracketCombos(combos) {
  return combos.map((entry) => ({
    ...normalizeCombos([entry.combo])[0],
    relevant: entry.relevant,
    borderlineRelevant: entry.borderlineRelevant,
    arguablyTwoCard: entry.arguablyTwoCard,
    definitelyTwoCard: entry.definitelyTwoCard,
    speed: entry.speed,
    lock: entry.lock,
    extraTurn: entry.extraTurn,
    massLandDenial: entry.massLandDenial,
    skipTurns: entry.skipTurns
  }));
}

function analyzeBracket({ bracketEstimate, spellbookCombos, stats, synergyAnalysis }) {
  const estimateCombos = bracketEstimate.combos.length
    ? bracketEstimate.combos
    : spellbookCombos.included;
  const strictBaseline = classifyStrictBaseline({
    ...bracketEstimate,
    combos: estimateCombos
  });
  const realistic = classifyRealisticBracket({
    bracketEstimate,
    strictBaseline,
    combos: estimateCombos,
    spellbookCombos,
    stats,
    synergyAnalysis
  });

  return {
    baseline: strictBaseline.bracket,
    realistic: realistic.bracket,
    estimate: bracketFromTag(bracketEstimate.tag),
    pressure: realistic.bracket.level - strictBaseline.bracket.level,
    reasons: [
      ...strictBaseline.reasons,
      ...realistic.reasons
    ],
    flaggedCards: bracketEstimate.flaggedCards
  };
}

function classifyStrictBaseline(bracketFacts) {
  const facts = buildStrictBracketFacts(bracketFacts);
  const eligibleBracket = STRICT_BRACKET_RESTRICTIONS.find((bracket) =>
    bracket.restrictions.every((restriction) => restriction.test(facts))
  );
  const baselineLevel = eligibleBracket?.level ?? 4;
  const reasons = buildStrictBaselineReasons(facts, baselineLevel);

  return {
    bracket: bracketFromLevel(baselineLevel),
    reasons
  };
}

function buildStrictBracketFacts({ flaggedCards, gameChangers, combos }) {
  const twoCardCombos = combos.filter(
    (combo) => combo.definitelyTwoCard || combo.arguablyTwoCard
  );
  const fastTwoCardCombos = twoCardCombos.filter(
    (combo) => (combo.speed ?? 99) < 6
  );
  const extraTurnCards = flaggedCards.filter((card) => card.extraTurn);
  const extraTurnCombos = combos.filter(
    (combo) => combo.extraTurn || combo.skipTurns
  );

  return {
    gameChangers,
    flaggedCards,
    combos,
    twoCardCombos,
    fastTwoCardCombos,
    hasMassLandDenial:
      flaggedCards.some((card) => card.massLandDenial) ||
      combos.some((combo) => combo.massLandDenial),
    hasExtraTurns: extraTurnCards.length > 0 || extraTurnCombos.length > 0,
    hasChainingExtraTurns:
      extraTurnCards.length > 1 ||
      extraTurnCombos.some((combo) => combo.extraTurn || combo.skipTurns)
  };
}

function buildStrictBaselineReasons(facts, baselineLevel) {
  const reasons = [`Strict baseline: qualifies for bracket ${baselineLevel} under the supplied restrictions.`];

  if (facts.gameChangers.length > 0) {
    reasons.push(
      `Strict baseline: ${facts.gameChangers.length} Game Changer card(s): ${facts.gameChangers
        .slice(0, 4)
        .join(", ")}.`
    );
  }

  if (facts.hasMassLandDenial) {
    reasons.push("Strict baseline: mass land denial is present.");
  }

  if (facts.hasExtraTurns) {
    reasons.push("Strict baseline: extra-turn effects are present.");
  }

  if (facts.hasChainingExtraTurns) {
    reasons.push("Strict baseline: chained extra-turn patterns are present.");
  }

  if (facts.twoCardCombos.length > 0) {
    reasons.push(
      `Strict baseline: ${facts.twoCardCombos.length} two-card combo(s) found.`
    );
  }

  if (facts.fastTwoCardCombos.length > 0) {
    reasons.push(
      `Strict baseline: ${facts.fastTwoCardCombos.length} two-card combo(s) can be achieved before turn 6.`
    );
  }

  return reasons;
}

function classifyRealisticBracket({
  bracketEstimate,
  strictBaseline,
  combos,
  spellbookCombos,
  stats,
  synergyAnalysis
}) {
  const reasons = [
    `Realistic read starts from Commander Spellbook's estimate: ${formatBracket(bracketEstimate.tag)}.`
  ];
  let realisticLevel = Math.max(
    strictBaseline.bracket.level,
    bracketFromTag(bracketEstimate.tag).level
  );

  const fastestCombo = combos
    .filter((combo) => Number.isFinite(combo.speed))
    .sort((a, b) => a.speed - b.speed)[0];
  const completeComboCount = spellbookCombos.included.length;

  if (fastestCombo) {
    reasons.push(
      `Fastest complete combo is ${fastestCombo.name} at Spellbook speed ${fastestCombo.speed}.`
    );
  }

  if (fastestCombo?.definitelyTwoCard && fastestCombo.speed <= 3) {
    realisticLevel = Math.max(realisticLevel, 5);
    reasons.push("Realistic read: very fast two-card wins push the deck toward bracket 5.");
  } else if (fastestCombo?.definitelyTwoCard && fastestCombo.speed <= 5) {
    realisticLevel = Math.max(realisticLevel, 4);
    reasons.push("Realistic read: fast two-card wins push the deck toward bracket 4+.");
  } else if (fastestCombo && fastestCombo.speed <= 7) {
    realisticLevel = Math.max(realisticLevel, 3);
    reasons.push("Realistic read: combo speed is practical enough to matter in normal games.");
  }

  if (completeComboCount >= 5) {
    realisticLevel = Math.max(realisticLevel, 4);
    reasons.push(`${completeComboCount} complete combos increase practical consistency.`);
  } else if (completeComboCount >= 2) {
    realisticLevel = Math.max(realisticLevel, 3);
    reasons.push(`${completeComboCount} complete combos create multiple live win lines.`);
  }

  if (stats.ramp >= 12 && stats.draw >= 10 && stats.averageManaValue <= 3.2) {
    realisticLevel = Math.max(realisticLevel, 4);
    reasons.push("Realistic read: low curve with dense ramp and draw makes combos easier to assemble quickly.");
  }

  if (
    synergyAnalysis.score >= 90 &&
    stats.ramp >= 10 &&
    stats.draw >= 8 &&
    stats.averageManaValue <= 3.4
  ) {
    realisticLevel = Math.max(realisticLevel, 4);
    reasons.push(
      `Realistic read: exceptional synergy (${synergyAnalysis.score}) plus strong ramp/draw efficiency increases practical power.`
    );
  } else if (synergyAnalysis.score >= 80) {
    realisticLevel = Math.max(realisticLevel, 3);
    reasons.push(
      `Realistic read: strong card synergy (${synergyAnalysis.score}) can make the deck play above its baseline.`
    );
  }

  if (
    synergyAnalysis.score >= 90 &&
    (completeComboCount >= 3 || fastestCombo?.speed <= 5)
  ) {
    realisticLevel = Math.max(realisticLevel, 5);
    reasons.push("Realistic read: exceptional synergy plus fast or dense combo lines pushes toward metagame-level performance.");
  }

  return {
    bracket: bracketFromLevel(realisticLevel),
    reasons
  };
}

function bracketFromTag(tag) {
  const bracket = BRACKET_TAGS[tag] ?? { level: 2, name: `Bracket ${tag ?? "?"}` };

  return {
    tag,
    ...bracket,
    label: `${bracket.level} - ${bracket.name}`
  };
}

function bracketFromLevel(level) {
  const tag = Object.entries(BRACKET_TAGS).find(
    ([, bracket]) => bracket.level === level
  )?.[0];

  return bracketFromTag(tag);
}

function formatBracket(tag) {
  return bracketFromTag(tag).label;
}

function buildDeckStats(deckCards, scryfallCards) {
  const quantityByName = new Map(
    deckCards.map((card) => [card.name.toLowerCase(), card.quantity])
  );
  const totalCards = deckCards.reduce((total, card) => total + card.quantity, 0);
  let lands = 0;
  let ramp = 0;
  let draw = 0;
  let removal = 0;
  let totalManaValue = 0;
  let totalNonlandCards = 0;
  const curve = {
    zeroToOne: 0,
    two: 0,
    three: 0,
    four: 0,
    fivePlus: 0
  };

  for (const card of scryfallCards) {
    const quantity = quantityByName.get(card.name.toLowerCase()) ?? 1;
    const typeLine = card.type_line ?? "";
    const oracleText = card.oracle_text ?? "";

    if (typeLine.includes("Land")) {
      lands += quantity;
    } else {
      const manaValue = card.cmc ?? 0;
      totalManaValue += manaValue * quantity;
      totalNonlandCards += quantity;

      if (manaValue <= 1) {
        curve.zeroToOne += quantity;
      } else if (manaValue === 2) {
        curve.two += quantity;
      } else if (manaValue === 3) {
        curve.three += quantity;
      } else if (manaValue === 4) {
        curve.four += quantity;
      } else {
        curve.fivePlus += quantity;
      }
    }

    if (producesMana(oracleText) || oracleText.match(/search your library.*land/iu)) {
      ramp += quantity;
    }

    if (oracleText.match(/draw (a|two|three|x|\d+)/iu)) {
      draw += quantity;
    }

    if (oracleText.match(/destroy|exile|counter target|return target/iu)) {
      removal += quantity;
    }
  }

  return {
    totalCards,
    lands,
    ramp,
    draw,
    removal,
    curve,
    totalNonlandCards,
    averageManaValue: totalNonlandCards
      ? totalManaValue / totalNonlandCards
      : 0
  };
}

function producesMana(oracleText) {
  return /add (?:\{|one|two|three|x|an amount|any amount|mana)|treasure/iu.test(
    oracleText
  );
}

function analyzeSynergy({ commander, deckCards, scryfallCards, stats }) {
  const quantityByName = new Map(
    deckCards.map((card) => [card.name.toLowerCase(), card.quantity])
  );
  const commanderCard = scryfallCards.find(
    (card) => card.name.toLowerCase() === commander.toLowerCase()
  );
  const deckOnlyCards = scryfallCards.filter(
    (card) => card.name.toLowerCase() !== commander.toLowerCase()
  );
  const commanderThemes = commanderCard
    ? classifyCardThemes(commanderCard)
    : [];
  const themeCounts = new Map(
    SYNERGY_THEMES.map((theme) => [
      theme.id,
      {
        id: theme.id,
        label: theme.label,
        count: 0,
        cards: []
      }
    ])
  );

  for (const card of deckOnlyCards) {
    const quantity = quantityByName.get(card.name.toLowerCase()) ?? 1;
    const cardThemes = classifyCardThemes(card);

    for (const themeId of cardThemes) {
      const themeCount = themeCounts.get(themeId);

      if (themeCount) {
        themeCount.count += quantity;
        themeCount.cards.push(card.name);
      }
    }
  }

  const topThemes = [...themeCounts.values()]
    .filter((theme) => theme.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((theme) => ({
      ...theme,
      cards: [...new Set(theme.cards)].slice(0, 6)
    }));
  const commanderThemeDetails = commanderThemes
    .map((themeId) => themeCounts.get(themeId))
    .filter(Boolean)
    .map((theme) => ({
      ...theme,
      cards: [...new Set(theme.cards)].slice(0, 6)
    }));
  const commanderSupportCount = commanderThemeDetails.reduce(
    (total, theme) => total + theme.count,
    0
  );
  const strongestThemeCount = topThemes[0]?.count ?? 0;
  const score = scoreSynergy({
    commanderThemes,
    commanderSupportCount,
    strongestThemeCount,
    stats
  });

  return {
    score,
    grade: gradeSynergy(score),
    commanderThemes: commanderThemeDetails,
    topThemes,
    highlights: buildSynergyHighlights({
      commander,
      commanderThemes,
      commanderThemeDetails,
      topThemes,
      stats
    }),
    concerns: buildSynergyConcerns({
      commanderThemes,
      commanderSupportCount,
      stats
    })
  };
}

function analyzeDeckProfile({ deckCards, scryfallCards, stats, spellbookCombos }) {
  const quantityByName = new Map(
    deckCards.map((card) => [card.name.toLowerCase(), card.quantity])
  );
  const nonCommanderCards = scryfallCards.filter((card) => {
    const deckEntry = deckCards.find(
      (entry) => entry.name.toLowerCase() === card.name.toLowerCase()
    );
    return deckEntry?.zone !== "commanders";
  });
  const profileCounts = new Map(
    PROFILE_DETECTORS.map((detector) => [
      detector.id,
      {
        id: detector.id,
        label: detector.label,
        count: 0,
        cards: []
      }
    ])
  );

  for (const card of nonCommanderCards) {
    const quantity = quantityByName.get(card.name.toLowerCase()) ?? 1;
    const oracleText = card.oracle_text ?? "";

    for (const detector of PROFILE_DETECTORS) {
      if (detector.test({ card, oracleText })) {
        const profile = profileCounts.get(detector.id);
        profile.count += quantity;
        profile.cards.push(card.name);
      }
    }
  }

  const fingerprints = [...profileCounts.values()]
    .filter((profile) => profile.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((profile) => ({
      ...profile,
      cards: [...new Set(profile.cards)].slice(0, 5)
    }));
  const fastestComboSpeed = spellbookCombos.included
    .map((combo) => combo.speed)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  const metrics = {
    consistency: scoreConsistency({ stats, profileCounts }),
    efficiency: scoreEfficiency(stats),
    interaction: scoreInteraction({ stats, profileCounts }),
    winConditions: scoreWinConditions({ spellbookCombos, profileCounts }),
    curve: scoreCurve(stats),
    speed: scoreSpeed({ stats, fastestComboSpeed, profileCounts }),
    ramp: scoreRamp(stats)
  };

  return {
    metrics,
    curve: {
      ...stats.curve,
      averageManaValue: Number(stats.averageManaValue.toFixed(2))
    },
    fingerprints,
    summary: buildProfileSummary({ metrics, fingerprints, fastestComboSpeed })
  };
}

function scoreConsistency({ stats, profileCounts }) {
  const draw = Math.min(35, stats.draw * 3);
  const tutors = Math.min(25, (profileCounts.get("tutored")?.count ?? 0) * 5);
  const curve = stats.averageManaValue <= 3.2 ? 20 : stats.averageManaValue <= 4 ? 12 : 5;
  const ramp = Math.min(20, stats.ramp * 2);

  return clampScore(draw + tutors + curve + ramp);
}

function scoreEfficiency(stats) {
  const averageManaValueScore =
    stats.averageManaValue <= 2.6
      ? 45
      : stats.averageManaValue <= 3.2
        ? 35
        : stats.averageManaValue <= 4
          ? 22
          : 10;
  const earlyCurve =
    stats.totalNonlandCards > 0
      ? ((stats.curve.zeroToOne + stats.curve.two + stats.curve.three) /
          stats.totalNonlandCards) *
        35
      : 0;
  const ramp = Math.min(20, stats.ramp * 2);

  return clampScore(averageManaValueScore + earlyCurve + ramp);
}

function scoreInteraction({ stats, profileCounts }) {
  const removal = Math.min(55, stats.removal * 5);
  const control = Math.min(25, (profileCounts.get("control")?.count ?? 0) * 3);
  const lock = Math.min(20, (profileCounts.get("lock")?.count ?? 0) * 4);

  return clampScore(removal + control + lock);
}

function scoreWinConditions({ spellbookCombos, profileCounts }) {
  const comboScore = Math.min(55, spellbookCombos.included.length * 14);
  const nearMissScore = Math.min(15, spellbookCombos.almostIncluded.length * 2);
  const combatScore = Math.min(15, (profileCounts.get("combat")?.count ?? 0) * 2);
  const comboTextScore = Math.min(15, (profileCounts.get("combo")?.count ?? 0) * 3);

  return clampScore(comboScore + nearMissScore + combatScore + comboTextScore);
}

function scoreCurve(stats) {
  if (stats.totalNonlandCards === 0) {
    return 0;
  }

  const earlyCurveRatio =
    (stats.curve.zeroToOne + stats.curve.two + stats.curve.three) /
    stats.totalNonlandCards;
  const topHeavyPenalty =
    (stats.curve.fivePlus / stats.totalNonlandCards) * 35;
  const averageScore =
    stats.averageManaValue <= 3
      ? 45
      : stats.averageManaValue <= 3.6
        ? 35
        : stats.averageManaValue <= 4.2
          ? 22
          : 10;

  return clampScore(averageScore + earlyCurveRatio * 55 - topHeavyPenalty);
}

function scoreSpeed({ stats, fastestComboSpeed, profileCounts }) {
  const comboSpeed =
    fastestComboSpeed <= 3
      ? 45
      : fastestComboSpeed <= 5
        ? 35
        : fastestComboSpeed <= 7
          ? 20
          : 0;
  const fastMana = Math.min(30, (profileCounts.get("fast-mana")?.count ?? 0) * 5);
  const ramp = Math.min(15, stats.ramp * 1.5);
  const curve = stats.averageManaValue <= 3.2 ? 10 : 0;

  return clampScore(comboSpeed + fastMana + ramp + curve);
}

function scoreRamp(stats) {
  return clampScore((stats.ramp / 12) * 100);
}

function buildProfileSummary({ metrics, fingerprints, fastestComboSpeed }) {
  const topMetric = Object.entries(metrics).sort((a, b) => b[1] - a[1])[0];
  const topFingerprint = fingerprints[0];
  const summary = [];

  if (topMetric) {
    summary.push(`Highest identifier: ${formatMetricName(topMetric[0])} (${topMetric[1]}).`);
  }

  if (topFingerprint) {
    summary.push(
      `Primary fingerprint: ${topFingerprint.label} with ${topFingerprint.count} matching card(s).`
    );
  }

  if (Number.isFinite(fastestComboSpeed)) {
    summary.push(`Fastest known combo speed: ${fastestComboSpeed}.`);
  }

  return summary;
}

function formatMetricName(metricName) {
  return metricName.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase());
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyCardThemes(card) {
  const text = `${card.name} ${card.type_line ?? ""} ${card.oracle_text ?? ""}`;

  return SYNERGY_THEMES.filter((theme) =>
    theme.patterns.some((pattern) => pattern.test(text))
  ).map((theme) => theme.id);
}

function scoreSynergy({
  commanderThemes,
  commanderSupportCount,
  strongestThemeCount,
  stats
}) {
  let score = 25;

  if (commanderThemes.length === 0) {
    score += Math.min(20, strongestThemeCount * 1.5);
  } else {
    score += Math.min(30, commanderSupportCount * 1.8);
  }

  score += Math.min(15, strongestThemeCount);

  if (stats.ramp >= 8) score += 5;
  if (stats.draw >= 8) score += 5;
  if (stats.removal >= 6) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function gradeSynergy(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Moderate";
  if (score >= 40) return "Light";
  return "Low";
}

function buildSynergyHighlights({
  commander,
  commanderThemes,
  commanderThemeDetails,
  topThemes,
  stats
}) {
  const highlights = [];

  if (commanderThemeDetails.length > 0) {
    const bestTheme = commanderThemeDetails.sort((a, b) => b.count - a.count)[0];
    highlights.push(
      `${commander} points toward ${bestTheme.label}; ${bestTheme.count} deck card(s) support that theme.`
    );
  } else if (commanderThemes.length === 0 && topThemes.length > 0) {
    highlights.push(
      `No obvious commander text theme was detected, but the deck clusters around ${topThemes[0].label}.`
    );
  }

  for (const theme of topThemes.slice(0, 3)) {
    highlights.push(
      `${theme.label}: ${theme.count} card(s), including ${theme.cards.slice(0, 3).join(", ")}.`
    );
  }

  if (stats.ramp >= 8 && stats.draw >= 8) {
    highlights.push("Ramp and draw support look healthy enough to find synergy pieces consistently.");
  }

  return highlights.length > 0
    ? highlights
    : ["No strong mechanical theme cluster was detected yet."];
}

function buildSynergyConcerns({ commanderThemes, commanderSupportCount, stats }) {
  const concerns = [];

  if (commanderThemes.length > 0 && commanderSupportCount < 8) {
    concerns.push("Commander-facing theme support looks thin.");
  }

  if (stats.ramp < 8) {
    concerns.push("Ramp count may make synergy pieces slower to deploy.");
  }

  if (stats.draw < 8) {
    concerns.push("Card draw count may make synergy pieces harder to find.");
  }

  return concerns;
}

function findCommander(deckCards, scryfallCards, fallbackCommanderName) {
  const commanderEntry = deckCards.find((card) => card.zone === "commanders");

  if (commanderEntry) {
    return commanderEntry.name;
  }

  const legendaryCreature = scryfallCards.find(
    (card) =>
      card.type_line?.includes("Legendary Creature") &&
      card.legalities?.commander === "legal"
  );

  return legendaryCreature?.name ?? fallbackCommanderName;
}

function findWincons(scryfallCards, spellbookCombos) {
  const cardNames = new Set(scryfallCards.map((card) => card.name));
  const knownWincons = KNOWN_WINCONS.filter((name) => cardNames.has(name));
  const comboWincons = spellbookCombos.included
    .flatMap((combo) => combo.result.split(", "))
    .filter(Boolean)
    .slice(0, 6);

  return [...new Set([...knownWincons, ...comboWincons])].slice(0, 8);
}

function buildNotes(stats, spellbookCombos, notFound) {
  const notes = [
    `Scryfall resolved ${stats.totalCards - notFound.length} card entries from the submitted list.`,
    `Commander Spellbook found ${spellbookCombos.included.length} complete combo(s) and ${spellbookCombos.almostIncluded.length} near miss(es).`
  ];

  if (stats.lands < 34) {
    notes.push("Land count looks low for most Commander decks.");
  }

  if (stats.ramp < 8) {
    notes.push("Ramp density may be light; aim for roughly 8-12 ramp effects.");
  }

  if (stats.draw < 8) {
    notes.push("Card draw density may be light; aim for roughly 8-12 repeatable or efficient draw effects.");
  }

  if (notFound.length > 0) {
    notes.push(`Unresolved cards: ${notFound.slice(0, 5).join(", ")}.`);
  }

  return notes;
}

function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
