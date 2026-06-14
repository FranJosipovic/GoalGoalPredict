import { useEffect, useState, useCallback } from "react";
import { getMyPredictions, getMatchPredictions } from "../../api/matches";
import { useAuthStore } from "../../store/authStore";
import PicksByTeam from "../PicksByTeam";
import type {
  MyPredictionItem,
  GroupPredictions,
  TeamSummary,
} from "../../types";

interface Props {
  groupId: string;
  onMatchClick: (matchId: number, openDetail: boolean) => void;
}

const LIVE_STATUSES = ["1H", "HT", "2H", "ET", "P"];
const FINISHED_STATUSES = ["FT", "AET", "PEN"];

type Bucket = "live" | "upcoming" | "finished";

function bucketOf(status: string): Bucket {
  if (LIVE_STATUSES.includes(status)) return "live";
  if (FINISHED_STATUSES.includes(status)) return "finished";
  return "upcoming";
}

function formatKickoff(utc: string) {
  return new Date(utc).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function GroupPicksPanel({
  matchId,
  groupId,
  meId,
  home,
  away,
}: {
  matchId: number;
  groupId: string;
  meId?: string;
  home: TeamSummary;
  away: TeamSummary;
}) {
  const [data, setData] = useState<GroupPredictions | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "hidden">("loading");

  useEffect(() => {
    let alive = true;
    getMatchPredictions(matchId, groupId)
      .then((d) => {
        if (alive) {
          setData(d);
          setState("ready");
        }
      })
      .catch(() => {
        if (alive) setState("hidden");
      });
    return () => {
      alive = false;
    };
  }, [matchId, groupId]);

  if (state === "loading")
    return (
      <div className="picks-panel picks-panel--loading">Loading picks…</div>
    );
  if (state === "hidden" || !data)
    return (
      <div className="picks-panel picks-panel--hidden">
        🔒 Other picks reveal at kickoff
      </div>
    );

  return (
    <div className="picks-panel">
      {data.predictions
        .filter((p) => p.userId !== meId)
        .map((p) => (
          <div key={p.userId} className="picks-row">
            <div className="picks-row-main">
              <span className="picks-avatar">
                {p.firstName[0]}
                {p.lastName[0]}
              </span>

              <span className="picks-name">{p.firstName}</span>

              <span className="picks-pick">
                {p.predHome}–{p.predAway}
              </span>
            </div>

            <span className="picks-pts">
              {p.projectedPoints}
              <small>pts</small>
            </span>

            <div className="picks-row-picks">
              <PicksByTeam
                scorers={p.scorers}
                cards={p.cards}
                home={home}
                away={away}
              />
            </div>
          </div>
        ))}
    </div>
  );
}

function PredictionCard({
  p,
  groupId,
  meId,
  onClick,
}: {
  p: MyPredictionItem;
  groupId: string;
  meId?: string;
  onClick: () => void;
}) {
  const bucket = bucketOf(p.status);
  const [expanded, setExpanded] = useState(false);
  const hasResult = p.actualHome !== null && p.actualAway !== null;
  const exact =
    hasResult && p.predHome === p.actualHome && p.predAway === p.actualAway;
  const points = p.isScored ? p.points : hasResult ? p.projectedPoints : null;
  const canReveal = bucket !== "upcoming";

  return (
    <div className={`mypred-card mypred-card--${bucket}`}>
      <button className="mypred-card-body" onClick={onClick}>
        <div className="mypred-top">
          <span className="mypred-round">{p.round}</span>
          <span className="mypred-when">{formatKickoff(p.kickoffUtc)}</span>
          {bucket === "live" && (
            <span className="mypred-flag mypred-flag--live">
              <span className="live-dot" />
              LIVE
            </span>
          )}
          {bucket === "finished" && (
            <span className="mypred-flag mypred-flag--ft">FT</span>
          )}
        </div>

        <div className="mypred-fixture">
          <div className="mypred-side">
            <img src={p.homeTeam.logoUrl} className="mypred-logo" alt="" />
            <span className="mypred-code">{p.homeTeam.code}</span>
          </div>
          <div className="mypred-scores">
            <div className="mypred-scoreline">
              <span className="mypred-score-tag">PICK</span>
              <span
                className={`mypred-score ${exact ? "mypred-score--exact" : ""}`}
              >
                {p.predHome}–{p.predAway}
              </span>
            </div>
            {hasResult && (
              <div className="mypred-scoreline mypred-scoreline--actual">
                <span className="mypred-score-tag">REAL</span>
                <span className="mypred-score">
                  {p.actualHome}–{p.actualAway}
                </span>
              </div>
            )}
          </div>
          <div className="mypred-side mypred-side--right">
            <span className="mypred-code">{p.awayTeam.code}</span>
            <img src={p.awayTeam.logoUrl} className="mypred-logo" alt="" />
          </div>
        </div>

        <PicksByTeam
          scorers={p.scorers}
          cards={p.cards}
          home={p.homeTeam}
          away={p.awayTeam}
        />

        <div className="mypred-foot">
          {exact && (
            <span className="mypred-badge mypred-badge--exact">
              ✓ Exact score
            </span>
          )}
          {points !== null ? (
            <span
              className={`mypred-points ${p.isScored ? "" : "mypred-points--proj"}`}
            >
              <strong>
                {points >= 0 ? "+" : ""}
                {points}
              </strong>{" "}
              pts {!p.isScored && <em>live</em>}
            </span>
          ) : (
            <span className="mypred-points mypred-points--pending">
              Awaiting kickoff
            </span>
          )}
        </div>
      </button>

      <button
        className={`picks-reveal-btn ${expanded ? "picks-reveal-btn--open" : ""}`}
        onClick={() => canReveal && setExpanded((v) => !v)}
        disabled={!canReveal}
      >
        {canReveal
          ? expanded
            ? "▲ Hide group picks"
            : "▼ Show group picks"
          : "🔒 Group picks reveal at kickoff"}
      </button>

      {expanded && canReveal && (
        <GroupPicksPanel
          matchId={p.matchId}
          groupId={groupId}
          meId={meId}
          home={p.homeTeam}
          away={p.awayTeam}
        />
      )}
    </div>
  );
}

export default function PicksTab({ groupId, onMatchClick }: Props) {
  const { user } = useAuthStore();
  const [items, setItems] = useState<MyPredictionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishedLimit, setFinishedLimit] = useState(3);
  const [stats, setStats] = useState({ finishedTotal: 0, totalPicks: 0, totalPoints: 0, exactCount: 0 });

  const load = useCallback(async () => {
    try {
      const data = await getMyPredictions(groupId, finishedLimit);
      setItems(data.items);
      setStats({
        finishedTotal: data.finishedTotal,
        totalPicks: data.totalPicks,
        totalPoints: data.totalPoints,
        exactCount: data.exactCount,
      });
    } finally {
      setLoading(false);
    }
  }, [groupId, finishedLimit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!items.some((i) => LIVE_STATUSES.includes(i.status))) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [items, load]);

  if (loading)
    return (
      <div className="loading-state">
        <span className="loading-ball">⚽</span>
      </div>
    );

  if (stats.totalPicks === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🎯</span>
        <p className="empty-title">No picks yet</p>
        <p className="empty-sub">Head to Matches and place your first pick</p>
      </div>
    );
  }

  const order: Bucket[] = ["live", "upcoming", "finished"];
  const labels: Record<Bucket, string> = {
    live: "Live now",
    upcoming: "Upcoming",
    finished: "Finished",
  };
  const grouped = order
    .map((b) => {
      let list = items.filter((i) => bucketOf(i.status) === b);
      // Played matches read best most-recent-first.
      if (b === "finished")
        list = [...list].sort(
          (a, c) => new Date(c.kickoffUtc).getTime() - new Date(a.kickoffUtc).getTime(),
        );
      return { bucket: b, list };
    })
    .filter((g) => g.list.length > 0);

  return (
    <div className="mypred-tab">
      <div className="mypred-summary">
        <div className="mypred-stat">
          <span className="mypred-stat-num">{stats.totalPoints}</span>
          <span className="mypred-stat-label">Points</span>
        </div>
        <div className="mypred-stat">
          <span className="mypred-stat-num">{stats.totalPicks}</span>
          <span className="mypred-stat-label">Picks</span>
        </div>
        <div className="mypred-stat">
          <span className="mypred-stat-num">{stats.exactCount}</span>
          <span className="mypred-stat-label">Exact</span>
        </div>
      </div>

      {grouped.map(({ bucket, list }) => {
        const isFinished = bucket === "finished";
        // Finished picks are paged server-side; the bucket already holds just this page.
        const visible = list;
        const hasMore = isFinished && stats.finishedTotal > list.length;
        return (
          <div key={bucket} className="mypred-group">
            <div className="mypred-group-label">
              {labels[bucket]}{" "}
              <span className="mypred-group-count">
                {isFinished ? stats.finishedTotal : list.length}
              </span>
            </div>
            {visible.map((p) => (
              <PredictionCard
                key={p.matchId}
                p={p}
                groupId={groupId}
                meId={user?.id}
                onClick={() =>
                  onMatchClick(
                    p.matchId,
                    LIVE_STATUSES.includes(p.status) ||
                      FINISHED_STATUSES.includes(p.status),
                  )
                }
              />
            ))}
            {hasMore && (
              <button
                className="load-more-btn"
                onClick={() => setFinishedLimit((n) => n + 3)}
              >
                Load more
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
