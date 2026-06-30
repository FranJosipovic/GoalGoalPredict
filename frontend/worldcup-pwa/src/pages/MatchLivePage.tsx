import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import PredictionPitch, { type PlayerBadge } from "../components/PredictionPitch";
import { getMatchDetail, getMatchPredictions } from "../api/matches";
import { useAuthStore } from "../store/authStore";
import PicksByTeam from "../components/PicksByTeam";
import Icon, { FootballCard, type IconName } from "../components/Icon";
import PlayerStats from "../components/PlayerStats";
import type { MatchDetail, GroupPredictions, FinishType } from "../types";

type Tab = "events" | "lineups" | "picks";
const MATCH_TABS: [Tab, IconName, string][] = [
  ["events", "clipboard", "Events"],
  ["lineups", "shirt", "Lineups"],
  ["picks", "target", "Picks"],
];
type Side = "home" | "away";
const FINISH_LABEL: Record<FinishType, string> = {
  Regular: "Regular time",
  ExtraTime: "Extra time",
  Penalties: "Penalties",
};

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
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null);

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
    const isLive = ["1H", "HT", "2H", "ET", "BT", "P"].includes(match.status);
    if (!isLive) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [match, load]);

  if (loading)
    return (
      <Layout showBack>
        <div className="loading-state">
          <span className="loading-ball"><Icon name="ball" size={34} /></span>
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

  const isLive = ["1H", "HT", "2H", "ET", "BT", "P"].includes(match.status);
  const isFinished = ["FT", "AET", "PEN"].includes(match.status);
  // All members' picks for this match, best projected/scored first.
  const allPicks = [...(preds?.predictions ?? [])].sort(
    (a, b) => b.projectedPoints - a.projectedPoints,
  );

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

  // ---- Penalty shootout (knockout decider) — informational, never scored ----
  const shootout = [...(match.shootoutPenalties ?? [])].sort((a, b) => a.order - b.order);
  const penHome = match.penaltyHomeGoals ?? shootout.filter((s) => s.teamId === match.homeTeam.id && s.scored).length;
  const penAway = match.penaltyAwayGoals ?? shootout.filter((s) => s.teamId === match.awayTeam.id && s.scored).length;

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
    if (g) out.push({ icon: <Icon name="ball" size={13} className="pp-ico-goal" />, count: g });
    if (og) out.push({ icon: <Icon name="ball" size={13} className="pp-ico-og" />, count: og });
    if (yellowIds.has(playerId)) out.push({ icon: <FootballCard color="yellow" size={12} /> });
    if (redIds.has(playerId)) out.push({ icon: <FootballCard color="red" size={12} /> });
    if (subOutIds.has(playerId)) out.push({ icon: <Icon name="arrow-down" size={12} className="pp-ico-out" /> });
    if (subInIds.has(playerId)) out.push({ icon: <Icon name="arrow-up" size={12} className="pp-ico-in" /> });
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
          {MATCH_TABS.map(([t, icon, label]) => (
            <button
              key={t}
              className={`match-tab ${tab === t ? "match-tab--active" : ""}`}
              onClick={() => setTab(t)}
            >
              <Icon name={icon} size={16} className="match-tab-icon" />
              {label}
            </button>
          ))}
        </div>

        {/* TAB: Match events */}
        {tab === "events" && (
          events.length === 0 && shootout.length === 0 ? (
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
                      {e.kind === "goal" ? (
                        <span className="ev-goal">
                          <Icon name="ball" size={15} />
                          {e.goalType === "Penalty" && <em>P</em>}
                          {e.goalType === "Own Goal" && <em>OG</em>}
                        </span>
                      ) : e.kind === "card" ? (
                        <FootballCard color={e.cardType === "Red Card" ? "red" : "yellow"} size={15} />
                      ) : e.kind === "var" ? (
                        <Icon
                          name={/disallow|cancel/i.test(e.detail ?? "") ? "close" : "whistle"}
                          size={15}
                          className="ev-icon-var"
                        />
                      ) : e.kind === "sub" ? (
                        <span className="ev-sub-arrows">
                          <Icon name="arrow-up" size={13} className="ev-arrow-in" />
                          <Icon name="arrow-down" size={13} className="ev-arrow-out" />
                        </span>
                      ) : null}
                    </span>
                    <div className="ev-text">
                      {e.kind === "sub" ? (
                        <>
                          <span className="ev-in">{e.inName ?? "Unknown"}</span>
                          <span className="ev-out">{e.outName ?? "Unknown"}</span>
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

              {/* Penalty shootout — continues the timeline below the in-play events */}
              {shootout.length > 0 && (
                <>
                  <div className="ev-shootout-head">
                    <span className="ev-shootout-label">
                      <Icon name="target" size={13} /> Penalty Shootout
                    </span>
                    <span className="ev-shootout-score">{penHome}–{penAway}</span>
                  </div>
                  {shootout.map((s, i) => {
                    const home = s.teamId === match.homeTeam.id;
                    return (
                      <div
                        key={`pen${i}`}
                        className={`ev-row ${home ? "ev-row--home" : "ev-row--away"}`}
                      >
                        <span className="ev-min ev-min--pen">P</span>
                        <span className="ev-icon">
                          <span className={`shootout-mark ${s.scored ? "is-scored" : "is-missed"}`}>
                            {s.scored ? "✓" : "✗"}
                          </span>
                        </span>
                        <div className="ev-text">
                          <span className="ev-main">{(s.playerName ?? "Unknown").split(" ").pop()}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
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
                onPlayerTap={setStatsPlayerId}
              />
              <p className="lineup-tap-hint">Tap a player for season statistics</p>

              <div className="lineup-legend">
                <span><Icon name="ball" size={13} /> goal</span>
                <span><FootballCard color="yellow" size={12} /> / <FootballCard color="red" size={12} /> card</span>
                <span><Icon name="arrow-down" size={13} className="pp-ico-out" /> subbed off</span>
                <span><Icon name="arrow-up" size={13} className="pp-ico-in" /> subbed on</span>
              </div>
            </div>
          )
        )}

        {/* TAB: Everyone's picks */}
        {tab === "picks" && (
          allPicks.length === 0 ? (
            <div className="empty-state"><p>No predictions for this match</p></div>
          ) : (
            <div className="match-picks">
              {allPicks.map((p) => {
                const isMe = p.userId === user?.id;
                return (
                  <div key={p.userId} className={`my-pred ${isMe ? "my-pred--me" : ""}`}>
                    <div className="my-pred-head">
                      <span className="section-label">
                        {p.firstName} {p.lastName}{isMe ? " (You)" : ""}
                      </span>
                      <span className="my-pred-pts">
                        {p.projectedPoints}
                        <em>{isFinished ? "pts" : "proj"}</em>
                      </span>
                    </div>
                    <div className="my-pred-score">
                      <span>{match.homeTeam.code || match.homeTeam.name}</span>
                      <strong>
                        {p.predHome} : {p.predAway}
                      </strong>
                      <span>{match.awayTeam.code || match.awayTeam.name}</span>
                    </div>
                    {p.finishType && (
                      <div className="my-pred-finish">
                        🏁 {FINISH_LABEL[p.finishType]}
                      </div>
                    )}
                    <PicksByTeam
                      scorers={p.scorers}
                      cards={p.cards}
                      home={match.homeTeam}
                      away={match.awayTeam}
                    />
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Player statistics modal (tap a lineup player) */}
        {statsPlayerId != null && (
          <div className="pp-sheet-overlay" onClick={() => setStatsPlayerId(null)}>
            <div className="pp-sheet pp-sheet--stats" onClick={(e) => e.stopPropagation()}>
              <div className="pp-sheet-head">
                <Icon name="chart" size={18} className="pp-row-icon" />
                <span className="pp-sheet-name">Player statistics</span>
                <button className="pp-sheet-close" onClick={() => setStatsPlayerId(null)} aria-label="Close">✕</button>
              </div>
              <PlayerStats playerId={statsPlayerId} />
              <button className="pp-sheet-done" onClick={() => setStatsPlayerId(null)}>Done</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
