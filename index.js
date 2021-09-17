const puppeteer = require("puppeteer");
const args = process.argv.slice(2);
var chromeDir;

require("dotenv").config();

const {
  CCG_USERNAME,
  CCG_PASSWORD
} = process.env;

if (!CCG_USERNAME || !CCG_PASSWORD) {
  return console.log("Please include both a username and password");
}


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

async function findTurnItInFeedback(obj, browser) {
  let returnValue = 0;

  for (let assignment in obj) {
    let currentAssignment = obj[assignment];

    let textContent = await (await currentAssignment.getProperty("textContent")).jsonValue();

    if (textContent.toLowerCase().includes("feedback")) {
      let page = await browser.newPage();

      let parentElement = (await currentAssignment.$x(".."))[0];
      let href = await (await parentElement.getProperty("href")).jsonValue();

      await page.goto(href);

      let feedback = (await page.$x("//div[@class='feedback']"))[0];
      if (feedback) {
        returnValue++;
      }

    }
  }

  return returnValue;
}

async function run(courseId) {
  console.log("Running");

  let browser = await puppeteer.launch({ headless: true, defaultViewport: null, executablePath: `${chromeDir}/chrome.exe` });
  let page = await browser.newPage();

  await page.goto("https://ccgonline.chichester.ac.uk/");

  await login(page);

  await page.waitForXPath("//a[@id='usermenu']");
  await page.goto(`https://ccgonline.chichester.ac.uk/course/view.php?id=${courseId}`);

  let courseContent = (await page.$x("//section[@id='region-main']"))[0];

  let notTurnItInFound = await courseContent.$x("//span[@class='activity-mod-feedback']//a[contains(@href,'https://ccgonline.chichester.ac.uk/mod/assign/view.php')]");
  let turnItInFound = await courseContent.$x("//a[contains(@href,'https://ccgonline.chichester.ac.uk/mod/assign/view.php')]//span[@class='instancename']");

  let allNotTurnItInFound = await findFeedback(notTurnItInFound);
  let allTurnItInFound = await findTurnItInFeedback(turnItInFound, browser);

  console.log(`${allNotTurnItInFound} pieces of non turn-it-in feedback found`);
  console.log(`${allTurnItInFound} pieces of turn-it-in feedback found`);


  setTimeout(async () => {
    await browser.close();
  }, 3000);
}

if (args.includes("-h") || args.includes("--help")) {
  console.log(`
    --help (-h): Brings up this help menu
    --course (-c): Selects a course id 
    --chrome: Selects location of chrome.exe
  `);

  return;
}

if (args.includes("--chrome")) {
  let argPos = args.indexOf("--chrome");
  chromeDir = args[argPos + 1];
}
if (!args.includes("--chrome")) {
  return console.log("Please provide a valid chrome location using '--chrome'");
}

if (args.includes("-c") || args.includes("--course")) {
  let argPos = args.indexOf("-c") < 0 ? args.indexOf("--course") : args.indexOf("-c");
  let providedCourseId = args[argPos + 1];

  if (args[1]) {
    console.log(`Setting course id to: ${providedCourseId}`);

    run(providedCourseId);

    return;
  }
}

if (args.length === 0) {
  console.log("Please provide a valid course id");
} else {
  console.log("Please provide a valid command line argument");
}

