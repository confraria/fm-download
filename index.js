const args = require('args');
const FrontendMasters = require('./lib/client');

args
  .option('user', 'Username')
  .option('pass', 'Password')
  .option('course', 'Slug for the course download (ex.: javascript-hard-parts for https://frontendmasters.com/courses/javascript-hard-parts/')
  .option('skip', 'Number of videos to skip (ex.: 5, would start download on video number 6', 0)
  .option('format', 'webm or mp4', 'webm')
  .option('resolution', '720 or 1080', 1080);

const userOptions = args.parse(process.argv);
async function run(options) {
  const {
    format,
    resolution,
    user,
    pass,
    course,
    skip,
  } = options;
  const client = new FrontendMasters(format, resolution);
  const authed = await client.authenticate(user, pass);
  if (authed) {
    console.log(`${user} Logged in.`);
    const data = await client.downloadCourseInfo(course);
    console.log(`"${data.title}" course info downloaded`);
    client.skipLessons(skip);
    console.log(`"Downloading ${client.downloadQueue.length} videos`);
    await client.downloadCourse();
  } else {
    console.log('Authentication failed');
  }
}

run(userOptions);

