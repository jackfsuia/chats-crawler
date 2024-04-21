import { Configuration, PlaywrightCrawler, downloadListOfUrls } from "crawlee";
import { writeFile } from "fs/promises";
import { Config, configSchema } from "./config.js";
import { Page } from "playwright";
import * as cheerio from 'cheerio';
import path from 'path';

let pageCounter = 0;
let crawler: PlaywrightCrawler;

export function getPageHtml(page: Page, selector = "body") {
  return page.evaluate((selector) => {
    if (selector.startsWith("/")) {
      const elements = document.evaluate(
        selector,
        document,
        null,
        XPathResult.ANY_TYPE,
        null,
      );
      let result = elements.iterateNext();
      return result ? result.textContent || "" : "";
    } else {
      const el = document.querySelector(selector) as HTMLElement | null;
      return el?.innerHTML || "";//el?.innerText || "";
    }
  }, selector);
}

export async function waitForXPath(page: Page, xpath: string, timeout: number) {
  await page.waitForFunction(
    (xpath) => {
      const elements = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ANY_TYPE,
        null,
      );
      return elements.iterateNext() !== null;
    },
    xpath,
    { timeout },
  );
}

function sanitizeFilename(filename: string) {
  const illegalChars = /[\\/:*?"<>|]/g;
  return filename.replace(illegalChars, '_');
  // bugs to be fixed: might cause duplicate names
}

async function fetchWithRetry(url: string, retries = 3) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
    } catch (error) {
      console.log(`Fetch attempt ${attempt + 1} failed, retrying...`);
    }
    attempt++;
  }
  throw new Error('Fetch request failed after several retries');
}

export async function downloadImage(imageUrl: string, filename: string) {
  try {
    const response = await fetchWithRetry(imageUrl);
    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    writeFile(filename, buffer);
  } catch (error) {
    console.error('Fetch request failed:', error);
  }
}

export async function crawl(config: Config) {
  configSchema.parse(config);

  if (process.env.NO_CRAWL !== "true") {
    crawler = new PlaywrightCrawler(
      {
        // proxyConfiguration,
        async requestHandler({ request, page, enqueueLinks, log, pushData }) {
          const title = await page.title();
          pageCounter++;
          log.info(
            `Crawling: Page ${pageCounter} / ${config.maxPagesToCrawl} - URL: ${request.loadedUrl}...`,
          );

          // Use custom handling for XPath selector
          if (config.selector) {
            if (config.selector.startsWith("/")) {
              await waitForXPath(
                page,
                config.selector,
                config.waitForSelectorTimeout ?? 1000,
              );
            } else {
              await page.waitForSelector(config.selector, {
                timeout: config.waitForSelectorTimeout ?? 10000,
              });
            }
          }

          const html = await getPageHtml(page, "body");
          const $ = cheerio.load(html);
          const posts = $('div.topic-body.clearfix');
          let conversations: string = '';
          for (const post of posts) {
            const user_name = $('div.names.trigger-user-card > span > a', post).text();
            conversations = conversations + `\n<# ${user_name} #>:\n`;
            let $ct = $('div.regular.contents', post);

            // delete Reply, quote control
            $('.title', $ct).remove();
            $('span.d-button-label', $ct).remove();

            // image textualizing
            $('img', $ct).each((_i: any, el: any) => {
              let $img = $(el);
              const imageUrl = $img.attr('src');
              if (imageUrl) {
                const filename = sanitizeFilename(imageUrl.split('/')?.pop() || "fake_name");
                const fullname = path.join('storage/datasets/imgs', filename);
                downloadImage(imageUrl, fullname);
                log.info(
                  `Crawling: Image ${imageUrl} \nImagename: ${fullname}`,
                );
                $img.replaceWith(`[img ${filename}]`);
              }
              else {
                $img.replaceWith('');
              }
            });

            // link textualizing
            $('a', $ct).each((_i: any, el: any) => {
              let $link = $(el);
              const Url = $link.attr('href');
              $link.replaceWith(`[link ${Url}]`);
            });

            // wrap blockquote with ""
            $('blockquote', $ct).prepend('Quote:"').append('"');

            // now extract texts all at once
            conversations += $ct.text();

          }

          await pushData({ title, url: request.loadedUrl, conversations });

          if (config.onVisitPage) {
            await config.onVisitPage({ page, pushData });
          }

          await enqueueLinks({
            regexps:
              typeof config.rex === "string"
                ? [RegExp(config.rex)]
                : (config.rex !== undefined ? config.rex.map((rex) => RegExp(rex)) : []),

            globs:
              typeof config.match === "string" ? [config.match] : config.match,
            exclude:
              typeof config.exclude === "string"
                ? [config.exclude]
                : config.exclude ?? [],
          });
        },
        maxRequestsPerCrawl: config.maxPagesToCrawl,
        maxRequestsPerMinute: config.maxRequestsPerMinute || Infinity,
        preNavigationHooks: [
          async ({ request, page}) => {
            const RESOURCE_EXCLUSTIONS = config.resourceExclusions ?? [];
            if (RESOURCE_EXCLUSTIONS.length === 0) {
              return;
            }
            if (config.cookie) {
              const cookies = (
                Array.isArray(config.cookie) ? config.cookie : [config.cookie]
              ).map((cookie) => {
                return {
                  name: cookie.name,
                  value: cookie.value,
                  url: request.loadedUrl,
                };
              });
              await page.context().addCookies(cookies);
            }
            await page.route(
              `**\/*.{${RESOURCE_EXCLUSTIONS.join()}}`,
              (route) => route.abort("aborted"),
            );
          },
        ],
      },
      new Configuration({
        purgeOnStart: true,
      }),
    );

    const isUrlASitemap = /sitemap.*\.xml$/.test(config.url);

    if (isUrlASitemap) {
      const listOfUrls = await downloadListOfUrls({ url: config.url });
      await crawler.addRequests(listOfUrls);
      await crawler.run();
    } else {
      await crawler.run([config.url]);
    }
  }
}