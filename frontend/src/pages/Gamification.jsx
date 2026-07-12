import { useState } from 'react';
import { Plus, Trophy } from 'lucide-react';
import {
  FaBicycle,
  FaRecycle,
  FaTrainSubway,
  FaSeedling,
  FaEarthAmericas,
  FaTrophy,
  FaStar,
  FaBottleWater,
  FaTree,
  FaBagShopping,
  FaGift,
  FaSquareParking,
  FaCalendarDay,
  FaLock,
} from 'react-icons/fa6';
import SubTabs from '../components/common/SubTabs';
import ProgressBar from '../components/common/ProgressBar';
import ToastStack from '../components/common/Toast';
import useFadeInUp from '../hooks/useFadeInUp';
import useTabParam from '../hooks/useTabParam';
import useGamification from '../hooks/useGamification';
import { leaderboardIndividual, leaderboardDepartment, rewards } from '../data/mockData';

const TABS = ['Challenges', 'Challenge Participation', 'Badges', 'Rewards', 'Leaderboard'];

const CHALLENGE_ICONS = {
  bike: FaBicycle,
  recycle: FaRecycle,
  tram: FaTrainSubway,
};

const BADGE_ICONS = {
  seedling: FaSeedling,
  earth: FaEarthAmericas,
  trophy: FaTrophy,
  star: FaStar,
};

const REWARD_ICONS = {
  bottle: FaBottleWater,
  tree: FaTree,
  bag: FaBagShopping,
  gift: FaGift,
  parking: FaSquareParking,
  calendar: FaCalendarDay,
};

const STAGES = ['Draft', 'Active', 'Under Review', 'Completed', 'Archived'];
const stageAccent = {
  Draft: 'var(--text-tertiary)',
  Active: 'var(--success)',
  'Under Review': 'var(--gov-plum)',
  Completed: 'var(--teal)',
  Archived: 'var(--text-tertiary)',
};

export default function Gamification() {
  const [tab, setTab] = useTabParam(TABS, 'Challenges');
  const contentRef = useFadeInUp([tab]);
  const { toasts, dismissToast } = useGamification();

  return (
    <div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <SubTabs tabs={TABS} active={tab} onChange={setTab} accent="var(--gamify-gold)" />
      <div ref={contentRef}>
        {tab === 'Challenges' && <ChallengesView />}
        {tab === 'Challenge Participation' && (
          <PlaceholderPanel text="Challenge participation log — synced from Social approvals." />
        )}
        {tab === 'Badges' && <BadgeGallery />}
        {tab === 'Rewards' && <RewardsPanel />}
        {tab === 'Leaderboard' && <LeaderboardPanel />}
      </div>
    </div>
  );
}

function XPSummary() {
  const { userStats } = useGamification();
  return (
    <div className="panel xp-summary" style={{ marginBottom: 20, border: '1px solid var(--gamify-gold)' }}>
      <Trophy size={22} color="var(--gamify-gold)" />
      <div className="xp-summary__stat">
        <span className="xp-summary__stat-value">{userStats.totalXP.toLocaleString()}</span>
        <span className="xp-summary__stat-label">Your XP</span>
      </div>
      <div className="xp-summary__stat">
        <span className="xp-summary__stat-value">{userStats.completedChallenges}</span>
        <span className="xp-summary__stat-label">Challenges Completed</span>
      </div>
    </div>
  );
}

function ChallengeActions({ challenge }) {
  const { activateChallenge, submitForReview, approveAndComplete, archiveChallenge } = useGamification();
  const { id, status } = challenge;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
      {status === 'Draft' && (
        <button
          className="btn btn--sm"
          style={{ background: 'var(--gamify-gold)', color: '#241a00' }}
          onClick={() => activateChallenge(id)}
        >
          Activate
        </button>
      )}
      {status === 'Active' && (
        <button
          className="btn btn--sm"
          style={{ background: 'var(--gov-plum)', color: '#fff' }}
          onClick={() => submitForReview(id)}
        >
          Submit for Review
        </button>
      )}
      {status === 'Under Review' && (
        <button
          className="btn btn--sm"
          style={{ background: 'var(--teal)', color: '#fff' }}
          onClick={() => approveAndComplete(id)}
        >
          Approve &amp; Complete
        </button>
      )}
      {status !== 'Completed' && status !== 'Archived' && (
        <button className="btn btn--sm btn--ghost" onClick={() => archiveChallenge(id)}>
          Archive
        </button>
      )}
    </div>
  );
}

