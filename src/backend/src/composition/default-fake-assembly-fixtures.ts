import type { FakeResonanceCaseRecord } from "@psyai/resonance";
import type { SimulationScenario } from "@psyai/simulation";

export interface FakeBackendAssemblyFixtures {
  simulationScenario: SimulationScenario;
  simulationScenarios?: SimulationScenario[];
  resonanceCatalog: FakeResonanceCaseRecord[];
}

function createScenarioVariant(options: {
  scenarioId: string;
  title: string;
  description: string;
  openingTitle: string;
  openingSummary: string;
  playerGoal: string;
  location: string;
  pressureSource: string;
  nodeTitles: [string, string, string, string, string, string];
  finaleBranches?: [
    { label: string; nextNodeId: string },
    { label: string; nextNodeId: string }
  ];
}): SimulationScenario {
  const scenario = structuredClone(defaultFakeAssemblySimulationScenario);
  scenario.scenarioId = options.scenarioId;
  scenario.title = options.title;
  scenario.description = options.description;
  scenario.opening = {
    sceneTitle: options.openingTitle,
    sceneSummary: options.openingSummary,
    playerGoal: options.playerGoal
  };
  if (scenario.environmentSeed) {
    scenario.environmentSeed.location = options.location;
    scenario.environmentSeed.pressureSource = options.pressureSource;
    scenario.environmentSeed.initialState = `${options.location}里的空气已经开始收紧。`;
  }
  scenario.nodes = scenario.nodes.map((node, index) => ({
    ...node,
    title: options.nodeTitles[index] ?? node.title
  }));
  const finaleNode = scenario.nodes[5];
  if (finaleNode) {
    finaleNode.kind = "event";
    finaleNode.summary = `${options.location}里的局势没有真正结束，只是进入了下一轮余波与重组。`;
    finaleNode.branches = (options.finaleBranches ?? [
      { label: "顺着刚刚松动的关系继续追问真实代价", nextNodeId: "node-003" },
      { label: "把局势重新拉回旧账与边界冲突", nextNodeId: "node-004" }
    ]).map((branch, index) => ({
      branchId: `branch-loop-${index + 1}`,
      label: branch.label,
      nextNodeId: branch.nextNodeId
    }));
  }
  return scenario;
}

export const defaultFakeAssemblySimulationScenario: SimulationScenario = {
  scenarioId: "scenario-001",
  title: "重落红尘间：旧院夜谈",
  description: "一场围绕家族压力、晚辈表态与环境施压展开的回合制多 Agent 情境模拟。",
  entryNodeId: "node-001",
  actorSeeds: [
    {
      actorId: "actor-001",
      actorName: "我",
      initialState: "压着情绪观察局势。"
    },
    {
      actorId: "actor-002",
      actorName: "二叔",
      initialState: "准备先发制人。"
    }
  ],
  nodes: [
    {
      nodeId: "node-001",
      title: "回到旧院",
      summary: "你站在回廊尽头，今晚的第一句话会决定谁先占住场面。",
      kind: "entry",
      branches: [
        {
          branchId: "branch-001",
          label: "先请二叔单独说话",
          nextNodeId: "node-002",
          setFlags: ["private-checkin-opened"]
        },
        {
          branchId: "branch-004",
          label: "先承认自己暂时不想立刻表态",
          nextNodeId: "node-002",
          setFlags: ["time-buffer-opened"]
        }
      ]
    },
    {
      nodeId: "node-002",
      title: "第一轮行动",
      summary: "场面暂时稳住，但长辈的试探和环境压力开始逼近你的真实态度。",
      kind: "decision",
      branches: [
        {
          branchId: "branch-002",
          label: "追问二叔真正担心的是什么",
          nextNodeId: "node-003",
          requiredFlags: ["private-checkin-opened"]
        },
        {
          branchId: "branch-003",
          label: "把话题转回旧事为什么一直没说开",
          nextNodeId: "node-004",
          requiredFlags: ["time-buffer-opened"]
        }
      ]
    },
    {
      nodeId: "node-003",
      title: "第二轮逼近",
      summary: "你把话题拉向动机之后，对方不再只谈表态，而开始谈后果与代价。",
      kind: "event",
      branches: [
        {
          branchId: "branch-005",
          label: "承认自己也在害怕失控",
          nextNodeId: "node-005",
          requiredFlags: ["private-checkin-opened"]
        },
        {
          branchId: "branch-006",
          label: "追问为什么所有压力都要由我来接",
          nextNodeId: "node-005",
          requiredFlags: ["private-checkin-opened"]
        }
      ]
    },
    {
      nodeId: "node-004",
      title: "旧账翻涌",
      summary: "当话题转回旧事，场面开始从表态冲突转向多年积怨。",
      kind: "event",
      branches: [
        {
          branchId: "branch-007",
          label: "指出一直没人真正问过我的想法",
          nextNodeId: "node-005",
          requiredFlags: ["time-buffer-opened"]
        },
        {
          branchId: "branch-008",
          label: "先承认自己确实也在躲",
          nextNodeId: "node-005",
          requiredFlags: ["time-buffer-opened"]
        }
      ]
    },
    {
      nodeId: "node-005",
      title: "关系松动",
      summary: "经过几轮来回，场面不再只是施压，开始出现重新定义关系的缝隙。",
      kind: "decision",
      branches: [
        {
          branchId: "branch-009",
          label: "提出今晚先停在这里，改日再谈",
          nextNodeId: "node-006"
        },
        {
          branchId: "branch-010",
          label: "要求对方先承认这些年施压带来的伤害",
          nextNodeId: "node-006"
        }
      ]
    },
    {
      nodeId: "node-006",
      title: "夜谈余波",
      summary: "这一夜暂时收住了，但关系的后续余波还在继续向前推进。",
      kind: "event",
      branches: [
        {
          branchId: "branch-011",
          label: "顺着松动后的缝隙，继续追问真实代价",
          nextNodeId: "node-003"
        },
        {
          branchId: "branch-012",
          label: "把局势再次拉回边界和旧账冲突",
          nextNodeId: "node-004"
        }
      ]
    }
  ]
};

