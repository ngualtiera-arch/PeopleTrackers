import type { Agent } from '@peopletrackers/db';
import { escapeHtml, type CompanySettings } from '../layout.js';

/** Agent Envelope — spec §13.2 #11. Same caveats as clientEnvelope.ts (D14, no sample supplied). */
export function agentEnvelopeTemplate(agent: Agent, company: CompanySettings): string {
  const recipientLines = [
    agent.name,
    agent.company,
    agent.addr1,
    agent.addr2,
    [agent.city, agent.state, agent.postcode].filter(Boolean).join(' '),
    agent.country && agent.country !== 'Australia' ? agent.country : null,
  ].filter(Boolean);

  return `
    <div style="font-family: Helvetica, Arial, sans-serif; font-size: 10px; width: 100%; height: 100%; position: relative; padding: 8mm;">
      <div style="position:absolute;top:8mm;left:8mm;font-size:8px;color:#333;">
        <div style="font-weight:bold;">${escapeHtml(company.tradingAs)}</div>
        <div>${escapeHtml(company.postalAddress)}</div>
      </div>
      <div style="position:absolute;top:45mm;left:60mm;font-size:12px;line-height:1.5;">
        ${recipientLines.map(escapeHtml).join('<br/>')}
      </div>
    </div>
  `;
}
