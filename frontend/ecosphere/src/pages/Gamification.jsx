import { Plus, Trophy } from 'lucide-react';
import { FaBicycle, FaRecycle, FaTrainSubway, FaSeedling, FaEarthAmericas, FaTrophy, FaStar } from 'react-icons/fa6';
import SubTabs from '../components/common/SubTabs';
import useFadeInUp from '../hooks/useFadeInUp';
import useTabParam from '../hooks/useTabParam';
import { challenges, badges, leaderboard } from '../data/mockData';

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

  return (
    <div>
      <SubTabs tabs={TABS} active={tab} onChange={setTab} accent="var(--gamify-gold)" />
      <div ref={contentRef}>
        {tab === 'Challenges' && <ChallengesView />}
        {tab === 'Challenge Participation' && <PlaceholderPanel text="Challenge participation log — synced from Social approvals." />}
        {tab === 'Badges' && <BadgeGallery />}
        {tab === 'Rewards' && <PlaceholderPanel text="Reward catalog — redeemable with earned XP." />}
        {tab === 'Leaderboard' && <LeaderboardPanel />}
      </div>
    </div>
  );
}

function ChallengesView() {
  return (
    <>
      <div className="panel-toolbar">
        <button className="btn" style={{ background: 'var(--gamify-gold)', color: '#241a00' }}>
          <Plus size={15} /> New Challenge
        </button>
      </div>

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
            <div className="text-secondary" style={{ fontSize: 12, marginBottom: 12 }}>Deadline {c.deadline}</div>
            <span
              className="pill"
              style={{ marginBottom: 12, color: stageAccent[c.status], border: `1px solid ${stageAccent[c.status]}` }}
            >
              {c.status}
            </span>
            <button
              className="btn btn--sm"
              style={{ background: 'var(--gamify-gold)', color: '#241a00', display: 'block', marginTop: 12 }}
            >
              Join Challenge
            </button>
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
  return (
    <div className="panel">
      <div className="panel__title">
        <Trophy size={16} color="var(--gamify-gold)" /> Badge Gallery
      </div>
      <div className="grid-2">
        {badges.map((b) => {
          const Icon = BADGE_ICONS[b.icon];
          return (
            <div
              key={b.id}
              className="pill"
              style={{
                border: '1px solid var(--gamify-gold)',
                color: 'var(--gamify-gold)',
                padding: '10px 14px',
                fontSize: 13,
                gap: 8,
              }}
            >
              <Icon size={14} /> {b.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeaderboardPanel({ compact }) {
  return (
    <div className="panel">
      <div className="panel__title">
        <Trophy size={16} color="var(--gamify-gold)" /> Leaderboard
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Rank</th><th>Employee / Dept</th><th>XP</th></tr>
          </thead>
          <tbody>
            {leaderboard.map((l) => (
              <tr key={l.rank}>
                <td>#{l.rank}</td>
                <td>{l.name}</td>
                <td className="mono" style={{ color: 'var(--gamify-gold)' }}>{l.xp}</td>
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
