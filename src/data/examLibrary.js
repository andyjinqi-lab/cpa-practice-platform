export const examYears = Array.from({ length: 13 }, (_, index) => 2025 - index)

export const examCatalog = [
  {
    id: 1,
    stage: 'professional',
    short: '会计',
    name: 'CPA 会计真题',
    description: '核心难度最高，建议优先建立章节知识框架后再刷整卷。',
    duration: '180 分钟',
    pdfDirectory: 'accounting',
    fileKeyword: '会计'
  },
  {
    id: 2,
    stage: 'professional',
    short: '审计',
    name: 'CPA 审计真题',
    description: '适合搭配审计流程图与高频关键词一起练习，提升做题定位速度。',
    duration: '150 分钟',
    pdfDirectory: 'audit',
    fileKeyword: '审计'
  },
  {
    id: 3,
    stage: 'professional',
    short: '财管',
    name: 'CPA 财务成本管理真题',
    description: '计算密度高，建议整卷计时训练，重点关注公式切换和题速控制。',
    duration: '150 分钟',
    pdfDirectory: 'finance',
    fileKeyword: '财务成本管理'
  },
  {
    id: 4,
    stage: 'professional',
    short: '税法',
    name: 'CPA 税法真题',
    description: '适合按税种复盘错题，再做整卷巩固综合计算题。',
    duration: '120 分钟',
    pdfDirectory: 'tax',
    fileKeyword: '税法'
  },
  {
    id: 5,
    stage: 'professional',
    short: '经济法',
    name: 'CPA 经济法真题',
    description: '偏法条理解与记忆，适合通过真题回收高频法条考法。',
    duration: '120 分钟',
    pdfDirectory: 'law',
    fileKeyword: '经济法'
  },
  {
    id: 6,
    stage: 'professional',
    short: '战略',
    name: 'CPA 公司战略与风险管理真题',
    description: '内容相对集中，适合短周期冲刺和主观题答题结构训练。',
    duration: '120 分钟',
    pdfDirectory: 'strategy',
    fileKeyword: '公司战略与风险管理'
  },
  {
    id: 7,
    stage: 'comprehensive',
    short: '综合一',
    name: '职业能力综合测试（试卷一）',
    description: '聚焦会计、审计、税法的综合案例分析与职业判断。',
    content: '偏鉴证业务场景',
    duration: '210 分钟',
    pdfDirectory: 'comprehensive',
    fileKeyword: '综合阶段试卷一'
  },
  {
    id: 8,
    stage: 'comprehensive',
    short: '综合二',
    name: '职业能力综合测试（试卷二）',
    description: '覆盖财管、战略、经济法相关综合题型，强调管理视角。',
    content: '偏管理咨询场景',
    duration: '210 分钟',
    pdfDirectory: 'comprehensive',
    fileKeyword: '综合阶段试卷二'
  }
]

export const professionalExams = examCatalog.filter((exam) => exam.stage === 'professional')
// 综合阶段暂时隐藏，不在页面展示
export const comprehensiveExams = []

const combinedYearsByDirectory = {
  accounting: [2024, 2025],
  audit: [2024, 2025],
  finance: [2024, 2025],
  law: [2024, 2025],
  strategy: [2024, 2025],
  tax: [2013, 2014, 2015, 2024, 2025]
}

export const getExamById = (examId) => examCatalog.find((exam) => exam.id === Number(examId)) || examCatalog[0]

export const hasCombinedPdf = (exam, year) => {
  const years = combinedYearsByDirectory[exam.pdfDirectory] || []
  return years.includes(Number(year))
}

export const getPdfAssets = (exam, year) => {
  const numericYear = Number(year)

  if (exam.pdfDirectory === 'comprehensive') {
    return {
      question: '',
      answer: '',
      combined: '',
      available: false,
      mode: 'missing'
    }
  }

  if (hasCombinedPdf(exam, numericYear)) {
    const combined = `/pdf/${exam.pdfDirectory}/${numericYear}_${exam.fileKeyword}_题目和答案.pdf`
    return {
      question: combined,
      answer: combined,
      combined,
      available: true,
      mode: 'combined'
    }
  }

  return {
    question: `/pdf/${exam.pdfDirectory}/${numericYear}_${exam.fileKeyword}_题目.pdf`,
    answer: `/pdf/${exam.pdfDirectory}/${numericYear}_${exam.fileKeyword}_答案.pdf`,
    combined: '',
    available: true,
    mode: 'split'
  }
}
