import EasyStar from 'easystarjs';

type TileCosts = Record<number, number>;

type FindPathRequest = {
  type: 'findPath';
  grid: number[][];
  start: { x: number; y: number };
  end: { x: number; y: number };
  acceptableTiles: number[];
  tileCosts: TileCosts;
  allowDiagonals?: boolean;
  cornerCutting?: boolean;
};

type FindPathResponse = {
  type: 'findPath:result';
  path: { x: number; y: number }[];
  error?: string;
};

function createEasyStarInstance(
  acceptableTiles: number[],
  tileCosts: TileCosts,
  allowDiagonals = true,
  cornerCutting = true
) {
  const easystar = new EasyStar.js();
  if (allowDiagonals) easystar.enableDiagonals();
  if (cornerCutting) easystar.enableCornerCutting();
  easystar.setAcceptableTiles(acceptableTiles);
  Object.entries(tileCosts).forEach(([tileType, cost]) => {
    easystar.setTileCost(Number(tileType), cost);
  });
  return easystar;
}

self.onmessage = (ev: MessageEvent<FindPathRequest>) => {
  const msg = ev.data;
  if (msg.type !== 'findPath') return;

  const easystar = createEasyStarInstance(
    msg.acceptableTiles,
    msg.tileCosts,
    msg.allowDiagonals,
    msg.cornerCutting
  );

  try {
    easystar.setGrid(msg.grid);
    easystar.findPath(msg.start.x, msg.start.y, msg.end.x, msg.end.y, path => {
      const res: FindPathResponse = {
        type: 'findPath:result',
        path: path || []
      };
      // Post result
      (self as unknown as Worker).postMessage(res);
    });
    easystar.calculate();
  } catch (err: unknown) {
    const res: FindPathResponse = {
      type: 'findPath:result',
      path: [],
      error: (err as Error)?.message ?? String(err)
    };
    (self as unknown as Worker).postMessage(res);
  }
};
