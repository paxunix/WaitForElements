const fs = require("fs");
const path = require("path");
const jasmineBrowser = require("jasmine-browser-runner");

const config = require(path.join(process.cwd(), "jasmine-browser-coverage.json"));
const BaseRunner = jasmineBrowser.Runner;

class CoverageRunner extends BaseRunner {
  async run(runOptions) {
    const details = await super.run(runOptions);

    try {
      const coverage = await this._options.webdriver.executeScript(
        "return window.__coverage__ || null;"
      );
      if (coverage) {
        const outDir = path.join(process.cwd(), ".nyc_output");
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(
          path.join(outDir, "coverage.json"),
          JSON.stringify(coverage)
        );
      } else {
        console.warn("No browser coverage found (window.__coverage__ is empty)");
      }
    } catch (err) {
      console.warn("Failed to collect browser coverage:", err);
    }

    return details;
  }
}

jasmineBrowser
  .runSpecs(config, { Runner: CoverageRunner })
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
