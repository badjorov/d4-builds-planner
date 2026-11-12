// Screenshot rolls can sit above the game-data base range. Nikolay confirmed that
// masterworking and transfiguration do that. The implied uplift is the screenshot
// value divided by the top of the base range. It is recorded here and not applied
// to other items.

export const MASTERWORK_UPLIFT = [
  {
    id: 'leorics-crown',
    stat: 'gem effect',
    actual: 65,
    actualBucket: 'multiplicative',
    base: [35, 50],
    baseBucket: 'multiplicative',
    upliftVsMax: 65 / 50,
    pointsAboveMax: 15
  },
  {
    id: 'gohrs-devastating-grips',
    stat: 'Whirlwind increased damage',
    actual: [98, 117],
    actualBucket: 'multiplicative',
    base: [75, 90],
    baseBucket: null,
    upliftVsMax: 117 / 90,
    upliftVsMin: 98 / 75,
    pointsAboveMax: 27,
    note: 'The file format is a bare %. The screenshot stays stored as [x]. A uniform ×1.30 on 75 would be 97.5. The stored low end is 98.'
  },
  {
    id: 'tibaults-will',
    stat: 'damage while Unstoppable',
    actual: 26,
    actualBucket: 'multiplicative',
    base: [15, 20],
    baseBucket: 'multiplicative',
    upliftVsMax: 26 / 20,
    pointsAboveMax: 6
  }
];

export const MASTERWORK_MARK = 'expected: masterwork/transfigure';
