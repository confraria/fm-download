const util = require('util');
const fs = require('fs');
const request = require('request');

function extractNonce(html) {
  return html.match(/name="nonce" value="(\w+)"/)[1];
}

class Client {
  constructor(format = 'webm', resolution = 720) {
    this.request = util.promisify(request);
    this.baseUrl = 'https://frontendmasters.com';
    this.baseUrlApi = 'https://api.frontendmasters.com';
    this.format = format;
    this.resolution = resolution;
  }

  async authenticate(username, password) {
    const form = {
      username,
      password,
      remember: 'on',
    };
    const config = this.requestConfig({
      form,
      url: 'login/',
      method: 'POST',
    });
    form.nonce = await this.getNonce();
    const { statusCode } = await this.request(config);
    return statusCode === 302;
  }

  async getNonce() {
    const config = this.requestConfig({
      url: 'login/',
    });
    const { body } = await this.request(config);
    return extractNonce(body);
  }

  requestConfig(config) {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
    };
    return {
      headers,
      baseUrl: this.baseUrl,
      jar: true,
      ...config,
    };
  }

  async downloadCourseInfo(course) {
    const config = this.requestConfig({
      baseUrl: this.baseUrlApi,
      url: `v1/kabuki/courses/${course}`,
      json: true,
    });
    const res = await this.request(config);
    this.courseData = res.body;
    this.downloadQueue = this.courseData.lessonData.concat([]);
    return this.courseData;
  }

  skipLessons(qty) {
    this.downloadQueue = this.downloadQueue.slice(qty);
  }

  async downloadCourse() {
    const { downloadQueue } = this;
    const lesson = downloadQueue.shift();
    const remaining = await this.downloadLesson(lesson);
    if (remaining) return this.downloadCourse();
  }

  async downloadLesson(lesson) {
    let url;
    let format;
    while (!url) {
      const res = await this.getVideoUrl(lesson.sourceBase);
      url = res.url;
      format = res.format;
    }
    const ix = lesson.index + 1;
    const filename = `${ix < 10 ? 0 : ''}${ix}.${lesson.title}.${format}`;
    const read = request({
      url,
      jar: true,
    });
    const writeStream = read.pipe(fs.createWriteStream(filename));
    let total = 0;
    read.on('data', ({ length }) => {
      process.stdout.write(`${filename}: ${total += length} bytes downloaded \r`);
    });
    return new Promise((resolve) => {
      writeStream.on('finish', () => process.stdout.write('\n'));
      writeStream.on('finish', () => resolve(this.downloadQueue.length));
    });
  }

  async getVideoUrl(sourceBase, _resolution, _format) {
    const resolution = _resolution || this.resolution;
    const format = _format || this.format;
    const config = {
      baseUrl: sourceBase,
      url: '/source',
      qs: { r: resolution, f: format },
      json: true,
      jar: true,
    };
    const res = await this.request(config);
    const { body } = res;
    return {
      resolution,
      format,
      ...body,
    };
  }
}

module.exports = Client;
