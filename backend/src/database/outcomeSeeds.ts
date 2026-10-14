export const DEFAULT_PROGRAM_OUTCOMES = [
  {
    code: 'PO1',
    title: 'Engineering Knowledge',
    description: 'Apply the knowledge of mathematics, science, engineering fundamentals, and an engineering specialization to the solution of complex engineering problems.'
  },
  {
    code: 'PO2',
    title: 'Problem Analysis',
    description: 'Identify, formulate, review research literature, and analyze complex engineering problems reaching substantiated conclusions using first principles of mathematics, natural sciences, and engineering sciences.'
  },
  {
    code: 'PO3',
    title: 'Design/Development of Solutions',
    description: 'Design solutions for complex engineering problems and design system components or processes that meet the specified needs with appropriate consideration for the public health and safety, and the cultural, societal, and environmental considerations.'
  },
  {
    code: 'PO4',
    title: 'Conduct Investigations of Complex Problems',
    description: 'Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data, and synthesis of the information to provide valid conclusions.'
  },
  {
    code: 'PO5',
    title: 'Modern Tool Usage',
    description: 'Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools including prediction and modeling to complex engineering activities with an understanding of the limitations.'
  },
  {
    code: 'PO6',
    title: 'The Engineer and Society',
    description: 'Apply reasoning informed by the contextual knowledge to assess societal, health, safety, legal and cultural issues and the consequent responsibilities relevant to the professional engineering practice.'
  },
  {
    code: 'PO7',
    title: 'Environment and Sustainability',
    description: 'Understand the impact of the professional engineering solutions in societal and environmental contexts, and demonstrate the knowledge of, and need for sustainable development.'
  },
  {
    code: 'PO8',
    title: 'Ethics',
    description: 'Apply ethical principles and commit to professional ethics and responsibilities and norms of the engineering practice.'
  },
  {
    code: 'PO9',
    title: 'Individual and Team Work',
    description: 'Function effectively as an individual, and as a member or leader in diverse teams, and in multidisciplinary settings.'
  },
  {
    code: 'PO10',
    title: 'Communication',
    description: 'Communicate effectively on complex engineering activities with the engineering community and with society at large, such as, being able to comprehend and write effective reports and design documentation, make effective presentations, and give and receive clear instructions.'
  },
  {
    code: 'PO11',
    title: 'Project Management and Finance',
    description: 'Demonstrate knowledge and understanding of the engineering and management principles and apply these to one’s own work, as a member and leader in a team, to manage projects and in multidisciplinary environments.'
  },
  {
    code: 'PO12',
    title: 'Life-long Learning',
    description: 'Recognize the need for, and have the preparation and ability to engage in independent and life-long learning in the broadest context of technological change.'
  }
];

export const DEFAULT_PROGRAM_EDUCATIONAL_OBJECTIVES = [
  {
    code: 'PEO1',
    title: 'Professional Excellence',
    description: 'Graduates will possess solid fundamental knowledge of engineering and science to solve complex real-world problems and pursue higher studies.'
  },
  {
    code: 'PEO2',
    title: 'Innovation and Design',
    description: 'Graduates will be able to design, develop and implement innovative and cost-effective solutions for engineering problems taking into account environmental, social and economic constraints.'
  },
  {
    code: 'PEO3',
    title: 'Leadership and Ethics',
    description: 'Graduates will exhibit professional and ethical attitude, effective communication skills, teamwork skills, multidisciplinary approach, and an ability to relate engineering issues to broader social context.'
  },
  {
    code: 'PEO4',
    title: 'Lifelong Learning',
    description: 'Graduates will recognize the need for and have the preparation and ability to engage in independent and life-long learning in the broadest context of technological changes.'
  }
];

export function getDepartmentPSOs(deptName: string): { code: string; title: string; description: string }[] {
  const normalized = (deptName || '').toUpperCase().trim();

  if (normalized.includes('MECH')) {
    return [
      {
        code: 'PSO1',
        title: 'Mechanical Systems Design & Analysis',
        description: 'Apply principles of mechanics, thermal-fluids, and materials science to design and analyze mechanical components and systems using modern CAD/CAE tools.'
      },
      {
        code: 'PSO2',
        title: 'Manufacturing & Industrial Applications',
        description: 'Develop and implement advanced manufacturing techniques, automation, and industrial practices for sustainable production.'
      }
    ];
  }

  if (normalized.includes('CSE') || normalized.includes('IT')) {
    return [
      {
        code: 'PSO1',
        title: 'Software Development',
        description: 'Apply software engineering practices and strategies in software project development using modern programming environments to deliver quality products.'
      },
      {
        code: 'PSO2',
        title: 'Data Science & AI',
        description: 'Design and develop intelligent computing systems and data-driven solutions in areas related to Data Science, Machine Learning, and Artificial Intelligence.'
      }
    ];
  }

  if (normalized.includes('ECE')) {
    return [
      {
        code: 'PSO1',
        title: 'Electronic Circuits & VLSI Systems',
        description: 'Design, simulate, and validate analog and digital electronic circuits, integrated circuits, and embedded systems using modern EDA tools.'
      },
      {
        code: 'PSO2',
        title: 'Signal Processing & Wireless Communications',
        description: 'Develop and optimize communication systems, signal processing algorithms, and RF modules for modern wireless networking.'
      }
    ];
  }

  if (normalized.includes('EEE')) {
    return [
      {
        code: 'PSO1',
        title: 'Electrical Power & Energy Systems',
        description: 'Analyze, design, and manage electrical power systems, smart grids, and renewable energy conversion systems.'
      },
      {
        code: 'PSO2',
        title: 'Control Systems & Power Electronics Drives',
        description: 'Design and implement advanced control strategies and power electronic drives for industrial automation and electric mobility.'
      }
    ];
  }

  if (normalized.includes('CIVIL')) {
    return [
      {
        code: 'PSO1',
        title: 'Structural Analysis & Design',
        description: 'Plan, analyze, and design resilient structural elements and modern infrastructure using relevant design standards and computational tools.'
      },
      {
        code: 'PSO2',
        title: 'Geotechnical & Environmental Systems',
        description: 'Evaluate soil mechanics, geotechnical parameters, and water resources to deliver sustainable environmental solutions.'
      }
    ];
  }

  if (normalized.includes('AI') || normalized.includes('DATA')) {
    return [
      {
        code: 'PSO1',
        title: 'Intelligent Systems & Deep Learning',
        description: 'Formulate and develop deep learning architectures and cognitive computing solutions to solve complex domain problems.'
      },
      {
        code: 'PSO2',
        title: 'Data Engineering & Cloud Analytics',
        description: 'Engineer high-throughput data processing pipelines and deploy scalable analytics solutions across modern cloud platforms.'
      }
    ];
  }

  return [
    {
      code: 'PSO1',
      title: 'Applied Domain Expertise',
      description: 'Demonstrate deep understanding of fundamental principles and apply them to analyze and resolve modern discipline challenges.'
    },
    {
      code: 'PSO2',
      title: 'Professional & Technical Applications',
      description: 'Formulate methodologies and utilize analytical tools to develop practical, ethical, and sustainable solutions.'
    }
  ];
}
