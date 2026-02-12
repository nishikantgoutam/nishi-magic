// ============================================================================
// DevWeaver – MCP Tools
//
// Exposes DevWeaver functions as MCP tools.
// ============================================================================

import type { Tool } from '../types/index.js';
import {
  initializeProject,
  addPhase,
  insertPhase,
  removePhase,
  completePhase,
  newMilestone,
  completeMilestone,
  readRoadmap,
  readState,
  readRequirements,
  readProject,
  readConfig,
  updateState,
  createConfig,
} from '../utils/docs.js';

/**
 * Get all DevWeaver tools for MCP
 */
export function getDevWeaverTools(): Tool[] {
  return [
    // ========================================================================
    // PROJECT INITIALIZATION
    // ========================================================================
    {
      name: 'devweaver_init_project',
      description: 'Initialize a new DevWeaver project with .planning/ directory and documentation',
      input_schema: {
        type: 'object',
        properties: {
          projectName: {
            type: 'string',
            description: 'Name of the project',
          },
          description: {
            type: 'string',
            description: 'Project description',
          },
          techStack: {
            type: 'array',
            items: { type: 'string' },
            description: 'Technology stack (e.g., ["TypeScript", "Node.js", "React"])',
          },
        },
        required: ['projectName', 'description'],
      },
      execute: async (input: unknown) => {
        const { projectName, description, techStack } = input as {
          projectName: string;
          description: string;
          techStack?: string[];
        };

        // Create project data structures
        const project = {
          name: projectName,
          vision: description,
          goals: [],
          constraints: [],
          technicalStack: techStack || [],
        };

        const requirements = {
          functional: [],
          nonFunctional: [],
          integrations: [],
          outOfScope: [],
        };

        const roadmap = {
          milestones: [
            {
              name: 'Initial Release',
              version: 'v1.0.0',
              phases: [
                {
                  number: 1,
                  name: 'Foundation',
                  description: 'Set up project foundation',
                  status: 'pending' as const,
                },
              ],
            },
          ],
          currentMilestone: 'v1.0.0',
          currentPhase: 1,
        };

        initializeProject(project, requirements, roadmap);
        return {
          success: true,
          message: `Project "${projectName}" initialized successfully`,
          files: [
            '.planning/PROJECT.md',
            '.planning/REQUIREMENTS.md',
            '.planning/ROADMAP.md',
            '.planning/STATE.md',
            '.planning/config.json',
          ],
        };
      },
    },

    // ========================================================================
    // PHASE MANAGEMENT
    // ========================================================================
    {
      name: 'devweaver_add_phase',
      description: 'Add a new phase to the current milestone in the roadmap',
      input_schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Phase name (e.g., "Setup", "Implementation")',
          },
          description: {
            type: 'string',
            description: 'What this phase will achieve',
          },
          milestoneVersion: {
            type: 'string',
            description: 'Optional: Milestone version (defaults to current)',
          },
        },
        required: ['name', 'description'],
      },
      execute: async (input: unknown) => {
        const { name, description, milestoneVersion } = input as {
          name: string;
          description: string;
          milestoneVersion?: string;
        };

        addPhase(name, description, milestoneVersion);
        const roadmap = readRoadmap();
        const milestone = roadmap?.milestones.find(
          m => m.version === (milestoneVersion || roadmap.currentMilestone)
        );
        const phaseNumber = milestone?.phases.length || 0;

        return {
          success: true,
          phaseNumber,
          message: `Phase ${phaseNumber} added: ${name}`,
        };
      },
    },

    {
      name: 'devweaver_insert_phase',
      description: 'Insert a phase at a specific position in the roadmap',
      input_schema: {
        type: 'object',
        properties: {
          position: {
            type: 'number',
            description: 'Position to insert (1-based index)',
          },
          name: {
            type: 'string',
            description: 'Phase name',
          },
          description: {
            type: 'string',
            description: 'Phase description',
          },
          milestoneVersion: {
            type: 'string',
            description: 'Optional: Milestone version (defaults to current)',
          },
        },
        required: ['position', 'name', 'description'],
      },
      execute: async (input: unknown) => {
        const { position, name, description, milestoneVersion } = input as {
          position: number;
          name: string;
          description: string;
          milestoneVersion?: string;
        };

        insertPhase(position, name, description, milestoneVersion);
        return {
          success: true,
          message: `Phase inserted at position ${position}: ${name}`,
        };
      },
    },

    {
      name: 'devweaver_remove_phase',
      description: 'Remove a phase from the roadmap',
      input_schema: {
        type: 'object',
        properties: {
          phaseNumber: {
            type: 'number',
            description: 'Phase number to remove',
          },
          milestoneVersion: {
            type: 'string',
            description: 'Optional: Milestone version (defaults to current)',
          },
        },
        required: ['phaseNumber'],
      },
      execute: async (input: unknown) => {
        const { phaseNumber, milestoneVersion } = input as {
          phaseNumber: number;
          milestoneVersion?: string;
        };

        removePhase(phaseNumber, milestoneVersion);
        return {
          success: true,
          message: `Phase ${phaseNumber} removed`,
        };
      },
    },

    {
      name: 'devweaver_complete_phase',
      description: 'Mark a phase as completed',
      input_schema: {
        type: 'object',
        properties: {
          phaseNumber: {
            type: 'number',
            description: 'Phase number to complete (defaults to current phase)',
          },
          milestoneVersion: {
            type: 'string',
            description: 'Optional: Milestone version (defaults to current)',
          },
        },
        required: [],
      },
      execute: async (input: unknown) => {
        const { phaseNumber, milestoneVersion } = (input as {
          phaseNumber?: number;
          milestoneVersion?: string;
        }) || {};

        const roadmap = readRoadmap();
        const effectivePhaseNumber = phaseNumber || roadmap?.currentPhase || 1;

        completePhase(effectivePhaseNumber, milestoneVersion);
        return {
          success: true,
          phaseNumber: effectivePhaseNumber,
          message: `Phase ${effectivePhaseNumber} completed`,
        };
      },
    },

    // ========================================================================
    // MILESTONE MANAGEMENT
    // ========================================================================
    {
      name: 'devweaver_new_milestone',
      description: 'Create a new development milestone',
      input_schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Milestone name (e.g., "MVP Release", "Beta Launch")',
          },
          version: {
            type: 'string',
            description: 'Version string (e.g., "v1.0.0", "v2.0.0")',
          },
          initialPhases: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
              },
              required: ['name', 'description'],
            },
            description: 'Initial phases for this milestone',
          },
        },
        required: ['name', 'version', 'initialPhases'],
      },
      execute: async (input: unknown) => {
        const { name, version, initialPhases } = input as {
          name: string;
          version: string;
          initialPhases: Array<{ name: string; description: string }>;
        };

        newMilestone(name, version, initialPhases);
        return {
          success: true,
          milestone: { name, version },
          phases: initialPhases.length,
          message: `Milestone "${name}" (${version}) created with ${initialPhases.length} phases`,
        };
      },
    },

    {
      name: 'devweaver_complete_milestone',
      description: 'Complete and archive a milestone',
      input_schema: {
        type: 'object',
        properties: {
          version: {
            type: 'string',
            description: 'Milestone version to complete (defaults to current)',
          },
        },
        required: [],
      },
      execute: async (input: unknown) => {
        const { version } = (input as { version?: string }) || {};

        completeMilestone(version);
        const roadmap = readRoadmap();
        const effectiveVersion = version || roadmap?.currentMilestone || 'unknown';

        return {
          success: true,
          version: effectiveVersion,
          message: `Milestone ${effectiveVersion} completed and archived`,
          archivePath: `.planning/archive/${effectiveVersion}`,
        };
      },
    },

    // ========================================================================
    // DOCUMENTATION READING
    // ========================================================================
    {
      name: 'devweaver_read_roadmap',
      description: 'Read the current roadmap with all milestones and phases',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        const roadmap = readRoadmap();
        if (!roadmap) {
          return {
            success: false,
            message: 'No roadmap found. Run devweaver_init_project first.',
          };
        }
        return {
          success: true,
          roadmap,
        };
      },
    },

    {
      name: 'devweaver_read_state',
      description: 'Read the current project state (decisions, blockers, notes)',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        const state = readState();
        if (!state) {
          return {
            success: false,
            message: 'No state found. Run devweaver_init_project first.',
          };
        }
        return {
          success: true,
          state,
        };
      },
    },

    {
      name: 'devweaver_read_requirements',
      description: 'Read the project requirements',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        const requirements = readRequirements();
        if (!requirements) {
          return {
            success: false,
            message: 'No requirements found. Run devweaver_init_project first.',
          };
        }
        return {
          success: true,
          requirements,
        };
      },
    },

    {
      name: 'devweaver_read_project',
      description: 'Read the project vision and direction',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        const project = readProject();
        if (!project) {
          return {
            success: false,
            message: 'No project found. Run devweaver_init_project first.',
          };
        }
        return {
          success: true,
          project,
        };
      },
    },

    {
      name: 'devweaver_read_config',
      description: 'Read DevWeaver configuration settings',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        const config = readConfig();
        return {
          success: true,
          config: config || {},
        };
      },
    },

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    {
      name: 'devweaver_update_state',
      description: 'Update project state (add decisions, blockers, notes)',
      input_schema: {
        type: 'object',
        properties: {
          decision: {
            type: 'object',
            properties: {
              decision: { type: 'string' },
              rationale: { type: 'string' },
            },
            description: 'Add a decision',
          },
          blocker: {
            type: 'object',
            properties: {
              phase: { type: 'number' },
              description: { type: 'string' },
              status: {
                type: 'string',
                enum: ['open', 'resolved'],
              },
            },
            description: 'Add a blocker',
          },
          note: {
            type: 'string',
            description: 'Add a note',
          },
        },
        required: [],
      },
      execute: async (input: unknown) => {
        const { decision, blocker, note } = (input as {
          decision?: { decision: string; rationale: string };
          blocker?: { phase?: number; description: string; status: 'open' | 'resolved' };
          note?: string;
        }) || {};

        const state = readState() || { decisions: [], blockers: [], notes: [] };

        if (decision) {
          state.decisions.push({
            date: new Date().toISOString().split('T')[0]!,
            ...decision,
          });
        }

        if (blocker) {
          state.blockers.push(blocker);
        }

        if (note) {
          state.notes.push(note);
        }

        updateState(state);

        return {
          success: true,
          message: 'State updated',
          updates: {
            decision: !!decision,
            blocker: !!blocker,
            note: !!note,
          },
        };
      },
    },

    {
      name: 'devweaver_update_config',
      description: 'Update DevWeaver configuration settings',
      input_schema: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['interactive', 'yolo'],
            description: 'Execution mode',
          },
          depth: {
            type: 'string',
            enum: ['quick', 'standard', 'comprehensive'],
            description: 'Planning depth',
          },
          profile: {
            type: 'string',
            enum: ['quality', 'balanced', 'budget'],
            description: 'Model profile',
          },
        },
        required: [],
      },
      execute: async (input: unknown) => {
        const updates = input as Record<string, unknown>;
        const currentConfig = readConfig() || {};
        const newConfig = { ...currentConfig, ...updates };

        createConfig(newConfig);

        return {
          success: true,
          message: 'Configuration updated',
          config: newConfig,
        };
      },
    },

    // ========================================================================
    // UTILITY TOOLS
    // ========================================================================
    {
      name: 'devweaver_get_current_phase',
      description: 'Get the current phase number and details',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        const roadmap = readRoadmap();
        if (!roadmap || !roadmap.currentPhase) {
          return {
            success: false,
            message: 'No current phase found',
          };
        }

        const milestone = roadmap.milestones.find(
          m => m.version === roadmap.currentMilestone
        );
        const phase = milestone?.phases.find(p => p.number === roadmap.currentPhase);

        return {
          success: true,
          currentPhase: roadmap.currentPhase,
          phase,
          milestone: {
            name: milestone?.name,
            version: milestone?.version,
          },
        };
      },
    },

    {
      name: 'devweaver_get_progress',
      description: 'Get overall project progress summary',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        const roadmap = readRoadmap();
        const state = readState();

        if (!roadmap) {
          return {
            success: false,
            message: 'No roadmap found',
          };
        }

        const milestone = roadmap.milestones.find(
          m => m.version === roadmap.currentMilestone
        );

        if (!milestone) {
          return {
            success: false,
            message: 'Current milestone not found',
          };
        }

        const totalPhases = milestone.phases.length;
        const completedPhases = milestone.phases.filter(
          p => p.status === 'completed'
        ).length;
        const inProgressPhases = milestone.phases.filter(
          p => p.status === 'in-progress'
        ).length;
        const pendingPhases = milestone.phases.filter(
          p => p.status === 'pending'
        ).length;

        return {
          success: true,
          milestone: {
            name: milestone.name,
            version: milestone.version,
          },
          progress: {
            total: totalPhases,
            completed: completedPhases,
            inProgress: inProgressPhases,
            pending: pendingPhases,
            percentage: Math.round((completedPhases / totalPhases) * 100),
          },
          currentPhase: roadmap.currentPhase,
          blockers: state?.blockers.filter(b => b.status === 'open').length || 0,
        };
      },
    },
  ];
}
