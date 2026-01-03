# INSTALL

To use it, include the WaitForElements.js in a <script> tag.

# DEVELOPMENT

Install Node via nvm, then install the latest Jasmine runner dependencies:

```
nvm install --lts
nvm use --lts
npm install
```

Run the headless Jasmine suite from the command line:

```
npm test
```

Run the Jasmine suite in a visible browser window:

```
npm run test:browser
```

You can also open `test/SpecRunner.html` directly in a browser once
dependencies are installed.


# Releasing

git tag --annotate <semantic-version>

git push --follow-tags

gh release create <semantic-version> --notes <Release notes>
