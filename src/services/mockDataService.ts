// src/services/mockDataService.ts

export type UserRole = 'Admin' | 'QA Lead' | 'Automation Engineer' | 'Viewer';

export type TestStatus = 'Passed' | 'Failed' | 'Skipped' | 'Running';

export interface Environment {
  name: string;
  appVersion: string;
  browser: string;
  os: string;
  device: string;
  apiEndpoint: string;
  testDataVersion: string;
  configDetails: string;
}

export interface TestCase {
  id: string;
  name: string;
  module: string;
  description: string;
  status: TestStatus;
  duration: number; // in ms
  errorMessage?: string;
  stackTrace?: string;
  screenshots: string[]; // data URLs
  logs: string[];
}

export interface Execution {
  id: string;
  name: string;
  date: string; // ISO String
  environment: Environment;
  build: string;
  triggeredBy: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  duration: number; // in seconds
  status: 'Passed' | 'Failed' | 'Running';
  testCases: TestCase[];
}

export interface Defect {
  id: string;
  title: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  severity: 'Blocker' | 'Major' | 'Minor' | 'Trivial';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  linkedTestCases: { testCaseId: string; executionId: string; testCaseName: string }[];
  linkedExecutions: string[]; // execution ids
  owner: string;
  creationDate: string;
  resolutionDate?: string;
}