function ChallengesView() {
  const { challenges } = useGamification();

  return (
    <>
      <div className="panel-toolbar">
        <button className="btn" style={{ background: 'var(--gamify-gold)', color: '#241a00' }}>
          <Plus size={15} /> New Challenge
        </button>
      </div>

      <XPSummary />

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {STAGES.map((s) => (
          <span
            key={s}
            className="pill"
            style={{
              border: `1px solid ${stageAccent[s]}`,
              color: stageAccent[s],
              background: `color-mix(in srgb, ${stageAccent[s]} 12%, transparent)`,
            }}
          >
            {s}
          </span>
        ))}
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {challenges.map((c) => {
          const Icon = CHALLENGE_ICONS[c.icon];
          return (
            <div key={c.id} className="panel" style={{ border: '1px solid var(--gamify-gold)' }}>
              <Icon size={20} color="var(--gamify-gold)" style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{c.name}</div>
              <div className="text-secondary" style={{ fontSize: 12, marginBottom: 4 }}>
                XP {c.xp} · {c.difficulty}
              </div>
              <div className="text-secondary" style={{ fontSize: 12, marginBottom: 12 }}>
                Deadline {c.deadline}
              </div>
              <span
                className="pill"
                style={{ marginBottom: 12, color: stageAccent[c.status], border: `1px solid ${stageAccent[c.status]}` }}
              >
                {c.status}
              </span>
              <ChallengeActions challenge={c} />
            </div>
          );
        })}
      </div>

      <div className="grid-2">
        <BadgeGallery compact />
        <LeaderboardPanel compact />
      </div>
    </>
  );
}

function BadgeGallery({ compact }) {
  const { badges } = useGamification();

  return (
    <div className="panel">
      <div className="panel__title">
        <Trophy size={16} color="var(--gamify-gold)" /> Badge Gallery
      </div>
      <div className="grid-2">
        {badges.map((b) => {
          const Icon = BADGE_ICONS[b.icon];
          const unit = b.unlockRule.type === 'xp' ? 'XP' : 'challenges';
          return (
            <div key={b.id} className={`badge-card ${b.earned ? 'badge-card--earned' : 'badge-card--locked'}`}>
              <div className="badge-card__head">
                {b.earned ? <Icon size={16} /> : <FaLock size={13} />}
                {b.name}
              </div>
              {b.earned ? (
                <span className="text-secondary" style={{ fontSize: 12 }}>Earned</span>
              ) : (
                <>
                  <ProgressBar percent={b.progressPercent} />
                  <span className="badge-card__progress-label">
                    {Math.min(b.current, b.threshold)} / {b.threshold} {unit}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
      {!compact && (
        <p className="text-secondary" style={{ fontSize: 12, marginTop: 14 }}>
          Badges are re-evaluated automatically whenever your XP or completed-challenge count changes.
        </p>
      )}
    </div>
  );
}

function RewardsPanel() {
  const { userStats, redeemReward, redemptions } = useGamification();

  return (
    <div className="panel">
      <div className="panel-toolbar">
        <div className="panel__title" style={{ marginBottom: 0 }}>
          <Trophy size={16} color="var(--gamify-gold)" /> Reward Catalog
        </div>
        <div className="panel-toolbar__spacer" />
        <span className="pill" style={{ border: '1px solid var(--gamify-gold)', color: 'var(--gamify-gold)' }}>
          Balance: {userStats.totalXP.toLocaleString()} XP
        </span>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {rewards.map((r) => {
          const Icon = REWARD_ICONS[r.icon];
          const canAfford = userStats.totalXP >= r.xpCost;
          return (
            <div key={r.id} className="reward-card">
              <Icon size={20} color="var(--gamify-gold)" />
              <div className="reward-card__name">{r.name}</div>
              <div className="reward-card__desc">{r.description}</div>
              <div className="reward-card__footer">
                <span className="reward-card__cost">{r.xpCost} XP</span>
                <button
                  className="btn btn--sm"
                  disabled={!canAfford}
                  style={{
                    background: canAfford ? 'var(--gamify-gold)' : 'var(--border)',
                    color: canAfford ? '#241a00' : 'var(--text-tertiary)',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => canAfford && redeemReward(r)}
                >
                  Redeem
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel__title" style={{ fontSize: 13 }}>Redemption History</div>
      {redemptions.length === 0 ? (
        <div className="text-secondary" style={{ fontSize: 12 }}>No rewards redeemed yet.</div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Reward</th><th>Date</th></tr>
            </thead>
            <tbody>
              {redemptions.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td className="text-secondary">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LeaderboardPanel({ compact }) {
  const [view, setView] = useState('Individual');
  const { userStats } = useGamification();

  const rows =
    view === 'Individual'
      ? leaderboardIndividual.map((row) => (row.isCurrentUser ? { ...row, xp: userStats.totalXP } : row))
      : leaderboardDepartment;

  return (
    <div className="panel">
      <div className="panel-toolbar" style={{ marginBottom: compact ? 12 : 16 }}>
        <div className="panel__title" style={{ marginBottom: 0 }}>
          <Trophy size={16} color="var(--gamify-gold)" /> Leaderboard
        </div>
        <div className="panel-toolbar__spacer" />
        <div className="pill-toggle">
          {['Individual', 'Department'].map((option) => (
            <button
              key={option}
              className={`pill-toggle__option ${view === option ? 'pill-toggle__option--active' : ''}`}
              onClick={() => setView(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Rank</th><th>Employee / Dept</th><th>XP</th></tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.rank} className={l.isCurrentUser ? 'leaderboard-row--you' : ''}>
                <td>#{l.rank}</td>
                <td>{l.name}</td>
                <td className="mono" style={{ color: 'var(--gamify-gold)' }}>{l.xp.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlaceholderPanel({ text }) {
  return <div className="panel empty-state">{text}</div>;
}