export const defaultFakeAssemblySimulationScenarios: SimulationScenario[] = [
  defaultFakeAssemblySimulationScenario,
  createScenarioVariant({
    scenarioId: "scenario-002",
    title: "雨站重逢：末班车前",
    description: "围绕雨夜车站重逢、旧关系回潮与迟到多年回应展开的多 Agent 情境模拟。",
    openingTitle: "雨站重逢",
    openingSummary: "末班车还没进站，雨水顺着站台往下淌，旧关系在这一刻重新逼近。",
    playerGoal: "先稳住重逢后的节奏，不被旧情绪直接带走。",
    location: "夜雨车站站台",
    pressureSource: "末班车时间、雨夜重逢、旧话未清",
    nodeTitles: ["回到站台", "第一轮试探", "追问迟来的原因", "旧事翻面", "情绪松动", "站台余波"],
    finaleBranches: [
      { label: "追着末班车前的空档继续追问", nextNodeId: "node-003" },
      { label: "让雨夜气氛再次把旧事翻回来", nextNodeId: "node-004" }
    ]
  }),
  createScenarioVariant({
    scenarioId: "scenario-003",
    title: "公司复盘夜：加班室灯火",
    description: "围绕项目失误、上下级施压与责任归属展开的多 Agent 情境模拟。",
    openingTitle: "加班室灯火",
    openingSummary: "会议结束后灯还没关，留下来的人都知道今晚不只是复盘项目。",
    playerGoal: "先厘清责任边界，再决定要不要正面冲突。",
    location: "深夜加班室",
    pressureSource: "项目失误、上级表态、同事旁听",
    nodeTitles: ["留在会议室", "第一轮追责", "逼近责任核心", "旧账被翻出", "边界开始松动", "复盘余波"],
    finaleBranches: [
      { label: "继续追问哪个人需要真正承担后果", nextNodeId: "node-003" },
      { label: "再次把局势拉回旧账与权责冲突", nextNodeId: "node-004" }
    ]
  }),
  createScenarioVariant({
    scenarioId: "scenario-004",
    title: "医院走廊：家属夜谈",
    description: "围绕照护分工、家庭责任与压抑情绪外溢展开的多 Agent 情境模拟。",
    openingTitle: "医院走廊",
    openingSummary: "夜班护士刚走过，走廊只剩压低声音的家属和迟迟没说开的疲惫。",
    playerGoal: "先稳住照护争执，再决定是否把真实不满说开。",
    location: "住院部走廊",
    pressureSource: "病房静默、照护分工、连续疲劳",
    nodeTitles: ["走到病房外", "第一轮交锋", "逼近真实负担", "多年委屈上涌", "关系短暂松动", "走廊余波"],
    finaleBranches: [
      { label: "顺着疲惫和照护压力继续深挖", nextNodeId: "node-003" },
      { label: "再把老账与家庭边界拉回来", nextNodeId: "node-004" }
    ]
  })
];

export const defaultFakeAssemblyResonanceCatalog: FakeResonanceCaseRecord[] = [
  {
    caseId: "case-102",
    title: "长期家庭紧张后的情绪封闭",
    summary:
      "案例描述了反复的家庭对峙之后，来访者逐渐转向退缩和情绪钝化。",
    excerpt:
      "在多次家庭冲突之后，来访者报告自己出现了明显的情绪麻木。",
    themes: ["情绪麻木", "反复冲突", "家庭"],
    keywords: ["家庭", "冲突", "麻木", "退缩"],
    candidateSetId: "family-set"
  },
  {
    caseId: "case-205",
    title: "工作负荷过重与焦虑反刍",
    summary:
      "案例中的来访者困在不断升级的工作压力里，并在每次互动后保持高度警觉。",
    excerpt:
      "来访者始终紧绷，并反复回放与上级之间的每一次交流。",
    themes: ["焦虑", "负荷过重", "反刍"],
    keywords: ["工作", "压力", "焦虑", "紧绷"],
    candidateSetId: "work-set"
  },
  {
    caseId: "case-118",
    title: "家庭争执后的自我保护性沉默",
    summary:
      "这个案例围绕家中的反复争吵，以及为了保证安全而学会沉默的习惯展开。",
    excerpt:
      "每次争执之后，来访者都会停止回应，并退出家庭对话。",
    themes: ["家庭", "退缩", "自我保护"],
    keywords: ["家庭", "争执", "退缩", "沉默"],
    candidateSetId: "family-set"
  }
];

export const defaultFakeBackendAssemblyFixtures: FakeBackendAssemblyFixtures = {
  simulationScenario: defaultFakeAssemblySimulationScenario,
  simulationScenarios: defaultFakeAssemblySimulationScenarios,
  resonanceCatalog: defaultFakeAssemblyResonanceCatalog
};