// Generate Mock Dynamic SVG Screenshot
export const generateMockScreenshot = (testName: string, errorText?: string, isDark = true): string => {
  const bg = isDark ? (errorText ? '#1e1b1b' : '#0f172a') : (errorText ? '#fef2f2' : '#f8fafc');
  const accent = errorText ? '#ef4444' : '#10b981';
  const textMain = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#64748b' : '#94a3b8';
  
  const textHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <rect width="640" height="360" fill="${bg}"/>
      <rect x="15" y="15" width="610" height="330" rx="8" fill="none" stroke="${accent}" stroke-width="2"/>
      
      <!-- Top header bar -->
      <path d="M15 45 L625 45" stroke="${accent}40" stroke-width="1"/>
      <circle cx="35" cy="30" r="5" fill="#ef4444"/>
      <circle cx="50" cy="30" r="5" fill="#f59e0b"/>
      <circle cx="65" cy="30" r="5" fill="#10b981"/>
      <text x="90" y="34" fill="${textMuted}" font-family="monospace" font-size="11">browser-window://playwright-runner/viewports/1920x1080</text>
      
      <!-- Title -->
      <text x="40" y="80" fill="${accent}" font-family="monospace" font-size="18" font-weight="bold">AUTOMATION SCREENSHOT</text>
      <text x="40" y="110" fill="${textMain}" font-family="sans-serif" font-size="14" font-weight="bold">Test: ${testName}</text>
      <text x="40" y="135" fill="${textMuted}" font-family="sans-serif" font-size="12">Timestamp: ${new Date().toISOString()}</text>
      
      <line x1="40" y1="155" x2="600" y2="155" stroke="${isDark ? '#334155' : '#e2e8f0'}" stroke-width="1"/>
      
      ${errorText ? `
        <!-- Error section -->
        <rect x="40" y="175" width="560" height="150" rx="6" fill="#7f1d1d30" stroke="#ef444440" stroke-width="1"/>
        <text x="55" y="200" fill="#fca5a5" font-family="monospace" font-size="13" font-weight="bold">Exception Captured:</text>
        <text x="55" y="230" fill="#fca5a5" font-family="monospace" font-size="11">${errorText.slice(0, 75)}</text>
        <text x="55" y="255" fill="#fca5a5" font-family="monospace" font-size="11">${errorText.slice(75, 150)}</text>
        <text x="55" y="280" fill="#fca5a5" font-family="monospace" font-size="11">${errorText.slice(150, 225) || 'at Page.click (index.js:45) at runTest (test.js:12)'}</text>
      ` : `
        <!-- Success section -->
        <rect x="40" y="175" width="560" height="150" rx="6" fill="#065f4620" stroke="#10b98130" stroke-width="1"/>
        <text x="55" y="205" fill="#86efac" font-family="monospace" font-size="14" font-weight="bold">✓ ASSERTION PASSED</text>
        <text x="55" y="235" fill="${textMain}" font-family="sans-serif" font-size="12">All elements loaded correctly. Response status matched 200 OK.</text>
        <text x="55" y="260" fill="${textMuted}" font-family="sans-serif" font-size="11">Locator element [data-testid="success-banner"] is visible on screen.</text>
      `}
    </svg>
  `;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(textHtml);
};

export const MOCK_ENVIRONMENTS: Environment[] = [
  {
    name: 'Production',
    appVersion: 'v2.4.0',
    browser: 'Chrome 122, Safari 17',
    os: 'Linux (Ubuntu 22.04), macOS Sonoma',
    device: 'Desktop (1920x1080), iPhone 15 Pro',
    apiEndpoint: 'https://api.expensetracker.com/v2',
    testDataVersion: 'Prod-Release-Db-2.4',
    configDetails: 'Headless=true, Parallel=10, Retries=1'
  },
  {
    name: 'Staging',
    appVersion: 'v2.5.0-rc2',
    browser: 'Chrome 122, Firefox 123, Edge 122',
    os: 'Linux (Ubuntu 22.04), Windows 11',
    device: 'Desktop (1920x1080), Pixel 8 Pro',
    apiEndpoint: 'https://staging-api.expensetracker.com/v2',
    testDataVersion: 'Stage-Seed-Db-4.9',
    configDetails: 'Headless=true, Parallel=16, Retries=2'
  },
  {
    name: 'UAT',
    appVersion: 'v2.5.0-rc1',
    browser: 'Chrome 122, Safari 17',
    os: 'macOS Sonoma, iOS 17',
    device: 'Desktop (1920x1080), iPad Air',
    apiEndpoint: 'https://uat-api.expensetracker.com/v2',
    testDataVersion: 'Uat-Refresh-Db-1.2',
    configDetails: 'Headless=true, Parallel=4, Retries=1'
  },
  {
    name: 'QA-Internal',
    appVersion: 'v2.5.0-beta4',
    browser: 'Chrome 122 (Mobile Emulation)',
    os: 'Linux (Ubuntu 22.04)',
    device: 'Mobile Emulator (iPhone 14)',
    apiEndpoint: 'https://qa-api.expensetracker.com/v2',
    testDataVersion: 'QA-Mock-Seed-1.12',
    configDetails: 'Headless=true, Parallel=20, Retries=0'
  }
];

const MOCK_TEST_TEMPLATES = [
  { name: 'Verify user registration with email', module: 'Auth', desc: 'Checks if a new user can sign up with valid email/password.' },
  { name: 'Verify login authentication fails with wrong password', module: 'Auth', desc: 'Checks error boundaries for invalid email/password inputs.' },
  { name: 'Verify user token expiration and auto-logout', module: 'Auth', desc: 'Validates JWT token expiration redirecting to login page.' },
  { name: 'Fetch expense categories list from backend', module: 'API', desc: 'Tests backend GET /categories endpoint response and JSON schema.' },
  { name: 'Create new expense item via API', module: 'API', desc: 'Tests backend POST /expenses payload validations and database insertion.' },
  { name: 'Verify dashboard metrics displays total expenses', module: 'Dashboard', desc: 'Validates correct summation of expenses rendered on the chart card.' },
  { name: 'Filter expenses by Category dropdown', module: 'Dashboard', desc: 'Validates dynamic category filtering refreshes table items.' },
  { name: 'Export expenses list to Excel format', module: 'Reports', desc: 'Clicks export and validates spreadsheet generation and file download.' },
  { name: 'Export monthly summary report to PDF', module: 'Reports', desc: 'Generates PDF summary and checks page pagination and content headers.' },
  { name: 'Process Stripe credit card subscription', module: 'Payment', desc: 'Simulates payment modal checkout using test card credentials.' },
  { name: 'Handle failed card authorization response', module: 'Payment', desc: 'Verifies appropriate error messages are shown for insufficient card funds.' },
  { name: 'Update user profile profile picture', module: 'Settings', desc: 'Uploads PNG image and checks avatar rendering and storage sync.' },
  { name: 'Change user password and notify via email', module: 'Settings', desc: 'Tests password update validation and verification email trigger.' }
];

const MOCK_ERROR_TEMPLATES = [
  {
    msg: 'AssertionError: Expected status code 200 but got 500 Internal Server Error',
    trace: 'AssertionError: Expected status code 200 but got 500\n    at APIRequestContext.post (playwright-core/lib/api.js:84)\n    at Context.createExpense (d:\\Expensetracker\\tests\\api\\expense.spec.ts:32)\n    at d:\\Expensetracker\\tests\\api\\expense.spec.ts:15'
  },
  {
    msg: 'TimeoutError: Waiting for locator(".success-toast") to be visible failed after 5000ms',
    trace: 'TimeoutError: Waiting for locator(".success-toast") to be visible failed after 5000ms\n    at Page.waitForSelector (playwright-core/lib/page.js:142)\n    at Object.clickCheckoutBtn (d:\\Expensetracker\\tests\\pom\\PaymentPage.ts:54)\n    at d:\\Expensetracker\\tests\\e2e\\checkout.spec.ts:24'
  },
  {
    msg: 'NullPointerException: Cannot read field "stripeToken" because "paymentIntent" is null',
    trace: 'NullPointerException: Cannot read field "stripeToken" because "paymentIntent" is null\n    at com.expensetracker.payment.StripeService.charge(StripeService.java:124)\n    at com.expensetracker.controllers.PaymentController.chargeCard(PaymentController.java:54)\n    at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)'
  },
  {
    msg: 'ElementClickInterceptedError: Element <button class="btn-primary"> is not clickable at point (521, 320). Other element would receive the click: <div class="modal-overlay">',
    trace: 'ElementClickInterceptedError: Element <button class="btn-primary"> is not clickable\n    at ElementHandle.click (playwright-core/lib/element.js:98)\n    at d:\\Expensetracker\\tests\\e2e\\profile.spec.ts:40'
  }
];

const MOCK_TRIGGERERS = ['Jenkins CI', 'GitHub Actions', 'Aaditya H.', 'Schedule Cron', 'GitLab Runner', 'Manual Webhook'];

// Helper to generate a single execution
const generateMockExecution = (id: string, index: number, buildOffset = 100): Execution => {
  const env = MOCK_ENVIRONMENTS[index % MOCK_ENVIRONMENTS.length];
  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() - (10 - index) * 3); // Spaced 3 days apart
  dateObj.setHours(9 + (index % 4), index * 5, 0, 0);

  const build = `b2.5.0-${buildOffset + index}`;
  const triggeredBy = MOCK_TRIGGERERS[index % MOCK_TRIGGERERS.length];
  
  // Decide test case statuses based on execution health (earlier tests fail more)
  const healthFactor = 0.75 + (index * 0.025); // Pass rate improves from 75% to 95%
  
  const testCases: TestCase[] = MOCK_TEST_TEMPLATES.map((tmpl, tIdx) => {
    const statusRand = Math.random();
    let status: TestStatus = 'Passed';
    let errorTemplate: typeof MOCK_ERROR_TEMPLATES[0] | undefined;
    
    if (statusRand > healthFactor) {
      status = 'Failed';
      errorTemplate = MOCK_ERROR_TEMPLATES[(index + tIdx) % MOCK_ERROR_TEMPLATES.length];
    } else if (statusRand < 0.05) {
      status = 'Skipped';
    }

    const duration = Math.floor(200 + Math.random() * 3000);
    const logs = [
      `[INFO] Starting test execution for "${tmpl.name}"`,
      `[INFO] Navigating to target environment: ${env.name}`,
      `[DEBUG] API endpoint verified: ${env.apiEndpoint}`,
      `[INFO] Executing Action: Input form fields`,
      status === 'Passed'
        ? `[INFO] Assertion verified: element data-testid matched expectations.`
        : status === 'Skipped'
        ? `[WARN] Test skipped due to environment bypass configuration.`
        : `[ERROR] Test assertion failed. Screenshot captured.`,
      `[INFO] Test completed in ${duration}ms`
    ];

    const screenshots = status === 'Failed' 
      ? [generateMockScreenshot(tmpl.name, errorTemplate?.msg)] 
      : [generateMockScreenshot(tmpl.name)];

    return {
      id: `TC-${100 + tIdx}`,
      name: tmpl.name,
      module: tmpl.module,
      description: tmpl.desc,
      status,
      duration,
      errorMessage: errorTemplate?.msg,
      stackTrace: errorTemplate?.trace,
      screenshots,
      logs
    };
  });

  const passedCount = testCases.filter(t => t.status === 'Passed').length;
  const failedCount = testCases.filter(t => t.status === 'Failed').length;
  const skippedCount = testCases.filter(t => t.status === 'Skipped').length;
  
  const totalDuration = Math.round(testCases.reduce((sum, t) => sum + t.duration, 0) / 1000);

  return {
    id,
    name: `Suite Execution - #${id.substring(4)}`,
    date: dateObj.toISOString(),
    environment: env,
    build,
    triggeredBy,
    totalTests: testCases.length,
    passedCount,
    failedCount,
    skippedCount,
    duration: totalDuration,
    status: failedCount > 0 ? 'Failed' : 'Passed',
    testCases
  };
};

