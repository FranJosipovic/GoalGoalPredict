import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import PredictionPitch, { type PlayerBadge } from "../components/PredictionPitch";
import { getMatchDetail, getMatchPredictions } from "../api/matches";
import { useAuthStore } from "../store/authStore";
import PicksByTeam from "../components/PicksByTeam";
import type { MatchDetail, GroupPredictions } from "../types";

type Tab = "events" | "lineups" | "mypred";
type Side = "home" | "away";

export default function MatchLivePage() {
  const { groupId, matchId } = useParams<{
    groupId: string;
    matchId: string;
  }>();
  const { user } = useAuthStore();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [preds, setPreds] = useState<GroupPredictions | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("events");
  const [lineupSide, setLineupSide] = useState<Side>("home");

  const load = useCallback(async () => {
    if (!matchId || !groupId) return;
    const [m, p] = await Promise.all([
      getMatchDetail(Number(matchId)),
      getMatchPredictions(Number(matchId), groupId).catch(() => null),
    ]);
    setMatch(m);
    setPreds(p);
    setLoading(false);
  }, [matchId, groupId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!match) return;
    const isLive = ["1H", "HT", "2H", "ET", "P"].includes(match.status);
    if (!isLive) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [match, load]);

  if (loading)
    return (
      <Layout showBack>
        <div className="loading-state">
          <span className="loading-ball">⚽</span>
        </div>
      </Layout>
    );
  if (!match)
    return (
      <Layout showBack>
        <div className="empty-state">
          <p>Match not found</p>
        </div>
      </Layout>
    );

  const isLive = ["1H", "HT", "2H", "ET", "P"].includes(match.status);
  const isFinished = ["FT", "AET", "PEN"].includes(match.status);
  const myPred = preds?.predictions.find((p) => p.userId === user?.id) ?? null;

  type Ev = {
    minute: number;
    extraMinute: number | null;
    teamId: number;
    kind: "goal" | "card" | "sub" | "var";
    goalType?: string;
    cardType?: string;
    detail?: string;
    main?: string | null;
    inName?: string | null;
    outName?: string | null;
  };
  const events: Ev[] = [
    ...match.goals.map((g) => ({
      minute: g.minute,
      extraMinute: g.extraMinute,
      teamId: g.teamId,
      kind: "goal" as const,
      goalType: g.goalType,
      main: g.scorerName,
    })),
    ...match.cards.map((c) => ({
      minute: c.minute,
      extraMinute: c.extraMinute,
      teamId: c.teamId,
      kind: "card" as const,
      cardType: c.cardType,
      main: c.playerName,
    })),
    ...match.substitutions.map((s) => ({
      minute: s.minute,
      extraMinute: s.extraMinute,
      teamId: s.teamId,
      kind: "sub" as const,
      inName: s.playerInName,
      outName: s.playerOutName,
    })),
    ...(match.varDecisions ?? []).map((v) => ({
      minute: v.minute,
      extraMinute: v.extraMinute,
      teamId: v.teamId,
      kind: "var" as const,
      detail: v.detail,
      main: v.playerName,
    })),
  ].sort(
    (a, b) =>
      a.minute - b.minute || (a.extraMinute ?? 0) - (b.extraMinute ?? 0),
  );

  // ---- Lineup tab: graphical pitch with goal/card/sub markers ----
  const hasLineup = match.lineup.length > 0;
  const goalsByPlayer = new Map<number, number>();
  const ownGoalsByPlayer = new Map<number, number>();
  for (const g of match.goals) {
    if (g.scorerPlayerId == null) continue;
    const map = g.goalType === "Own Goal" ? ownGoalsByPlayer : goalsByPlayer;
    if (["Normal Goal", "Penalty", "Own Goal"].includes(g.goalType))
      map.set(g.scorerPlayerId, (map.get(g.scorerPlayerId) ?? 0) + 1);
  }
  const yellowIds = new Set(
    match.cards.filter((c) => c.cardType === "Yellow Card" && c.playerId != null).map((c) => c.playerId!),
  );
  const redIds = new Set(
    match.cards.filter((c) => c.cardType === "Red Card" && c.playerId != null).map((c) => c.playerId!),
  );
  const subInIds = new Set(
    match.substitutions.filter((s) => s.playerInId != null).map((s) => s.playerInId!),
  );
  const subOutIds = new Set(
    match.substitutions.filter((s) => s.playerOutId != null).map((s) => s.playerOutId!),
  );

  const lineupBadges = (playerId: number): PlayerBadge[] => {
    const out: PlayerBadge[] = [];
    const g = goalsByPlayer.get(playerId) ?? 0;
    const og = ownGoalsByPlayer.get(playerId) ?? 0;
    if (g) out.push({ icon: "⚽", count: g });
    if (og) out.push({ icon: "🥅", count: og });
    if (yellowIds.has(playerId)) out.push({ icon: "🟨" });
    if (redIds.has(playerId)) out.push({ icon: "🟥" });
    if (subOutIds.has(playerId)) out.push({ icon: "🔻" });
    if (subInIds.has(playerId)) out.push({ icon: "🔺" });
    return out;
  };

  const lineupTeam = lineupSide === "home" ? match.homeTeam : match.awayTeam;
  const xiFor = (teamId: number) =>
    match.lineup.filter((l) => l.teamId === teamId && l.isStarting);
  const benchFor = (teamId: number) =>
    match.lineup.filter((l) => l.teamId === teamId && !l.isStarting);

  return (
    <Layout title="Match" showBack>
      <div className="live-page">
        {/* Score header */}
        <div className="live-scoreboard">
          <div className="live-team">
            <img src={match.homeTeam.logoUrl} className="live-team-logo" alt="" />
            <span className="live-team-name">{match.homeTeam.name}</span>
          </div>
          <div className="live-score-block">
            <div className="live-score-nums">
              <span>{match.homeGoals ?? "-"}</span>
              <span className="live-score-colon">:</span>
              <span>{match.awayGoals ?? "-"}</span>
            </div>
            {isLive && (
              <div className="live-indicator">
                <span className="live-dot" />
                {match.elapsedMinutes}'
              </div>
            )}
            {isFinished && <div className="ft-label">FULL TIME</div>}
          </div>
          <div className="live-team live-team--right">
            <img src={match.awayTeam.logoUrl} className="live-team-logo" alt="" />
            <span className="live-team-name">{match.awayTeam.name}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="match-tabs">
          {([
            ["events", "📋 Events"],
            ["lineups", "👕 Lineups"],
            ["mypred", "🎯 My Pick"],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              className={`match-tab ${tab === t ? "match-tab--active" : ""}`}
              onClick={() => setTab(t)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* TAB: Match events */}
        {tab === "events" && (
          events.length === 0 ? (
            <div className="empty-state"><p>No events yet</p></div>
          ) : (
            <div className="events-timeline">
              {events.map((e, i) => {
                const home = e.teamId === match.homeTeam.id;
                return (
                  <div
                    key={i}
                    className={`ev-row ${home ? "ev-row--home" : "ev-row--away"}`}
                  >
                    <span className="ev-min">
                      {e.minute}
                      {e.extraMinute ? `+${e.extraMinute}` : ""}'
                    </span>
                    <span className="ev-icon">
                      {e.kind === "goal"
                        ? e.goalType === "Penalty"
                          ? "⚽(P)"
                          : e.goalType === "Own Goal"
                            ? "⚽(OG)"
                            : "⚽"
                        : e.kind === "card"
                          ? e.cardType === "Red Card"
                            ? "🟥"
                            : "🟨"
                          : e.kind === "var"
                            ? /disallow|cancel/i.test(e.detail ?? "")
                              ? "❌"
                              : "📺"
                            : e.kind === "sub"
                              ? "🔄"
                              : ""}
                    </span>
                    <div className="ev-text">
                      {e.kind === "sub" ? (
                        <>
                          <span className="ev-in">▲ {e.inName ?? "Unknown"}</span>
                          <span className="ev-out">▼ {e.outName ?? "Unknown"}</span>
                        </>
                      ) : e.kind === "var" ? (
                        <>
                          <span className="ev-main">VAR: {e.detail}</span>
                          {e.main && <span className="ev-out">{e.main}</span>}
                        </>
                      ) : (
                        <span className="ev-main">{e.main ?? "Unknown"}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* TAB: Lineups (graphical) */}
        {tab === "lineups" && (
          !hasLineup ? (
            <div className="empty-state"><p>Lineups not available yet</p></div>
          ) : (
            <div className="lineup-tab">
              <div className="picker-team-switch">
                <button
                  className={`picker-team-btn ${lineupSide === "home" ? "active" : ""}`}
                  onClick={() => setLineupSide("home")}
                >
                  {match.homeTeam.code || match.homeTeam.name}
                </button>
                <button
                  className={`picker-team-btn ${lineupSide === "away" ? "active" : ""}`}
                  onClick={() => setLineupSide("away")}
                >
                  {match.awayTeam.code || match.awayTeam.name}
                </button>
              </div>

              <PredictionPitch
                players={xiFor(lineupTeam.id)}
                bench={benchFor(lineupTeam.id)}
                badgesFor={lineupBadges}
                onPlayerTap={() => {}}
              />

              <div className="lineup-legend">
                <span>⚽ goal</span>
                <span>🟨 / 🟥 card</span>
                <span>🔻 subbed off</span>
                <span>🔺 subbed on</span>
              </div>
            </div>
          )
        )}

        {/* TAB: My prediction */}
        {tab === "mypred" && (
          !myPred ? (
            <div className="empty-state"><p>You didn't predict this match</p></div>
          ) : (
            <div className="my-pred">
              <div className="my-pred-head">
                <span className="section-label">YOUR PREDICTION</span>
                <span className="my-pred-pts">
                  {myPred.projectedPoints}
                  <em>{isFinished ? "pts" : "proj"}</em>
                </span>
              </div>
              <div className="my-pred-score">
                <span>{match.homeTeam.code || match.homeTeam.name}</span>
                <strong>
                  {myPred.predHome} : {myPred.predAway}
                </strong>
                <span>{match.awayTeam.code || match.awayTeam.name}</span>
              </div>
              <PicksByTeam
                scorers={myPred.scorers}
                cards={myPred.cards}
                home={match.homeTeam}
                away={match.awayTeam}
              />
            </div>
          )
        )}
      </div>
    </Layout>
  );
}
