const API = process.env.PROPR_API_URL || 'https://api.propr.xyz/v1';
const API_KEY = process.env.PROPR_API_KEY;

function send(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(body));
}

async function propr(path) {
  if (!API_KEY) throw new Error('Missing PROPR_API_KEY');
  const response = await fetch(API + path, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    }
  });

  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }

  if (!response.ok) {
    const message = body?.message || body?.error || ('PROPR HTTP ' + response.status);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return body;
}

function num(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function normalizeAttempt(a) {
  const initialBalance = num(a?.initialBalance, a?.startingBalance, a?.startBalance, a?.accountSize, a?.challengeSize);
  const currentBalance = num(a?.currentBalance, a?.balance, a?.accountBalance);
  const equity = num(a?.equity, a?.currentEquity, a?.accountEquity);

  const profitTarget = num(
    a?.profitTarget,
    a?.targetProfit,
    a?.profitTargetAmount,
    a?.targetAmount
  );

  const dailyLossLimit = num(
    a?.dailyLossLimit,
    a?.maxDailyLoss,
    a?.dailyDrawdownLimit
  );

  const maxLossLimit = num(
    a?.maxLossLimit,
    a?.maximumLoss,
    a?.maxDrawdown,
    a?.overallDrawdownLimit
  );

  return {
    attemptId: pick(a?.id, a?.attemptId),
    accountId: pick(a?.accountId),
    status: pick(a?.status),
    phase: pick(a?.phase, a?.step, a?.stage),
    type: pick(a?.type, a?.challengeType, a?.planName, a?.productName),
    initialBalance,
    currentBalance,
    equity,
    profitTarget,
    dailyLossLimit,
    maxLossLimit,
    createdAt: pick(a?.createdAt, a?.startedAt),
    updatedAt: pick(a?.updatedAt),
  };
}

function normalizeTrade(t) {
  return {
    id: pick(t?.tradeId, t?.id),
    asset: String(pick(t?.asset, t?.base, t?.symbol) || '').toUpperCase() || null,
    side: pick(t?.side, t?.positionSide),
    quantity: num(t?.quantity, t?.size, t?.filledAmount),
    price: num(t?.price, t?.fillPrice, t?.averagePrice),
    realizedPnl: num(t?.realizedPnl, t?.pnl),
    fee: num(t?.fee),
    timestamp: pick(t?.executedAt, t?.closedAt, t?.updatedAt, t?.createdAt)
  };
}

function normalizePosition(p) {
  return {
    id: pick(p?.positionId, p?.id),
    asset: String(pick(p?.asset, p?.base, p?.symbol) || '').toUpperCase() || null,
    side: pick(p?.positionSide, p?.side),
    quantity: num(p?.quantity, p?.size),
    entryPrice: num(p?.entryPrice, p?.averagePrice),
    unrealizedPnl: num(p?.unrealizedPnl, p?.pnl),
    createdAt: pick(p?.createdAt, p?.openedAt, p?.executedAt)
  };
}

async function getAttempts() {
  try {
    const result = await propr('/challenge-attempts?limit=100&offset=0');
    return result?.data || [];
  } catch (error) {
    const active = await propr('/challenge-attempts?status=active&limit=100&offset=0');
    return active?.data || [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'GET only' });

  try {
    const attempts = await getAttempts();

    const accounts = await Promise.all(attempts.map(async raw => {
      const base = normalizeAttempt(raw);
      const accountId = String(base.accountId || '');

      if (!accountId) {
        return { ...base, trades: [], positions: [], realizedPnl: 0, unrealizedPnl: 0 };
      }

      const [tradesResult, positionsResult] = await Promise.allSettled([
        propr('/accounts/' + encodeURIComponent(accountId) + '/trades?limit=250&offset=0'),
        propr('/accounts/' + encodeURIComponent(accountId) + '/positions?status=open&limit=100&offset=0')
      ]);

      const trades = tradesResult.status === 'fulfilled'
        ? (tradesResult.value?.data || []).map(normalizeTrade)
        : [];

      const positions = positionsResult.status === 'fulfilled'
        ? (positionsResult.value?.data || []).map(normalizePosition)
        : [];

      const realizedPnl = trades.reduce((sum, trade) => sum + (Number(trade.realizedPnl) || 0), 0);
      const unrealizedPnl = positions.reduce((sum, position) => sum + (Number(position.unrealizedPnl) || 0), 0);

      return {
        ...base,
        trades,
        positions,
        realizedPnl,
        unrealizedPnl
      };
    }));

    return send(res, 200, {
      ok: true,
      source: 'PROPR',
      generatedAt: new Date().toISOString(),
      accounts
    });
  } catch (error) {
    console.error('DASHBOARD PROPR ERROR', error?.message || error);
    return send(res, 500, {
      ok: false,
      error: 'Unable to read PROPR',
      detail: error?.message || 'Unknown error'
    });
  }
}