// Generate Mock Defects
const generateMockDefects = (executions: Execution[]): Defect[] => {
  const defects: Defect[] = [
    {
      id: 'DEF-101',
      title: 'Stripe webhook payment timeout under load',
      priority: 'Critical',
      severity: 'Blocker',
      status: 'Open',
      linkedTestCases: [],
      linkedExecutions: [],
      owner: 'John Doe (Dev)',
      creationDate: ''
    },
    {
      id: 'DEF-102',
      title: 'Login validation endpoint returns 500 error on wrong passwords',
      priority: 'High',
      severity: 'Major',
      status: 'In Progress',
      linkedTestCases: [],
      linkedExecutions: [],
      owner: 'Aaditya H. (QA)',
      creationDate: ''
    },
    {
      id: 'DEF-103',
      title: 'PDF monthly invoice generator page layout breaking',
      priority: 'Medium',
      severity: 'Minor',
      status: 'Resolved',
      linkedTestCases: [],
      linkedExecutions: [],
      owner: 'Sarah Smith (Frontend)',
      creationDate: '',
      resolutionDate: ''
    }
  ];

  // Link defects to some failing tests from executions
  let linkCount = 0;
  executions.forEach(exec => {
    exec.testCases.forEach(tc => {
      if (tc.status === 'Failed' && linkCount < 3) {
        const defect = defects[linkCount];
        defect.linkedTestCases.push({
          testCaseId: tc.id,
          executionId: exec.id,
          testCaseName: tc.name
        });
        if (!defect.linkedExecutions.includes(exec.id)) {
          defect.linkedExecutions.push(exec.id);
        }
        defect.creationDate = exec.date;
        if (defect.status === 'Resolved') {
          const resDate = new Date(exec.date);
          resDate.setDate(resDate.getDate() + 2);
          defect.resolutionDate = resDate.toISOString();
        }
        linkCount++;
      }
    });
  });

  // Default dates if no executions matched
  defects.forEach(def => {
    if (!def.creationDate) {
      def.creationDate = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
    }
  });

  return defects;
};

