// =========================================================
//  Pokemon PvP Web — Cloudflare Worker 入口
// =========================================================

import type { Env } from './types';
import { LIMIT_LEAGUES_SHOW, leagues } from './constants';
import { getActiveLeagues } from './utils/cache';
import {
  searchPokemon, getAllPokemonNames, getLeagueRankingData, getMetaAnalysisData,
  analyzeUserBoxTeam, filterGarbage, getTypeQuery, getAllTypeOptions
} from './handlers';
import {
  getAllBoxes, saveBoxes, getAccountNames, setAccountNames,
  getTrashList, addToTrash, removeFromTrash
} from './utils/userdata';
import { loginRedirect, handleCallback, getSession, logout } from './auth';
import { APP_HTML } from './web/app';

// ── 回應工具 ──
function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(init.headers || {}) }
  });
}
const html = (body: string) =>
  new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8" } });
const bad = (msg: string, status = 400) => json({ error: msg }, { status });

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // ───────── 頁面 ─────────
      if (path === "/" && method === "GET") return html(APP_HTML);

      // ───────── 登入 ─────────
      if (path === "/auth/login") return loginRedirect(request, env);
      if (path === "/auth/callback") return handleCallback(request, env);
      if (path === "/auth/logout") return logout(request, env);
      if (path === "/api/me") {
        const session = await getSession(request, env);
        if (!session) return json({ loggedIn: false });
        return json({ loggedIn: true, email: session.email, name: session.name, picture: session.picture });
      }

      // ───────── 公開 API ─────────
      if (path === "/api/search" && method === "GET") {
        const q = url.searchParams.get("q") || "";
        if (q.trim().length < 1) return bad("missing query");
        return json(await searchPokemon(q, env, ctx), {
          headers: { "Cache-Control": "public, max-age=300" }
        });
      }

      if (path === "/api/names" && method === "GET") {
        const names = await getAllPokemonNames(env, ctx);
        return json(names, { headers: { "Cache-Control": "public, max-age=3600" } });
      }

      if (path === "/api/leagues" && method === "GET") {
        const active = await getActiveLeagues();
        return json({
          all: leagues.map(l => ({ id: l.command, name: l.name, cp: l.cp, path: l.path })),
          active
        });
      }

      if (path === "/api/active-leagues" && method === "GET") {
        return json(await getActiveLeagues());
      }

      if (path === "/api/rankings" && method === "GET") {
        const league = url.searchParams.get("league") || "";
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "") || LIMIT_LEAGUES_SHOW, 200);
        const data = await getLeagueRankingData(league, limit, env, ctx);
        if (!data) return bad("unknown league", 404);
        return json(data, { headers: { "Cache-Control": "public, max-age=300" } });
      }

      if (path === "/api/meta" && method === "GET") {
        return json(await getMetaAnalysisData(env, ctx), {
          headers: { "Cache-Control": "public, max-age=300" }
        });
      }

      if (path === "/api/types" && method === "GET") {
        return json(getAllTypeOptions());
      }

      if (path === "/api/type" && method === "GET") {
        const type = url.searchParams.get("type") || "";
        const mode = (url.searchParams.get("mode") === "atk" ? "atk" : "def") as 'atk' | 'def';
        const result = getTypeQuery(type, mode);
        if (!result) return bad("unknown type", 404);
        return json(result);
      }

      // ───────── 受保護 API (需登入) ─────────
      const session = await getSession(request, env);
      const requireAuth = () => session
        ? null
        : json({ error: "unauthorized" }, { status: 401 });

      if (path === "/api/box" && method === "GET") {
        const guard = requireAuth(); if (guard) return guard;
        const cps = [...new Set((await getActiveLeagues()).map(l => l.cp))];
        const cpList = cps.length ? cps : ["1500", "2500", "10000"];
        return json(await getAllBoxes(session!.sub, cpList, env));
      }

      if (path === "/api/box" && method === "POST") {
        const guard = requireAuth(); if (guard) return guard;
        const body = await request.json().catch(() => null) as
          { acct?: number; allData?: Record<string, { box: string[]; favs: string[] }> } | null;
        if (!body || body.acct === undefined || !body.allData) return bad("missing fields");
        await saveBoxes(session!.sub, Number(body.acct), body.allData, env);
        return json({ ok: true });
      }

      if (path === "/api/analyze" && method === "POST") {
        const guard = requireAuth(); if (guard) return guard;
        const body = await request.json().catch(() => null) as
          { leaguePath?: string; team?: string[]; favs?: string[] } | null;
        if (!body?.leaguePath || !Array.isArray(body.team)) return bad("missing fields");
        return json(await analyzeUserBoxTeam(body.leaguePath, body.team, body.favs || [], env, ctx));
      }

      if (path === "/api/clean-box" && method === "POST") {
        const guard = requireAuth(); if (guard) return guard;
        const body = await request.json().catch(() => null) as
          { leaguePath?: string; team?: string[] } | null;
        if (!body?.leaguePath || !Array.isArray(body.team)) return bad("missing fields");
        return json(await filterGarbage(body.leaguePath, body.team, env, ctx));
      }

      if (path === "/api/account-names" && method === "GET") {
        const guard = requireAuth(); if (guard) return guard;
        return json(await getAccountNames(session!.sub, env));
      }

      if (path === "/api/account-names" && method === "POST") {
        const guard = requireAuth(); if (guard) return guard;
        const body = await request.json().catch(() => null) as { names?: string[] } | null;
        if (!body || !Array.isArray(body.names)) return bad("missing names");
        await setAccountNames(session!.sub, body.names, env);
        return json({ ok: true });
      }

      if (path === "/api/trash" && method === "GET") {
        const guard = requireAuth(); if (guard) return guard;
        return json(await getTrashList(session!.sub, env));
      }

      if (path === "/api/trash" && method === "POST") {
        const guard = requireAuth(); if (guard) return guard;
        const body = await request.json().catch(() => null) as
          { add?: string[]; remove?: string[] } | null;
        if (!body) return bad("missing body");
        let list: string[];
        if (Array.isArray(body.remove)) list = await removeFromTrash(session!.sub, body.remove, env);
        else if (Array.isArray(body.add)) list = await addToTrash(session!.sub, body.add, env);
        else return bad("missing add/remove");
        return json(list);
      }

      return new Response("Not Found", { status: 404 });
    } catch (e) {
      console.error(e);
      return json({ error: (e as Error).message }, { status: 500 });
    }
  }
};
