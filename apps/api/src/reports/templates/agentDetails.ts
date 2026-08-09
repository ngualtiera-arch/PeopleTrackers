import type { Prisma } from '@peopletrackers/db';
import { escapeHtml, escapeMultiline, REPORT_BODY_FONT } from '../layout.js';

type AgentWithSkills = Prisma.AgentGetPayload<{ include: { skills: true } }>;

const SKILL_LABELS: Record<string, string> = {
  skip_tracing: 'Skip Tracing',
  process_serving: 'Process Serving',
  debt_collection: 'Debt Collection',
};

function addressBlock(label: string, lines: (string | null)[]): string {
  const filled = lines.filter(Boolean);
  return `
    <div style="margin-bottom:10px;">
      <div style="font-weight:bold;font-size:9px;text-transform:uppercase;color:#666;">${label}</div>
      <div>${filled.length ? filled.map(escapeHtml).join('<br/>') : '—'}</div>
    </div>
  `;
}

function field(label: string, value: string | number | null): string {
  return `
    <div style="margin-bottom:8px;">
      <div style="font-weight:bold;font-size:9px;text-transform:uppercase;color:#666;">${label}</div>
      <div>${value !== null && value !== '' ? escapeHtml(String(value)) : '—'}</div>
    </div>
  `;
}

/** Agent Details — spec §13.2 #9, §13.3 "full address block". Mobile/Rate omitted — D13. */
export function agentDetailsTemplate(agent: AgentWithSkills): string {
  const dateStr = new Date().toLocaleDateString('en-AU');
  const skills = agent.skills.map((s) => SKILL_LABELS[s.skill] ?? s.skill).join(', ') || '—';

  return `
    <div style="${REPORT_BODY_FONT}">
      <h1 style="font-size:16px;margin:0 0 4px 0;">Agent Details</h1>
      <div style="font-size:10px;color:#666;margin-bottom:16px;">${dateStr}</div>

      <h2 style="font-size:13px;margin:0 0 8px 0;">${escapeHtml(agent.name) || `Agent ${agent.reference}`}</h2>

      <table style="width:100%;"><tr>
        <td style="width:50%;vertical-align:top;padding-right:16px;">
          ${field('ID Agent', agent.reference)}
          ${field('Company', agent.company)}
          ${field('Email', agent.email)}
          ${field('Phone', agent.phone)}
          ${field('Fax', agent.fax)}
        </td>
        <td style="width:50%;vertical-align:top;">
          ${addressBlock('Address', [agent.addr1, agent.addr2, [agent.city, agent.state, agent.postcode].filter(Boolean).join(' '), agent.country])}
          ${field('Skills', skills)}
        </td>
      </tr></table>

      <div style="margin-top:8px;">
        <div style="font-weight:bold;font-size:9px;text-transform:uppercase;color:#666;">Notes</div>
        <div>${agent.notes ? escapeMultiline(agent.notes) : '—'}</div>
      </div>
    </div>
  `;
}
