import { useState, useCallback } from 'react';
import { Leaf, Users, ShieldCheck, LayoutDashboard, Wand2, Play, FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import { FaChevronDown } from 'react-icons/fa6';
import SubTabs from '../components/common/SubTabs';
import useFadeInUp from '../hooks/useFadeInUp';
import useTabParam from '../hooks/useTabParam';
import useEnvironmental from '../hooks/useEnvironmental';
import useGovernance from '../hooks/useGovernance';
import useSocial from '../hooks/useSocial';
import { downloadTextFile, goalsToCSV, goalsToJSON } from '../utils/environmental';
import { auditsToCSV, auditsToJSON } from '../utils/governance';
import * as api from '../api/endpoints';

const TABS = ['Environmental', 'Social', 'Governance', 'ESG Summary', 'Custom Builder'];

const reportCards = [
  { key: 'Environmental', icon: Leaf, color: 'var(--env-green)', title: 'Environmental Report', desc: 'Emissions, goals, vendor & product breakdown' },
  { key: 'Social', icon: Users, color: 'var(--social-teal)', title: 'Social Report', desc: 'Diversity, CSR participation, training completion' },
  { key: 'Governance', icon: ShieldCheck, color: 'var(--gov-plum)', title: 'Governance Report', desc: 'Policies, audits, compliance & risk summary' },
  { key: 'ESG Summary', icon: LayoutDashboard, color: 'var(--teal)', title: 'ESG Summary', desc: 'Executive overview: all 3 scores + dept comparison' },
];

const filters = ['Date Range', 'Department', 'Module', 'Employee', 'Challenge', 'ESG Category'];

export default function Reports() {
  const [tab, setTab] = useTabParam(TABS, 'ESG Summary');
  const contentRef = useFadeInUp([]);
  const [generatedReport, setGeneratedReport] = useState(null);

  const { environmentalGoals, carbonTransactions, emissionFactors } = useEnvironmental();
  const { audits, complianceIssues, policies } = useGovernance();
  const { csrActivities, employeeParticipation, trainings } = useSocial();

  const [customModule, setCustomModule] = useState('Environmental');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [loadingCustom, setLoadingCustom] = useState(false);

  const generateReport = useCallback(async (type) => {
    let content = '';
    const timestamp = new Date().toLocaleString();

    if (type === 'Custom Builder') {
      setLoadingCustom(true);
      try {
        const payload = { module: customModule };
        if (customDateFrom) payload.date_from = customDateFrom;
        if (customDateTo) payload.date_to = customDateTo;
        const res = await api.generateCustomReport(payload);
        const data = res.data;
        content = `CUSTOM REPORT: ${data.module}\nGenerated: ${timestamp}\nRows: ${data.row_count}\nFilters: ${JSON.stringify(data.filters_applied)}\n\n${JSON.stringify(data.rows, null, 2)}`;
      } catch (err) {
        content = `Error generating report: ${err.message}`;
      } finally {
        setLoadingCustom(false);
      }
      setGeneratedReport({ type, content });
      return;
    }

    switch (type) {
      case 'Environmental':
        content = `ENVIRONMENTAL ESG REPORT\nGenerated: ${timestamp}\n${'='.repeat(50)}\n\n`;
        content += `EMISSION FACTORS: ${emissionFactors.length} registered\n`;
        content += `CARBON TRANSACTIONS: ${carbonTransactions.length} logged\n`;
        content += `ENVIRONMENTAL GOALS: ${environmentalGoals.length} active\n\n`;
        content += `--- Goal Summary ---\n`;
        environmentalGoals.forEach(g => {
          content += `  • ${g.name} (${g.department}): ${g.current}/${g.target} ${g.unit} — ${g.progress || 0}%\n`;
        });
        break;

      case 'Social':
        content = `SOCIAL ESG REPORT\nGenerated: ${timestamp}\n${'='.repeat(50)}\n\n`;
        content += `CSR ACTIVITIES: ${csrActivities.length} active\n`;
        content += `PARTICIPATIONS: ${employeeParticipation.length} records\n`;
        content += `TRAININGS: ${trainings.length} tracked\n\n`;
        content += `--- CSR Activities ---\n`;
        csrActivities.forEach(a => {
          content += `  • ${a.name}: ${a.joined} participants\n`;
        });
        content += `\n--- Training Completion ---\n`;
        trainings.forEach(t => {
          content += `  • ${t.course} — ${t.employee}: ${t.completion}% (${t.status})\n`;
        });
        break;

      case 'Governance':
        content = `GOVERNANCE ESG REPORT\nGenerated: ${timestamp}\n${'='.repeat(50)}\n\n`;
        content += `POLICIES: ${policies.length} published\n`;
        content += `AUDITS: ${audits.length} scheduled/completed\n`;
        content += `COMPLIANCE ISSUES: ${complianceIssues.length} tracked\n\n`;
        content += `--- Audits ---\n`;
        audits.forEach(a => {
          content += `  • ${a.title} (${a.department}): ${a.status} — ${a.findings}\n`;
        });
        content += `\n--- Open Issues ---\n`;
        complianceIssues.filter(c => c.status !== 'Resolved').forEach(c => {
          content += `  • [${c.severity}] ${c.issue} (${c.department})\n`;
        });
        break;

      case 'ESG Summary':
        content = `ESG EXECUTIVE SUMMARY\nGenerated: ${timestamp}\n${'='.repeat(50)}\n\n`;
        content += `Environmental: ${emissionFactors.length} factors, ${carbonTransactions.length} transactions, ${environmentalGoals.length} goals\n`;
        content += `Social: ${csrActivities.length} activities, ${employeeParticipation.length} participations\n`;
        content += `Governance: ${policies.length} policies, ${audits.length} audits, ${complianceIssues.length} issues\n`;
        break;

      default:
        content = `Report type not found.`;
    }

    setGeneratedReport({ type, content });
  }, [
    customModule, customDateFrom, customDateTo,
    emissionFactors, carbonTransactions, environmentalGoals, 
    csrActivities, employeeParticipation, trainings, 
    policies, audits, complianceIssues
  ]);

  const handleExport = (format) => {
    if (!generatedReport) return;

    const name = generatedReport.type.toLowerCase().replace(/\s+/g, '_');

    switch (format) {
      case 'txt':
        downloadTextFile(`${name}_report.txt`, generatedReport.content, 'text/plain');
        break;
      case 'csv':
        if (generatedReport.type === 'Environmental') {
          downloadTextFile(`${name}_goals.csv`, goalsToCSV(environmentalGoals), 'text/csv');
        } else if (generatedReport.type === 'Governance') {
          downloadTextFile(`${name}_audits.csv`, auditsToCSV(audits), 'text/csv');
        } else {
          downloadTextFile(`${name}_report.csv`, generatedReport.content, 'text/csv');
        }
        break;
      case 'json':
        if (generatedReport.type === 'Environmental') {
          downloadTextFile(`${name}_goals.json`, goalsToJSON(environmentalGoals), 'application/json');
        } else if (generatedReport.type === 'Governance') {
          downloadTextFile(`${name}_audits.json`, auditsToJSON(audits), 'application/json');
        } else {
          downloadTextFile(`${name}_report.json`, JSON.stringify({ type: generatedReport.type, content: generatedReport.content }, null, 2), 'application/json');
        }
        break;
    }
  };

  return (
    <div>
      <SubTabs tabs={TABS} active={tab} onChange={setTab} accent="var(--teal)" />

      <div ref={contentRef} className="grid-4" style={{ marginBottom: 28 }}>
        {reportCards.map((r) => {
          const Icon = r.icon;
          const isActive = tab === r.key;
          return (
            <div
              key={r.key}
              className="panel"
              style={{
                border: isActive ? `1px solid ${r.color}` : '1px solid var(--border)',
                cursor: 'pointer',
              }}
              onClick={() => setTab(r.key)}
            >
              <Icon size={20} color={r.color} style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{r.title}</div>
              <div className="text-secondary" style={{ fontSize: 12, marginBottom: 16, minHeight: 32 }}>{r.desc}</div>
              <button
                className="btn btn--ghost btn--sm"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={(e) => {
                  e.stopPropagation();
                  generateReport(r.key);
                }}
              >
                Generate
              </button>
            </div>
          );
        })}
      </div>

      {/* Generated report preview */}
      {generatedReport && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel__title">
            <FileText size={16} color="var(--teal)" /> {generatedReport.type} Report
          </div>
          <pre style={{
            whiteSpace: 'pre-wrap',
            fontSize: 12,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            background: 'var(--bg-surface)',
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--border)',
            maxHeight: 300,
            overflow: 'auto',
          }}>
            {generatedReport.content}
          </pre>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn btn--ghost btn--sm" onClick={() => handleExport('txt')}>
              <FileDown size={14} /> Download TXT
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => handleExport('csv')}>
              <FileSpreadsheet size={14} /> Download CSV
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => handleExport('json')}>
              <FileText size={14} /> Download JSON
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel__title">
          <Wand2 size={16} color="var(--teal)" /> Custom Report Builder: Filters
        </div>

        <div className="form-row" style={{ marginBottom: 18 }}>
          <div className="form-field">
            <label>Module</label>
            <select value={customModule} onChange={(e) => setCustomModule(e.target.value)}>
              <option value="Environmental">Environmental</option>
              <option value="Social">Social</option>
              <option value="Governance">Governance</option>
              <option value="Gamification">Gamification</option>
            </select>
          </div>
          <div className="form-field">
            <label>Date From</label>
            <input type="date" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Date To</label>
            <input type="date" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button className="btn btn--teal" onClick={() => generateReport('Custom Builder')} disabled={loadingCustom}>
            <Play size={14} /> {loadingCustom ? 'Running...' : 'Run Report'}
          </button>
          <button className="btn btn--ghost" onClick={() => handleExport('txt')} disabled={!generatedReport || generatedReport.type !== 'Custom Builder'}>
            <FileDown size={14} /> Export: TXT
          </button>
          <button className="btn btn--ghost" onClick={() => handleExport('json')} disabled={!generatedReport || generatedReport.type !== 'Custom Builder'}>
            <FileText size={14} /> Export: JSON
          </button>
        </div>
      </div>
    </div>
  );
}