// Initialize LocalStorage Data
export const initializeData = (force = false) => {
  const storedExecutions = localStorage.getItem('qa_dashboard_executions');
  const storedDefects = localStorage.getItem('qa_dashboard_defects');

  if (force || !storedExecutions || !storedDefects) {
    const executions: Execution[] = [];
    for (let i = 0; i < 12; i++) {
      executions.push(generateMockExecution(`EXEC-${1000 + i}`, i));
    }
    const defects = generateMockDefects(executions);
    
    localStorage.setItem('qa_dashboard_executions', JSON.stringify(executions));
    localStorage.setItem('qa_dashboard_defects', JSON.stringify(defects));
    return { executions, defects };
  }

  return {
    executions: JSON.parse(storedExecutions) as Execution[],
    defects: JSON.parse(storedDefects) as Defect[]
  };
};

export const getExecutions = (): Execution[] => {
  const { executions } = initializeData();
  return executions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getExecutionById = (id: string): Execution | undefined => {
  return getExecutions().find(exec => exec.id === id);
};

export const getDefects = (): Defect[] => {
  const { defects } = initializeData();
  return defects;
};

export const saveDefect = (defect: Defect): Defect[] => {
  const defects = getDefects();
  const existingIndex = defects.findIndex(d => d.id === defect.id);
  
  if (existingIndex > -1) {
    defects[existingIndex] = defect;
  } else {
    defects.push(defect);
  }
  
  localStorage.setItem('qa_dashboard_defects', JSON.stringify(defects));
  return defects;
};

export const deleteDefect = (id: string): Defect[] => {
  const defects = getDefects().filter(d => d.id !== id);
  localStorage.setItem('qa_dashboard_defects', JSON.stringify(defects));
  return defects;
};

export const updateExecution = (execution: Execution): Execution[] => {
  const executions = getExecutions().filter(e => e.id !== execution.id);
  executions.push(execution);
  localStorage.setItem('qa_dashboard_executions', JSON.stringify(executions));
  return executions;
};

// Simulation: Rerunning a Test Execution Live
export const simulateRerun = (
  executionId: string, 
  onProgress: (updatedExecution: Execution) => void,
  onComplete: () => void
) => {
  const executions = getExecutions();
  const execIndex = executions.findIndex(e => e.id === executionId);
  if (execIndex === -1) return;

  const originalExec = executions[execIndex];
  
  // Clone execution into running state
  const runningExec: Execution = {
    ...originalExec,
    status: 'Running',
    passedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    duration: 0,
    date: new Date().toISOString(),
    testCases: originalExec.testCases.map(tc => ({
      ...tc,
      status: 'Running',
      duration: 0,
      logs: [`[INFO] Rerun simulation triggered at ${new Date().toLocaleTimeString()}`, `[INFO] Initializing test workspace...`]
    }))
  };

  onProgress({ ...runningExec });
  
  let currentTestCaseIdx = 0;
  const timer = setInterval(() => {
    if (currentTestCaseIdx >= runningExec.testCases.length) {
      clearInterval(timer);
      
      // Complete execution
      runningExec.status = runningExec.failedCount > 0 ? 'Failed' : 'Passed';
      
      // Save back to db
      const currentExecs = getExecutions().filter(e => e.id !== executionId);
      currentExecs.push(runningExec);
      localStorage.setItem('qa_dashboard_executions', JSON.stringify(currentExecs));
      
      onProgress({ ...runningExec });
      onComplete();
      return;
    }

    const testCase = runningExec.testCases[currentTestCaseIdx];
    const originalTestCase = originalExec.testCases[currentTestCaseIdx];
    
    // Simulate runtime duration
    const simulatedDuration = Math.floor(100 + Math.random() * 1000);
    
    // Replay result (or slightly modify to simulate stability/instability)
    let finalStatus: TestStatus = originalTestCase.status;
    if (originalTestCase.status === 'Failed' && Math.random() > 0.6) {
      // 40% flakey failure recovers to passed on rerun
      finalStatus = 'Passed';
    }
    
    testCase.status = finalStatus;
    testCase.duration = simulatedDuration;
    testCase.logs.push(`[DEBUG] Executing Playwright browser engine...`);
    testCase.logs.push(`[INFO] Checked element visibility: Pass.`);
    
    if (finalStatus === 'Passed') {
      testCase.logs.push(`[INFO] Assertion verified: OK.`);
      testCase.errorMessage = undefined;
      testCase.stackTrace = undefined;
      testCase.screenshots = [generateMockScreenshot(testCase.name)];
      runningExec.passedCount++;
    } else if (finalStatus === 'Skipped') {
      testCase.logs.push(`[WARN] Config rules bypassed this test.`);
      runningExec.skippedCount++;
    } else {
      testCase.logs.push(`[ERROR] Assertion failed. Captured element state error.`);
      testCase.errorMessage = originalTestCase.errorMessage || 'AssertionError: element was missing';
      testCase.stackTrace = originalTestCase.stackTrace;
      testCase.screenshots = [generateMockScreenshot(testCase.name, testCase.errorMessage)];
      runningExec.failedCount++;
    }
    
    testCase.logs.push(`[INFO] Completed test in ${simulatedDuration}ms`);
    
    runningExec.duration += Math.round(simulatedDuration / 1000);
    currentTestCaseIdx++;
    
    onProgress({ ...runningExec });
  }, 600); // Progresses one test case every 600ms
};

// Simulation: Triggering a NEW Execution
export const triggerNewExecution = (
  environmentName: string,
  buildVersion: string,
  triggeredBy: string,
  onProgress: (execution: Execution) => void,
  onComplete: () => void
) => {
  const executions = getExecutions();
  const nextId = `EXEC-${1000 + executions.length}`;
  
  // Find environment details
  const envDetails = MOCK_ENVIRONMENTS.find(e => e.name === environmentName) || MOCK_ENVIRONMENTS[0];
  
  // Generate template
  const newExec: Execution = {
    id: nextId,
    name: `Suite Execution - #${nextId.substring(5)}`,
    date: new Date().toISOString(),
    environment: envDetails,
    build: buildVersion || 'v2.5.0-dev',
    triggeredBy: triggeredBy || 'CI Automated Trigger',
    totalTests: MOCK_TEST_TEMPLATES.length,
    passedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    duration: 0,
    status: 'Running',
    testCases: MOCK_TEST_TEMPLATES.map((tmpl, idx) => ({
      id: `TC-${100 + idx}`,
      name: tmpl.name,
      module: tmpl.module,
      description: tmpl.desc,
      status: 'Running',
      duration: 0,
      screenshots: [],
      logs: [`[INFO] Spawned test environment on ${envDetails.os}`, `[INFO] Initializing browser: ${envDetails.browser}`]
    }))
  };

  onProgress({ ...newExec });
  
  let currentTestCaseIdx = 0;
  const timer = setInterval(() => {
    if (currentTestCaseIdx >= newExec.testCases.length) {
      clearInterval(timer);
      
      newExec.status = newExec.failedCount > 0 ? 'Failed' : 'Passed';
      
      // Save to database
      const currentExecs = getExecutions();
      currentExecs.push(newExec);
      localStorage.setItem('qa_dashboard_executions', JSON.stringify(currentExecs));
      
      onProgress({ ...newExec });
      onComplete();
      return;
    }

    const testCase = newExec.testCases[currentTestCaseIdx];
    const duration = Math.floor(150 + Math.random() * 1500);
    
    // Choose status
    let status: TestStatus = 'Passed';
    let errorTemplate: typeof MOCK_ERROR_TEMPLATES[0] | undefined;
    
    const rand = Math.random();
    if (rand > 0.88) { // 12% fail rate
      status = 'Failed';
      errorTemplate = MOCK_ERROR_TEMPLATES[currentTestCaseIdx % MOCK_ERROR_TEMPLATES.length];
    } else if (rand < 0.04) {
      status = 'Skipped';
    }

    testCase.status = status;
    testCase.duration = duration;
    testCase.logs.push(`[INFO] Loading test hooks...`);
    
    if (status === 'Passed') {
      testCase.logs.push(`[INFO] Checked UI components correctly.`);
      testCase.screenshots = [generateMockScreenshot(testCase.name)];
      newExec.passedCount++;
    } else if (status === 'Skipped') {
      testCase.logs.push(`[WARN] Skipping test: configured bypass annotation found.`);
      newExec.skippedCount++;
    } else {
      testCase.logs.push(`[ERROR] Assertion failed. Screenshot and trace captured.`);
      testCase.errorMessage = errorTemplate?.msg;
      testCase.stackTrace = errorTemplate?.trace;
      testCase.screenshots = [generateMockScreenshot(testCase.name, errorTemplate?.msg)];
      newExec.failedCount++;
    }

    testCase.logs.push(`[INFO] Completed test in ${duration}ms`);
    newExec.duration += Math.round(duration / 1000);
    currentTestCaseIdx++;

    onProgress({ ...newExec });
  }, 450);
};

// Trend Data Aggregation Helpers
export const getTrends = () => {
  const executions = [...getExecutions()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Last 10 executions for history line charts
  const historyTrend = executions.slice(-10).map(exec => {
    const passRate = exec.totalTests > 0 
      ? Math.round((exec.passedCount / exec.totalTests) * 100) 
      : 0;
    return {
      id: exec.id,
      build: exec.build,
      passRate,
      passed: exec.passedCount,
      failed: exec.failedCount,
      skipped: exec.skippedCount,
      duration: exec.duration,
      date: new Date(exec.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };
  });

  // Environment health distributions
  const envStats: Record<string, { total: number; passed: number; failed: number }> = {};
  executions.forEach(exec => {
    const env = exec.environment.name;
    if (!envStats[env]) {
      envStats[env] = { total: 0, passed: 0, failed: 0 };
    }
    envStats[env].total += exec.totalTests;
    envStats[env].passed += exec.passedCount;
    envStats[env].failed += exec.failedCount;
  });

  const environmentWiseHealth = Object.entries(envStats).map(([env, stats]) => ({
    name: env,
    passRate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0,
    totalTests: stats.total
  }));

  // Module health check distributions
  const moduleStats: Record<string, { total: number; passed: number; failed: number }> = {};
  executions.forEach(exec => {
    exec.testCases.forEach(tc => {
      if (!moduleStats[tc.module]) {
        moduleStats[tc.module] = { total: 0, passed: 0, failed: 0 };
      }
      moduleStats[tc.module].total++;
      if (tc.status === 'Passed') moduleStats[tc.module].passed++;
      if (tc.status === 'Failed') moduleStats[tc.module].failed++;
    });
  });

  const moduleWiseHealth = Object.entries(moduleStats).map(([mod, stats]) => ({
    name: mod,
    passRate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0,
    totalTests: stats.total,
    failedTests: stats.failed
  }));

  return {
    historyTrend,
    environmentWiseHealth,
    moduleWiseHealth
  };
};
