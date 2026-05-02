// US Curriculum reference data for Nova AI generation
// Used when generating flashcards/quizzes aligned to US standards
export const US_CURRICULUM = {
  'AP Biology': {
    units: [
      'Unit 1: Chemistry of Life',
      'Unit 2: Cell Structure and Function',
      'Unit 3: Cellular Energetics',
      'Unit 4: Cell Communication and Cell Cycle',
      'Unit 5: Heredity',
      'Unit 6: Gene Expression and Regulation',
      'Unit 7: Natural Selection',
      'Unit 8: Ecology',
    ],
    exam: 'AP Biology Exam (College Board)',
    level: 'AP'
  },
  'AP US History': {
    units: [
      'Period 1: 1491-1607',
      'Period 2: 1607-1754',
      'Period 3: 1754-1800',
      'Period 4: 1800-1848',
      'Period 5: 1844-1877',
      'Period 6: 1865-1898',
      'Period 7: 1890-1945',
      'Period 8: 1945-1980',
      'Period 9: 1980-Present',
    ],
    exam: 'AP United States History Exam (College Board)',
    level: 'AP'
  },
  'AP Chemistry': {
    units: [
      'Unit 1: Atomic Structure and Properties',
      'Unit 2: Molecular and Ionic Compound Structure',
      'Unit 3: Intermolecular Forces and Properties',
      'Unit 4: Chemical Reactions',
      'Unit 5: Kinetics',
      'Unit 6: Thermodynamics',
      'Unit 7: Equilibrium',
      'Unit 8: Acids and Bases',
      'Unit 9: Applications of Thermodynamics',
    ],
    exam: 'AP Chemistry Exam (College Board)',
    level: 'AP'
  },
  'AP Calculus AB': {
    units: [
      'Unit 1: Limits and Continuity',
      'Unit 2: Differentiation — Definition and Fundamental Properties',
      'Unit 3: Differentiation — Composite, Implicit, Inverse Functions',
      'Unit 4: Contextual Applications of Differentiation',
      'Unit 5: Analytical Applications of Differentiation',
      'Unit 6: Integration and Accumulation of Change',
      'Unit 7: Differential Equations',
      'Unit 8: Applications of Integration',
    ],
    exam: 'AP Calculus AB Exam (College Board)',
    level: 'AP'
  },
  'AP English Language': {
    units: [
      'Unit 1: Rhetorical Situation',
      'Unit 2: Claims and Evidence',
      'Unit 3: Reasoning and Organization',
      'Unit 4: Style',
      'Unit 5: Argument',
      'Unit 6: Synthesis',
      'Unit 7: Final Review',
    ],
    exam: 'AP English Language and Composition Exam',
    level: 'AP'
  },
  'SAT Math': {
    units: [
      'Algebra',
      'Advanced Math',
      'Problem Solving and Data Analysis',
      'Geometry and Trigonometry',
    ],
    exam: 'SAT (College Board)',
    level: 'SAT'
  },
  'SAT Reading & Writing': {
    units: [
      'Information and Ideas',
      'Craft and Structure',
      'Expression of Ideas',
      'Standard English Conventions',
    ],
    exam: 'SAT (College Board)',
    level: 'SAT'
  },
  'Common Core Math 6': { units: ['Ratios','Arithmetic','Expressions','Geometry','Statistics'], exam: 'Common Core Grade 6', level: 'Middle School' },
  'Common Core Math 7': { units: ['Ratios','Number System','Expressions','Geometry','Probability'], exam: 'Common Core Grade 7', level: 'Middle School' },
  'Common Core Math 8': { units: ['Number System','Expressions','Functions','Geometry','Statistics'], exam: 'Common Core Grade 8', level: 'Middle School' },
  'Algebra I': { units: ['Linear Equations','Linear Inequalities','Systems','Polynomials','Quadratics','Data'], exam: 'State Standards', level: 'High School' },
  'Algebra II': { units: ['Polynomials','Rational Functions','Exponential','Logarithms','Trigonometry','Statistics'], exam: 'State Standards', level: 'High School' },
  'Geometry': { units: ['Congruence','Similarity','Circles','Coordinate Geometry','Solid Geometry','Probability'], exam: 'State Standards', level: 'High School' },
  'US Government': { units: ['Constitutional Foundations','Civil Liberties','Political Participation','Institutions','Policy'], exam: 'State Standards', level: 'High School' },
  'Economics': { units: ['Microeconomics','Macroeconomics','Personal Finance','International Trade','Economic Systems'], exam: 'State Standards', level: 'High School' },
}

export const CURRICULUM_LEVELS = ['AP', 'SAT', 'High School', 'Middle School', 'Elementary']
export const CURRICULUM_SUBJECTS = Object.keys(US_CURRICULUM)