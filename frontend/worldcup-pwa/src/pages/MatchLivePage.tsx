import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import NotificationToggle from "../components/NotificationToggle";
import { getMatchDetail, getMatchPredictions } from "../api/matches";
import { useAuthStore } from "../store/authStore";
import PicksByTeam from "../components/PicksByTeam";
import type { MatchDetail, GroupPredictions } from "../types";

export default function MatchLivePage() {
  const { groupId, matchId } = useParams<{
    groupId: string;
    matchId: string;
  }>();
  const { user } = useAuthStore();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [preds, setPreds] = useState<GroupPredictions | null>(null);
  const [loading, setLoading] = useState(true);

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
    kind: "goal" | "card" | "sub";
    goalType?: string;
    cardType?: string;
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
  ].sort(
    (a, b) =>
      a.minute - b.minute || (a.extraMinute ?? 0) - (b.extraMinute ?? 0),
  );

  return (
    <Layout title="Match" showBack>
      <div className="live-page">
        {/* Score header */}
        <div className="live-scoreboard">
          <div className="live-team">
            <img
              src={match.homeTeam.logoUrl}
              className="live-team-logo"
              alt=""
            />
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
            <img
              src={match.awayTeam.logoUrl}
              className="live-team-logo"
              alt=""
            />
            <span className="live-team-name">{match.awayTeam.name}</span>
          </div>
        </div>

        {/* Match alerts */}
        <div className="live-notif">
          <NotificationToggle />
        </div>

        {/* My prediction */}
        {myPred && (
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
        )}

        {/* Match events — goals, cards and subs in one timeline */}
        {events.length > 0 && (
          <div className="events-timeline">
            <div className="section-label">MATCH EVENTS</div>
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
                        : ""}
                  </span>
                  <div className="ev-text">
                    {e.kind === "sub" ? (
                      <>
                        <span className="ev-in">▲ {e.inName ?? "Unknown"}</span>
                        <span className="ev-out">
                          ▼ {e.outName ?? "Unknown"}
                        </span>
                      </>
                    ) : (
                      <span className="ev-main">{e.main ?? "Unknown"}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lineups */}
        {match.lineup.length > 0 && (
          <div className="lineup-section">
            <div className="section-label">LINEUPS</div>
            <div className="lineup-cols">
              {[match.homeTeam, match.awayTeam].map((team) => (
                <div key={team.id} className="lineup-col">
                  <div className="lineup-team-name">{team.name}</div>
                  {match.lineup
                    .filter((l) => l.teamId === team.id && l.isStarting)
                    .map((l) => (
                      <div key={l.playerId} className="lineup-player">
                        <span className="lineup-num">#{l.shirtNumber}</span>
                        <span className="lineup-name">{l.name}</span>
                        <span className="lineup-pos">{l.position}</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
