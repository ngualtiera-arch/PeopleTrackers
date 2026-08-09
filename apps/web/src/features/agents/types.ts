import type { Agent, AgentSkillCode } from '@peopletrackers/shared';

export interface AgentWithSkills extends Omit<Agent, 'skills'> {
  skills: { agentId: string; skill: AgentSkillCode }[];
}

export interface AgentListResponse {
  items: AgentWithSkills[];
  total: number;
  page: number;
  pageSize: number;
}
