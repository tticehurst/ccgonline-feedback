const puppeteer = require("puppeteer");

require("dotenv").config();

const {
  CCG_USERNAME,
  CCG_PASSWORD
} = process.env;

const args = process.argv.slice(2);

async function login(page) {
  let loginForm = (await page.$x("//form[@id='login']"))[0];
  let loginConfirm = (await loginForm.$x("//input[@value='Log in' and @type='submit']"))[0];

  let usernameInput = (await loginForm.$x("//input[@id='login_username' and @name='username']"))[0];
  let passwordInput = (await loginForm.$x("//input[@id='login_password' and @type='password' and @name='password']"))[0];

  await usernameInput.type(CCG_USERNAME);
  await passwordInput.type(CCG_PASSWORD);
  await loginConfirm.click();
}

async function findFeedback(obj) {
  let returnValue = 0;

  for (let assignment in obj) {
    let currentAssignment = obj[assignment];
    let textContent = await (await currentAssignment.getProperty("textContent")).jsonValue();

    if (textContent.toLowerCase().includes("feedback")) {
      returnValue++;
    }
  }

  return returnValue;
}

async function run(courseId) {
  console.log("Running");

  let browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  let page = await browser.newPage();
  await page.goto("https://ccgonline.chichester.ac.uk/");

  await login(page);

  await page.waitForXPath("//a[@id='usermenu']");
  await page.goto(`https://ccgonline.chichester.ac.uk/course/view.php?id=${courseId}`);

  let openAllCoursesXPath = "//span[@id='toggles-all-opened' and @title='Open all topics']";
  await page.waitForXPath(openAllCoursesXPath, { timeout: 5000 });

  (await page.$x(openAllCoursesXPath))[0].click();

  let courseContent = (await page.$x("//section[@id='region-main']"))[0];

  let notTurnItInFound = (await courseContent.$x("//span[@class='activity-mod-feedback']//a[contains(@href,'https://ccgonline.chichester.ac.uk/mod/assign/view.php')]"));
  let turnItInFound = await courseContent.$x("//a[contains(@href,'https://ccgonline.chichester.ac.uk/mod/assign/view.php')]//span[@class='instancename']");

  let allNotTurnItInFound = await findFeedback(notTurnItInFound);
  let allTurnItInFound = await findFeedback(turnItInFound);

  console.log(`${allNotTurnItInFound} pieces of non turn-it-in feedback found`);
  console.log(`${allTurnItInFound} pieces of turn-it-in feedback found`);

  await browser.close();
}

if (args.includes("-h") || args.includes("--help")) {
  console.log(`
    --help (-h): Brings up this help menu
    --course (-c): Selects a course id 
  `);

  return;
} else if (args.includes("-c") || args.includes("--course")) {
  let providedCourseId = args[1];
  console.log(`Setting course id to: ${providedCourseId}`);

  run(providedCourseId);

  return;
} else if (args.length === 0) {
  console.log("Please provide a valid course id");
} else {
  console.log("Please provide a valid command line argument");
}
